---
id: xrusb-dev-stack-cdc
title: CDC
sidebar_position: 1
---

# CDC 设备协议栈

本节介绍 XRUSB 的 **USB CDC ACM（虚拟串口）** 设备类实现，重点覆盖：

- 描述符组织方式（IAD + Communication Interface + Data Interface）
- 端点资源申请、配置与回调分发
- CDC ACM 标准类请求处理（Line Coding / Control Line State）
- Serial State 通知的格式与发送策略
- 上层适配（`CDCUart`）与吞吐测试类（`CDCWriteTest` / `CDCReadTest`）

当前 CDC 协议栈由以下头文件构成（源码随仓库提供）：

- `cdc_base.hpp`：CDC ACM 通用基类（描述符 / 类请求 / 端点管理 / 回调分发）
- `cdc_uart.hpp`：CDC ↔ UART 语义适配（对上提供 `LibXR::UART` 的 Read/Write）
- `cdc_test.hpp`：吞吐测试用类（持续写出 / 持续读入）

---

## 组件概览

### `LibXR::USB::CDCBase`

`CDCBase` 继承自 `DeviceClass`，实现 CDC ACM 的通用部分：

- 端点资源申请与配置（Data IN / Data OUT / Comm IN）
- IAD + 通信接口 + 数据接口的配置描述符块填充
- CDC ACM 标准类请求处理（`GET_LINE_CODING` / `SET_LINE_CODING` / `SET_CONTROL_LINE_STATE`）
- 通过回调将 **控制线变化（DTR/RTS）**、**线路参数变化（Line Coding）** 通知给上层
- 提供收发完成钩子（`OnDataOutComplete` / `OnDataInComplete`）供派生类实现具体数据通路

`CDCBase` 不直接实现数据通路；派生类需要实现：

```cpp
virtual void OnDataOutComplete(bool in_isr, ConstRawData& data) = 0;
virtual void OnDataInComplete(bool in_isr, ConstRawData& data) = 0;
```

回调由端点传输完成触发，并由 `CDCBase` 的静态 trampoline 做 `inited_` 防护后分发。

### `LibXR::USB::CDCUart`

`CDCUart` 在 `CDCBase` 的基础上再继承 `LibXR::UART`，对上层暴露典型串口语义：

- `Read()`：从主机发来的 OUT 数据中读取
- `Write()`：向主机发送 IN 数据
- `SetConfig()`：把 UART 配置映射到 CDC Line Coding，并发送一次 Serial State 通知

它内部使用 `LibXR::ReadPort` / `LibXR::WritePort` 做软件缓冲与写队列管理，并在端点回调中完成数据入队/出队。

### `LibXR::USB::CDCWriteTest` / `LibXR::USB::CDCReadTest`

两者均派生自 `CDCBase`，用于验证链路吞吐与驱动稳定性：

- `CDCWriteTest`：当主机发送任意数据时，持续通过 Data IN 回传数据（测试设备 → 主机通路）
- `CDCReadTest`：持续预装 OUT 端点接收并在完成后立即重启（测试主机 → 设备通路）

---

## 接口与端点布局

### 接口（Interface）

CDC ACM 设备以 **两接口（Communication + Data）** 的方式呈现，并带 IAD（Interface Association Descriptor），便于主机将其识别为一个 CDC 复合功能。

- 通信接口（Communication Interface）：包含 1 个 Interrupt IN 端点（Notification Endpoint）
- 数据接口（Data Interface）：包含 1 个 Bulk OUT + 1 个 Bulk IN（数据收发）

`CDCBase::GetInterfaceNum()` 固定返回 `2`，`HasIAD()` 固定返回 `true`。

说明：

- IAD 的 `bFirstInterface` 由 `start_itf_num` 偏移得到
- Communication Interface 通常是 class request 的目标接口（`wIndex` 指向该接口号）

### 端点（Endpoint）

`CDCBase::Init()` 从 `EndpointPool` 申请并配置以下端点：

| 端点     | 方向 | 类型      | 典型用途                    |
| -------- | ---- | --------- | --------------------------- |
| Data OUT | OUT  | BULK      | 主机 → 设备 数据接收        |
| Data IN  | IN   | BULK      | 设备 → 主机 数据发送        |
| Comm IN  | IN   | INTERRUPT | CDC 通知（Serial State 等） |

Comm IN 端点最大包大小固定为 16 字节；Serial State 通知本身为 10 字节结构（见下文）。

端点号可在构造 `CDCBase` / `CDCUart` / 测试类时指定；默认使用 `Endpoint::EPNumber::EP_AUTO` 由端点池自动分配。

### 速度与最大包大小

Data IN/OUT 的描述符 `wMaxPacketSize` 取自端点对象的 `MaxPacketSize()`。

- Full-Speed Bulk 典型为 64 bytes/packet
- High-Speed Bulk 典型为 512 bytes/packet（若平台支持 HS）

实际值以平台 USB 控制器与端点实现为准。协议栈在描述符中写入端点报告的值。

---

## CDCBase 关键能力

### DTR/RTS 控制线状态

`CDCBase` 内部维护控制线状态 `control_line_state_`，并提供：

```cpp
bool IsDtrSet() const;
bool IsRtsSet() const;
```

当收到类请求 `SET_CONTROL_LINE_STATE` 时，行为为：

- 更新 `control_line_state_`（来自 `wValue`）
- 返回 ZLP（Zero-Length Packet）确认
- 调用 `SendSerialState()` 尝试通过 Comm IN 上报当前串行状态
- 触发用户回调 `SetOnSetControlLineStateCallback(cb)`，参数为 `(DTR, RTS)`

工程建议：

- 将 **DTR** 视作“主机串口已打开/准备通信”的关键信号
- DTR 断开时避免继续发送，避免上层阻塞或无意义的队列堆积

### Line Coding（波特率/校验/停止位/数据位）

CDC ACM 的 Line Coding 通过类请求 `SET_LINE_CODING` / `GET_LINE_CODING` 进行读写。

- `GET_LINE_CODING`：设备返回当前 `line_coding_`（7 字节）
- `SET_LINE_CODING`：控制传输的数据阶段写入 7 字节 `line_coding_`，随后在 `OnClassData()` 中转换为 `LibXR::UART::Configuration` 并回调上层

`SET_LINE_CODING` 的数据长度必须为 7 字节，不符合则返回 `ErrorCode::ARG_ERR`。

#### Line Coding 映射规则

当前 `CDCBase` 将 CDC Line Coding 映射到 `LibXR::UART::Configuration` 的规则如下：

| CDC 字段      | 取值       | 映射到 UART 配置                                     |
| ------------- | ---------- | ---------------------------------------------------- |
| `dwDTERate`   | 任意       | `cfg.baudrate = dwDTERate`                           |
| `bCharFormat` | 0          | `stop_bits = 1`                                      |
| `bCharFormat` | 2          | `stop_bits = 2`                                      |
| `bCharFormat` | 其他       | 降级为 `stop_bits = 1`（`1.5 stop bits` 目前未实现） |
| `bParityType` | 1          | `parity = ODD`                                       |
| `bParityType` | 2          | `parity = EVEN`                                      |
| `bParityType` | 其他       | 降级为 `NO_PARITY`（Mark/Space 将降级）              |
| `bDataBits`   | 5/6/7/8/16 | `data_bits = bDataBits`（透传）                      |

提示：

- USB CDC 的 Line Coding 在多数桌面 OS 上更多是“协商/提示”，是否真正影响主机侧串口参数取决于驱动策略
- 如果用于桥接真实 UART 外设，请以回调参数为准并在外设侧做合法性校验

### Serial State 通知

`SendSerialState()` 通过 Comm IN（Interrupt IN）端点向主机发送 Serial State 通知。

通知结构为 10 字节：

- 8 字节 CDC Notification Header
- 2 字节 UART state 位图 `serialState`

代码中结构体定义为：

```cpp
#pragma pack(push, 1)
struct SerialStateNotification
{
  uint8_t  bmRequestType;   // 固定 0xA1
  uint8_t  bNotification;   // 固定 SERIAL_STATE (0x20)
  uint16_t wValue;          // 固定 0
  uint16_t wIndex;          // Interface number（Communication Interface）
  uint16_t wLength;         // 固定 2
  uint16_t serialState;     // UART state bitmap
};
#pragma pack(pop)
```

---

## 回调与执行上下文

`CDCBase` 对外提供两类上层回调：

- `SetOnSetControlLineStateCallback(LibXR::Callback<bool, bool> cb)`
- `SetOnSetLineCodingCallback(LibXR::Callback<LibXR::UART::Configuration> cb)`

这些回调的 `Run(in_isr, ...)` 由控制传输处理路径触发；`in_isr` 用于提示调用上下文。

---

## 初始化与资源释放行为

### Init 行为

`CDCBase::Init(endpoint_pool, start_itf_num)` 的关键行为：

- 清零 `control_line_state_`
- 通过 `EndpointPool` 申请三个端点并完成 `Configure`
- 填充 IAD、Communication Interface、Data Interface 与端点描述符块
- 将描述符块通过 `SetData(RawData{...})` 交给设备框架拼入配置描述符
- 注册 Data OUT / Data IN 端点传输完成回调
- 设置 `inited_ = true`
- 启动 Data OUT 预接收：`ep_data_out_->Transfer(ep_data_out_->MaxTransferSize())`

提示：

- OUT 端点预接收的长度取决于端点实现的 `MaxTransferSize()`，用于持续接收主机数据
- `CDCBase` 不对收到的数据做缓存；派生类需在 `OnDataOutComplete` 中消费并重启 OUT 传输（或按自身策略重启）

### Deinit 行为

`CDCBase::Deinit(endpoint_pool)` 的关键行为：

- `inited_ = false`
- 清零 `control_line_state_`
- 关闭三端点、清零 active length
- 将端点归还给 `EndpointPool`
- 置端点指针为空

派生类或上层适配类在 `Deinit()` 时应确保：

- 终止所有依赖端点对象的异步操作
- 对外完成或失败掉未完成的读写请求，避免上层永久等待

---

## 使用示例

### 作为 CDC 虚拟串口使用（推荐：`CDCUart`）

```cpp
#include "cdc_uart.hpp"

LibXR::USB::CDCUart cdc_uart(/*rx*/256, /*tx*/256, /*tx_queue*/8);

// 设备构造时把 &cdc_uart 放入 class 列表：{{&cdc_uart}}
// usb_dev.Init();
// usb_dev.Start();
```

可选：监听主机对 Line Coding / DTR/RTS 的变化：

```cpp
cdc_uart.SetOnSetLineCodingCallback(
  LibXR::Callback<LibXR::UART::Configuration>(
    [](bool in_isr, LibXR::UART::Configuration cfg) {
      (void)in_isr;
      // 可在此同步到真实 UART 外设（注意 ISR 场景下不要阻塞）
    }
  )
);

cdc_uart.SetOnSetControlLineStateCallback(
  LibXR::Callback<bool, bool>(
    [](bool in_isr, bool dtr, bool rts) {
      (void)in_isr;
      (void)rts;
      // dtr=true 表示主机已打开串口，可开始发送
    }
  )
);
```

### 吞吐测试

写测试：

```cpp
#include "cdc_test.hpp"
LibXR::USB::CDCWriteTest cdc_write_test;
```

读测试：

```cpp
#include "cdc_test.hpp"
LibXR::USB::CDCReadTest cdc_read_test;
```

同样通过 USB Device 的 class 列表传入即可。
