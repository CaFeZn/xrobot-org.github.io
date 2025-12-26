---
id: xrusb-dev-stack-hid
title: HID
sidebar_position: 2
---

# HID 设备协议栈

本节介绍 XRUSB 的 **USB HID（Human Interface Device）** 设备类实现与扩展方式，重点覆盖：

- HID 设备类的模板化基类（`LibXR::USB::HID`）与自动描述符生成
- 可选 **OUT 中断端点**（Output Report over Interrupt OUT）
- 标准请求 `GET_DESCRIPTOR`（HID / Report 描述符）的处理路径
- HID 类请求（`GET_REPORT/SET_REPORT/GET_IDLE/SET_IDLE/GET_PROTOCOL/SET_PROTOCOL`）与数据阶段回调
- 输入报告发送（Input Report over Interrupt IN）与传输完成回调
- 典型派生类：鼠标（`HIDMouse`）、键盘（`HIDKeyboard`）、手柄（`HIDGamepadT`）

---

## 组件概览

### `LibXR::USB::HID<REPORT_DESC_LEN, TX_REPORT_LEN, RX_REPORT_LEN>`

`HID` 是一个模板化 HID 基类（继承自 `DeviceClass`），通过模板参数在编译期固化报告与描述符尺寸，便于实现键盘、鼠标、手柄等设备：

- `REPORT_DESC_LEN`：Report Descriptor 长度（字节）
- `TX_REPORT_LEN`：Input Report 最大长度（Interrupt IN 端点 `wMaxPacketSize`）
- `RX_REPORT_LEN`：Output Report 长度（Interrupt OUT 端点 `wMaxPacketSize`，默认 0 表示不使用）

它实现并封装了：

- 端点资源申请与配置（Interrupt IN；可选 Interrupt OUT）
- **Interface + HID Descriptor(0x21) + Endpoint Descriptor** 的配置描述符块自动生成
- 标准请求 `GET_DESCRIPTOR`：返回 HID 描述符（0x21）或 Report 描述符（0x22）
- HID 类请求与数据阶段处理框架（可在派生类中覆盖）
- 输入报告发送辅助函数 `SendInputReport()`（拷贝到端点缓冲区并启动传输）
- IN/OUT 传输完成回调钩子（`OnDataInComplete` / `OnDataOutComplete`）

---

## 描述符与端点布局

### Interface（接口）

`HID` 作为单接口设备类：

- `GetInterfaceNum()` 固定返回 `1`
- `HasIAD()` 固定返回 `false`
- `bInterfaceClass = 0x03`（HID）
- `bNumEndpoints = 1`（仅 IN）或 `2`（IN + OUT）

### HID Descriptor（0x21）

基类在配置描述符中生成 HID 类描述符（9 字节），关键字段如下：

- `bcdHID = 0x0111`（HID v1.11）
- `bNumDescriptors = 1`
- `bReportDescriptorType = 0x22`
- `wReportDescriptorLength = REPORT_DESC_LEN`

### Endpoints（端点）

基类在 `Init()` 中从 `EndpointPool` 申请并配置端点：

| 端点             | 方向 | 类型      | `wMaxPacketSize` | 用途                      |
| ---------------- | ---- | --------- | ---------------: | ------------------------- |
| IN 端点          | IN   | INTERRUPT |  `TX_REPORT_LEN` | 设备 → 主机 Input Report  |
| OUT 端点（可选） | OUT  | INTERRUPT |  `RX_REPORT_LEN` | 主机 → 设备 Output Report |

端点轮询间隔：

- `in_ep_interval_`：写入 IN 端点描述符的 `bInterval`
- `out_ep_interval_`：写入 OUT 端点描述符的 `bInterval`

> 注意：不同速度下 `bInterval` 的语义不同（FS 通常按帧 1ms，HS 以 microframe 编码）。本实现以“毫秒”语义组织参数，最终解释取决于底层 USB 控制器/栈对 `bInterval` 的处理方式。

---

## 初始化与资源释放

### Init 行为（`HID::Init(endpoint_pool, start_itf_num)`）

初始化的关键步骤：

1. 记录接口号 `itf_num_ = start_itf_num`，清理端点指针与 `inited_` 标志  
2. 从 `EndpointPool` 获取 Interrupt IN 端点，并 `Configure({IN, INTERRUPT, TX_REPORT_LEN})`  
3. 若启用 OUT：获取 Interrupt OUT 端点，并 `Configure({OUT, INTERRUPT, RX_REPORT_LEN})`  
4. 填充配置描述符块：
   - Interface Descriptor
   - HID Descriptor (0x21)
   - Endpoint IN Descriptor
   -（可选）Endpoint OUT Descriptor
5. 通过 `SetData(RawData{...})` 将描述符块交给设备框架拼入 Configuration Descriptor  
6. 注册端点完成回调：
   - `ep_in_->SetOnTransferCompleteCallback(on_data_in_complete_cb_)`
   -（可选）`ep_out_->SetOnTransferCompleteCallback(on_data_out_complete_cb_)`
7. 若启用 OUT：启动首次 OUT 接收 `ep_out_->Transfer(RX_REPORT_LEN)`（随后每次完成会自动 re-arm）  
8. 设置 `inited_ = true`

### Deinit 行为（`HID::Deinit(endpoint_pool)`）

- `inited_ = false`
- 关闭并归还 IN/OUT 端点给 `EndpointPool`
- 端点指针置空

---

## 标准请求：GET_DESCRIPTOR（HID / Report）

`HID` 覆盖 `OnGetDescriptor()`，用于处理标准请求 `GET_DESCRIPTOR`：

- 当 `wValue >> 8` 为 `0x21`：返回 HID Descriptor（`GetHIDDesc()`）
- 当 `wValue >> 8` 为 `0x22`：返回 Report Descriptor（`GetReportDesc()`）
- 其他类型（如 Physical 0x23）：返回 `ErrorCode::NOT_SUPPORT`

返回数据会按 `wLength` 截断，避免超出主机请求长度。

派生类必须实现：

```cpp
virtual ConstRawData GetReportDesc() = 0;
```

用于提供 Report Descriptor 的数据指针与长度。

---

## HID 类请求与数据阶段

基类在 `OnClassRequest()` 中处理 HID 常见类请求（Class-Specific Requests）：

- `GET_REPORT`：按 `wValue` 高字节区分 `INPUT/OUTPUT/FEATURE`，分别调用：
  - `OnGetInputReport(report_id, result)`
  - `OnGetLastOutputReport(report_id, result)`
  - `OnGetFeatureReport(report_id, result)`
- `SET_REPORT`：仅校验 `wLength != 0`，并交由：
  - `OnSetReport(report_id, result)`（此处通常设置 `result.read_data` 让控制传输数据阶段写入）
  - 数据阶段由 `OnClassData()` 接收，最终回调 `OnSetReportData(in_isr, data)`
- `GET_IDLE / SET_IDLE`：维护一个 `idle_rate_`（单位 4ms），当前实现仅支持 `report_id=0`
- `GET_PROTOCOL / SET_PROTOCOL`：维护 `protocol_`（BOOT / REPORT）

你可以覆盖以下虚函数来实现具体逻辑：

- 报告获取：
  - `OnGetInputReport()` / `OnGetLastOutputReport()` / `OnGetFeatureReport()`
- 报告设置：
  - `OnSetReport()`：在控制传输 Setup 阶段准备接收缓冲等
  - `OnSetReportData()`：在控制传输 Data 阶段处理主机发来的数据
- 自定义扩展：
  - `OnCustomClassRequest()` / `OnCustomClassData()`

---

## 数据通路：IN/OUT 端点与完成回调

### 发送 Input Report：`SendInputReport()`

`SendInputReport(ConstRawData report)` 用于向主机发送 Interrupt IN 报告，流程如下：

1. 校验已初始化、端点存在
2. 校验 `report.addr_` 非空、长度 `0 < size_ <= TX_REPORT_LEN`
3. 校验 IN 端点处于 `IDLE`，否则返回 `ErrorCode::BUSY`
4. 将 `report` 拷贝到 IN 端点缓冲区（`ep_in_->GetBuffer()`）
5. 调用 `ep_in_->Transfer(report.size_)` 启动传输

常见返回码语义（依栈定义为准）：

- `OK`：成功启动传输
- `BUSY`：端点仍在传输
- `ARG_ERR`：报告长度非法
- `NO_BUFF`：端点缓冲区不足
- `FAILED`：未初始化或端点无效

### OUT Report 接收（可选）：自动 re-arm

若启用 OUT 端点，基类默认行为是：

- 首次 `Init()` 后调用一次 `ep_out_->Transfer(RX_REPORT_LEN)`
- 每次 OUT 接收完成触发 `OnDataOutCompleteStatic()`：
  1. 调用虚函数 `OnDataOutComplete(in_isr, data)` 让派生类消费数据
  2. 立即 `ep_out_->Transfer(RX_REPORT_LEN)` 重新挂载接收（持续接收）

派生类可覆盖：

```cpp
virtual void OnDataOutComplete(bool in_isr, LibXR::ConstRawData& data);
```

用于处理 Output Report（例如键盘 LED 状态）。

### IN 发送完成回调

IN 端点传输完成后会触发：

```cpp
virtual void OnDataInComplete(bool in_isr, LibXR::ConstRawData& data);
```

典型用途：

- 发送队列出队、继续发送下一帧
- 统计吞吐、链路监测等

---

## 示例派生类

### `HIDMouse`：标准 Boot 鼠标

- Report Descriptor：标准 Boot Mouse
- Input Report 长度：4 字节（Buttons + X + Y + Wheel）
- 仅启用 IN 端点，默认 `bInterval=1ms`

核心接口：

```cpp
void Move(uint8_t buttons, int8_t x, int8_t y, int8_t wheel = 0);
void Release();
```

`Move()` 内部组包并调用 `SendInputReport()`。

### `HIDKeyboard`：标准 Boot 键盘（含 LED）

- Report Descriptor：标准 Boot Keyboard
- Input Report 长度：8 字节（Modifier + Reserved + 6 KeyCodes）
- 可选启用 OUT 端点（`RX_REPORT_LEN=1`）用于接收 LED 状态
- 同时实现 `SET_REPORT` 控制传输路径（兼容主机通过控制端点下发 LED）

核心接口：

- 发送按键：

```cpp
void PressKey(std::initializer_list<KeyCode> keys, uint8_t mods = Modifier::NONE);
void ReleaseAll();
```

- LED 状态读取（按位）：

```cpp
bool GetNumLock();
bool GetCapsLock();
bool GetScrollLock();
```

- LED 变化回调：

```cpp
void SetOnLedChangeCallback(LibXR::Callback<bool, bool, bool> cb);
```

回调参数依次为 `(NumLock, CapsLock, ScrollLock)`，会在 OUT 端点接收完成或 `SET_REPORT` 数据阶段被触发。

### `HIDGamepadT`：模板化 4 轴 + 8 按钮手柄

- Input Report 固定 9 字节：`4 × int16 axis + 1 × uint8 buttons`
- Report Descriptor 固定 50 字节（编译期常量），Logical Range 由模板参数决定：
  - `LOG_MIN` / `LOG_MAX`（默认 `0..2047`）
- 提供便捷发送接口：

```cpp
ErrorCode Send(int x, int y, int z, int rx, uint8_t buttons);
ErrorCode SendButtons(uint8_t buttons);
ErrorCode SendAxes(int x, int y, int z, int rx);
```

并提供别名：

- `HIDGamepad`：`0..2047`
- `HIDGamepadBipolar`：`-2048..2047`

---

## 使用示例

> 说明：具体 USB Device 框架如何注册 class 列表取决于你的上层 `usb_dev` 实现；以下示例展示 HID 对象的构造与典型调用。

### 鼠标

```cpp
#include "hid_mouse.hpp"

LibXR::USB::HIDMouse hid_mouse;

// usb_dev class list: {{&hid_mouse}}
// usb_dev.Init();
// usb_dev.Start();

hid_mouse.Move(LibXR::USB::HIDMouse::LEFT, 10, 0);  // 向右移动
hid_mouse.Release();
```

### 键盘（含 LED 回调）

```cpp
#include "hid_keyboard.hpp"

// enable_out_endpoint=true 可启用 OUT 中断端点接收 LED（可选）
LibXR::USB::HIDKeyboard hid_kbd(true);

hid_kbd.SetOnLedChangeCallback(
  LibXR::Callback<bool, bool, bool>(
    [](bool in_isr, bool num, bool caps, bool scroll) {
      (void)in_isr;
      // 根据 num/caps/scroll 更新板端指示灯
    }
  )
);

// 发送：Shift + A
hid_kbd.PressKey({LibXR::USB::HIDKeyboard::KeyCode::A},
                 LibXR::USB::HIDKeyboard::Modifier::LEFT_SHIFT);
hid_kbd.ReleaseAll();
```

### 手柄

```cpp
#include "hid_gamepad.hpp"

LibXR::USB::HIDGamepad gamepad;

// 发送一帧：轴值 + 按钮
gamepad.Send(1024, 1024, 1024, 1024, LibXR::USB::HIDGamepad::BTN1);
```

---

## 扩展建议（派生类实现要点）

当你实现新的 HID 设备时，通常需要做三件事：

1. **提供 Report Descriptor**：覆盖 `GetReportDesc()`  
2. **定义 Input Report 结构**：长度不超过 `TX_REPORT_LEN`  
3. （可选）处理 Output/Feature：
   - 若采用 **控制传输**：覆盖 `OnSetReport()` / `OnSetReportData()`
   - 若采用 **OUT 中断端点**：构造时启用 `enable_out_endpoint=true` 并覆盖 `OnDataOutComplete()`

如果需要发送队列/连续发送，可在 `OnDataInComplete()` 中实现“发送下一帧”的调度逻辑。
