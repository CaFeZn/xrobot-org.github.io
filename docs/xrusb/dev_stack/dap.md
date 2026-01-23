---
id: xrusb-dev-stack-daplinkv2
title: DAPLinkV2
sidebar_position: 5
---

# DAPLinkV2 设备协议栈

本文档描述 XRUSB 的 **CMSIS-DAP v2（Bulk）** 设备类实现：`LibXR::USB::DapLinkV2Class`。

该设备类面向通用 CMSIS-DAP v2 主机工具链（如 pyOCD、OpenOCD 的 CMSIS-DAP backend、DAPLink 兼容客户端等）的 **USB Bulk 传输**方式，采用 **1 个 Vendor Interface + 2 个 Bulk 端点（1 IN + 1 OUT）** 的传输模型，实现 DAP v2 常用命令子集（以 SWD 为主），并提供 Windows 侧即插即用的 WinUSB（MS OS 2.0）能力宣告。

支持能力：

- **CMSIS-DAP v2 Bulk transport**
- **SWD-only**（`DAP_Connect` 仅支持 SWD；JTAG 未实现）
- **可选 nRESET 控制**（通过 `GPIO* nreset_gpio` 注入，缺省为不支持）
- **SWJ_Pins shadow 语义**（SWDIO/SWCLK 以 shadow 状态对主机表现；nRESET 若连线可返回真实电平）
- **WinUSB（MS OS 2.0）BOS 平台能力**（CompatibleID="WINUSB" + DeviceInterfaceGUIDs）
- **DAP_Transfer / DAP_TransferBlock**（含 AP posted-read pipeline；Transfer 支持 match / timestamp 的约束检查）

---

## 1. 类与构造方式

### 1.1 `LibXR::USB::DapLinkV2Class`

构造函数：

```cpp
explicit DapLinkV2Class(
    LibXR::Debug::Swd& swd_link,
    LibXR::GPIO* nreset_gpio = nullptr,
    Endpoint::EPNumber data_in_ep_num  = Endpoint::EPNumber::EP_AUTO,
    Endpoint::EPNumber data_out_ep_num = Endpoint::EPNumber::EP_AUTO);
```

参数说明：

- `swd_link`：SWD 后端实现（由 `LibXR::Debug::Swd` 提供具体 SWD 事务、序列读写等）。
- `nreset_gpio`：可选 nRESET GPIO；若为空则与 reset 相关命令以“best-effort”方式处理。
- `data_in_ep_num` / `data_out_ep_num`：Bulk IN/OUT 端点号；支持自动分配（`EP_AUTO`）。

### 1.2 可选的 InfoStrings

可通过 `SetInfoStrings()` 覆盖默认字符串集合，用于 `DAP_Info` 返回：

```cpp
struct InfoStrings {
  const char* vendor;
  const char* product;
  const char* serial;
  const char* firmware_ver;

  const char* device_vendor;
  const char* device_name;
  const char* board_vendor;
  const char* board_name;
  const char* product_fw_ver;
};
```

注意：`DAP_Info` 的字符串返回包含 **末尾 NUL**，并在容量不足时保证以 NUL 结尾（截断安全）。

---

## 2. USB 接口与端点

### 2.1 接口描述符

`DapLinkV2Class` 贡献 **1 个接口**，不使用 IAD：

- `GetInterfaceCount()` 返回 `1`
- `HasIAD()` 返回 `false`

接口描述符的 class 固定为 `0xFF`（Vendor Specific），并暴露 **2 个 Bulk 端点**。

### 2.2 Bulk 端点

- **Bulk OUT**：Host → Device（DAP 请求包）
- **Bulk IN**：Device → Host（DAP 响应包）

端点配置要点：

- `Configure(max_len = UINT16_MAX, double_buffer = false)`  
  其中 `UINT16_MAX` 仅作为上限；底层会选择一个不超过该值的合法最大包长（由 `Endpoint` 实现决定）。
- `double_buffer = false` 用于保持严格的 **请求/响应串行**，并配合 `tx_busy_` 防止 `tx_buf_` 被覆盖。

---

## 3. WinUSB（MS OS 2.0）支持

为便于 Windows 侧免驱访问，该类在 BOS 中声明 MS OS 2.0 平台能力，并提供 MS OS 2.0 descriptor set：

- BOS Capability：MS OS 2.0 Platform Capability
- Vendor code：`0x20`（`WINUSB_VENDOR_CODE`）
- Compatible ID：`"WINUSB"`
- DeviceInterfaceGUIDs（REG_MULTI_SZ，UTF-16LE）：`{CDB3B5AD-293B-4663-AA36-1AAE46463776}`（单 GUID + 双 NUL 结束）

接口号在绑定时确定（`start_itf_num`），因此 MS OS 2.0 function subset 中的 `bFirstInterface` 会在 `BindEndpoints()` 时根据实际接口号补丁更新，以确保 Windows 枚举一致。

---

## 4. 传输模型（Bulk 请求/响应）

本类实现的是 **CMSIS-DAP v2 over Bulk** 的同步请求/响应模型：

1. 主机向 **Bulk OUT** 发送一帧请求（request）。
2. 设备在 OUT 完成回调中解析请求并生成响应（response）。
3. 设备通过 **Bulk IN** 发送响应。
4. IN 发送完成后，设备再次 arm OUT 接收下一帧请求。

---

## 5. 生命周期：Bind / Unbind

### 5.1 `BindEndpoints(endpoint_pool, start_itf_num)`

初始化流程要点：

1. 记录 `interface_num_ = start_itf_num`，并更新 WinUSB MS OS 2.0 function subset 的接口号字段。
2. 从 `EndpointPool` 分配 Bulk OUT 与 Bulk IN 端点。
3. 配置端点（BULK，`max_len=UINT16_MAX`，`double_buffer=false`）。
4. 注册端点回调：
   - OUT 完成 → `OnDataOutComplete()`
   - IN 完成 → `OnDataInComplete()`
5. 生成并提交配置描述符块（Interface + 2x Endpoint），通过 `SetData()` 提交给上层拼装。
6. 复位运行时状态：
   - `dap_state_` 清零后设置默认 debug_port=DISABLED，transfer_abort=false
   - `swj_clock_hz_` 设为 1 MHz 并同步到 `swd_`
   - SWJ shadow 默认：SWDIO=1、nRESET=1、SWCLK=0（详见 6.3）
7. 标记 `inited_=true`，并调用 `ArmOutTransferIfIdle()` 保持 OUT 端点处于挂起接收状态。

### 5.2 `UnbindEndpoints(endpoint_pool)`

释放流程要点：

- 清 `inited_` 与 `tx_busy_`，并将 `dap_state_.debug_port` 置为 DISABLED。
- 关闭并释放 IN/OUT 端点，归还到 `EndpointPool`。
- 调用 `swd_.Close()` 关闭 SWD 后端。
- 复位 shadow 默认值（SWDIO=1、nRESET=1、SWCLK=0）。

---

## 6. 运行时状态与默认值

### 6.1 DAP 状态

`GetState()` 返回内部状态结构 `LibXR::USB::DapLinkV2Def::State`，关键字段包括：

- `debug_port`：当前连接端口（默认 DISABLED；CONNECT 后为 SWD）
- `transfer_abort`：TransferAbort 标志（由 `DAP_TransferAbort` 设置；见 8.6）
- `transfer_cfg`：TransferConfigure 解析后的传输策略（idle_cycles / retry_count / match_retry）

### 6.2 SWJ 时钟

- 默认：`1,000,000 Hz`
- `DAP_SWJ_Clock` 会写入 `swj_clock_hz_` 并调用 `swd_.SetClockHz(hz)`

### 6.3 SWJ shadow 语义

本实现并不在 USB 类内部直接 bit-bang SWDIO/SWCLK；这些由 `LibXR::Debug::Swd` 后端承担。为保持 CMSIS-DAP 兼容性，类内部维护一个 SWJ pin shadow：

- 绑定后默认：SWDIO=1、nRESET=1、SWCLK=0
- `DAP_SWJ_Pins` 对 SWDIO/SWCLK 的设置会更新 shadow（即便该引脚不可物理驱动）
- 对 nRESET：若 `nreset_gpio_` 存在则会驱动 GPIO，并在读取时返回真实电平；否则同样使用 shadow 表现

---

## 7. Host → Device 数据路径（Bulk OUT）

### 7.1 OUT 完成回调：`OnDataOutComplete()`

高层流程：

1. 校验初始化状态与端点有效性。
2. 若 `tx_busy_ == true`，出于安全直接返回。
3. 读取 OUT 数据：
   - 若空包或空指针：立即重新 arm OUT。
   - 否则调用 `ProcessOneCommand(req, req_len, tx_buf_, MAX_RESP, out_len)` 生成响应。
4. 设置 `tx_busy_ = true`，并通过 Bulk IN 发送响应：`TransferMultiBulk(tx_buf_[0..out_len))`。
5. 若 IN 提交失败，则清 `tx_busy_` 并重新 arm OUT。

### 7.2 OUT 端点保持挂起：`ArmOutTransferIfIdle()`

为保持主机端请求连续性，设备会尽可能让 Bulk OUT 处于接收状态，但受以下条件约束：

- `inited_ == true`
- `tx_busy_ == false`（上一条响应已发送完成）
- OUT 端点状态为 `IDLE`

满足条件后，提交接收缓冲：`TransferMultiBulk(rx_buf_, MAX_REQ)`。

---

## 8. 命令集（实现概览）

命令分发逻辑位于 `ProcessOneCommand()`，以请求首字节 `CMD`（命令 ID）决定处理器；未识别命令返回单字节 `0xFF`。

### 8.1 已实现命令列表

| Command | ID | 行为概述 |
| --- | ---: | --- |
| `DAP_Info` | `INFO` | 返回字符串/数值信息（含 PACKET_SIZE / TIMESTAMP_CLOCK 等） |
| `DAP_HostStatus` | `HOST_STATUS` | 返回 OK（简化实现） |
| `DAP_Connect` | `CONNECT` | 仅支持 SWD；成功时进入 SWD 并返回端口 SWD |
| `DAP_Disconnect` | `DISCONNECT` | 关闭 SWD 后端并回到 DISABLED |
| `DAP_TransferConfigure` | `TRANSFER_CONFIGURE` | 设置 idle_cycles / retry 等，并映射到 SWD policy |
| `DAP_Transfer` | `TRANSFER` | 支持 DP/AP 读写、match、timestamp 约束检查、AP posted-read pipeline |
| `DAP_TransferBlock` | `TRANSFER_BLOCK` | DP/AP block 读写；AP read 使用 posted pipeline；不支持 match/timestamp |
| `DAP_TransferAbort` | `TRANSFER_ABORT` | 置 abort 标志，下一次 Transfer/Block 将返回错误并清标志 |
| `DAP_WriteABORT` | `WRITE_ABORT` | 调用 SWD 后端写 ABORT，按 ack 返回 OK/ERROR |
| `DAP_Delay` | `DELAY` | 微秒延时（Timebase） |
| `DAP_ResetTarget` | `RESET_TARGET` | 若有 nRESET，则执行拉低/释放脉冲并标记 execute=1；否则 execute=0，但仍返回 DAP_OK |
| `DAP_SWJ_Pins` | `SWJ_PINS` | 更新 shadow 并 best-effort 控制 nRESET；支持 PinWait 轮询 |
| `DAP_SWJ_Clock` | `SWJ_CLOCK` | 更新 SWJ clock，并写入 SWD 后端 |
| `DAP_SWJ_Sequence` | `SWJ_SEQUENCE` | 写入 SWJ bit 序列（LSB-first），并更新 shadow（SWDIO=last bit, SWCLK=0） |
| `DAP_SWD_Configure` | `SWD_CONFIGURE` | best-effort 解析（可选），直接返回 OK |
| `DAP_SWD_Sequence` | `SWD_SEQUENCE` | 多段输入/输出序列；输入数据追加在响应尾部（LSB-first） |
| `DAP_QueueCommands` | `QUEUE_COMMANDS` | 固定返回 DAP_ERROR（未实现） |
| `DAP_ExecuteCommands` | `EXECUTE_COMMANDS` | 固定返回 DAP_ERROR（未实现） |

注：具体数值 ID 取决于 `DapLinkV2Def::CommandId` 的定义；本文以枚举名表示。

---

## 9. 错误与兼容性约定

- 未识别命令：返回单字节 `0xFF`（unknown command response）。
- 对部分命令采用“transport-level OK、语义 ERROR”的策略：即响应包仍按协议返回，但状态位标记错误，避免主机因丢包/短包失步。
- `QUEUE_COMMANDS` / `EXECUTE_COMMANDS`：固定返回 `DAP_ERROR`（未实现）。
- `SWD_CONFIGURE`：best-effort 解析（可选），始终返回 OK 以保持兼容。

---

## 10. 使用示例

### 10.1 设备侧初始化（示意）

```cpp
#include "daplink_v2.hpp"
#include "usb/device.hpp"
#include "debug/swd.hpp"

// 此处使用基类示例，实际应为派生类
LibXR::Debug::Swd swd(/* ... init ... */);
LibXR::GPIO nreset(/* ... optional ... */);

LibXR::USB::DapLinkV2Class dap(swd, &nreset);

// 可选：覆盖 DAP_Info 字符串
LibXR::USB::DapLinkV2Class::InfoStrings info;
info.vendor = "XRobot";
info.product = "DAPLinkV2";
info.serial = "00000001";
info.firmware_ver = "2.0.0";
dap.SetInfoStrings(info);

// USB device class list: {{&dap}}
// usb_dev.Init();
// usb_dev.Start();
```

### 10.2 Windows/WinUSB 侧访问

该类通过 BOS/MS OS 2.0 描述符集声明 WinUSB 与 DeviceInterfaceGUIDs，Windows 通常可在无需自定义 INF 的情况下枚举为 WinUSB 设备，并可通过 GUID 在用户态进行枚举与打开。

### 11. SWD实现

#### 11.1 SwdGeneralGPIO

使用两个普通GPIO分别作为 SWDIO/SWCLK，实现通用 SWD 通信，无需任何特殊配置。推荐为每个IO串联 33Ω 电阻，同时为 SWDIO 添加10KΩ上拉。
