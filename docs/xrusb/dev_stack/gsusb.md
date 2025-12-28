---
id: xrusb-dev-stack-gsusb
title: GSUSB
sidebar_position: 4
---

# GSUSB 设备协议栈

本文档描述 XRUSB 的 **GSUSB（Linux `gs_usb`）** 设备类实现：`LibXR::USB::GsUsbClass<CanChNum>`。

该设备类面向 Linux/SocketCAN 生态的 **USB-to-CAN** 使用方式，采用 **Vendor Interface + Bulk IN/OUT** 的传输模型，实现 `gs_usb` 协议常用控制面与数据面，支持：

- **经典 CAN**（Classic CAN，8 字节数据）
- **CAN FD**（可选，64 字节数据区，DLC 映射遵循 FD 表）
- **TX echo**（回送 `echo_id`，用于主机侧 TX buffer 跟踪）
- **可选硬件时间戳**（4 字节 `timestamp_us` 追加在 wire frame 末尾）
- **多通道**（通道数由模板参数 `CanChNum` 在编译期固定）

---

## 1. 类与构造方式

### 1.1 `LibXR::USB::GsUsbClass<CanChNum>`

- `CanChNum`：编译期固定的 CAN 通道数（`1..255`），内部以 `uint8_t` 形式对外呈现通道号。

该类同时兼容 Classic CAN 与 FDCAN（可选），通过 **不同构造函数**区分：

#### 构造：Classic CAN

```cpp
GsUsbClass(std::initializer_list<LibXR::CAN*> cans,
           Endpoint::EPNumber data_in_ep_num  = EP1,
           Endpoint::EPNumber data_out_ep_num = EP2,
           size_t rx_queue_size = 32,
           size_t echo_queue_size = 32,
           LibXR::GPIO* identify_gpio = nullptr,
           std::initializer_list<LibXR::GPIO*> termination_gpios = {},
           LibXR::Database* database = nullptr);
```

- `cans`：Classic CAN 指针列表，数量必须等于 `CanChNum`
- 默认 Bulk 端点号为 EP1(IN)/EP2(OUT)，旧版内核（例如4.4.38）只支持此布局
- Linux 主线 gs_usb 驱动通过 VID:PID 白名单匹配（例如 `1d50:606f`），并且要求匹配到 `bInterfaceNumber == 0` 的 USB interface。

#### 构造：FDCAN（启用 FD 能力）

```cpp
GsUsbClass(std::initializer_list<LibXR::FDCAN*> fd_cans,
           Endpoint::EPNumber data_in_ep_num  = EP_AUTO,
           Endpoint::EPNumber data_out_ep_num = EP_AUTO,
           size_t rx_queue_size = 32,
           size_t echo_queue_size = 32,
           LibXR::GPIO* identify_gpio = nullptr,
           std::initializer_list<LibXR::GPIO*> termination_gpios = {},
           LibXR::Database* database = nullptr);
```

- `fd_cans`：FDCAN 指针列表，数量必须等于 `CanChNum`
- 内部会将 `FDCAN*` **向上转型为 `CAN*`** 存入 `cans_`，从而共享部分逻辑

---

## 2. USB 接口与端点

### 2.1 接口描述符

`GsUsbClass` 暴露 **1 个接口**，不使用 IAD：

- `GetInterfaceNum()` 返回 `1`
- `HasIAD()` 返回 `false`

接口描述符的 class/subclass/protocol 固定为 `0xFF/0xFF/0xFF`（Vendor Specific），端点数为 2。

### 2.2 Bulk 端点

- **Bulk OUT**：Host → Device（主机下发 CAN/FD 帧，及进行 TX echo 追踪）
- **Bulk IN**：Device → Host（设备上报 CAN/FD RX 帧、错误帧，以及 TX echo 回包）

端点配置要点：

- `Configure(..., max_len = UINT16_MAX, ...)`：`UINT16_MAX` 仅作为上限，底层会选择一个不超过该值的可用最大长度（由 `Endpoint` 实现决定）。
- 发送使用 `TransferMultiBulk()`；接收同样使用 `TransferMultiBulk()` 以挂起多包接收。

---

## 3. gs_usb wire format（数据面）

### 3.1 Wire Header（12 字节）

所有 Bulk 数据帧都以固定 12 字节头开头：

```text
struct WireHeader {
  uint32_t echo_id;   // Echo ID
  uint32_t can_id;    // CAN ID (with flags)
  uint8_t  can_dlc;   // DLC
  uint8_t  channel;   // Channel index
  uint8_t  flags;     // GS_CAN_FLAG_*
  uint8_t  reserved;
}
```

关键约束：

- `ECHO_ID_RX = 0xFFFFFFFF`：设备上报 **RX 帧**时固定使用该 echo_id。
- 主机下发帧若 `echo_id != 0xFFFFFFFF`，设备会将该帧作为 **TX echo** 事件回送（见 6.2）。

### 3.2 负载与可选时间戳

- Classic CAN：payload 固定 **8 字节**
- CAN FD：payload 固定 **64 字节**
- 可选时间戳：若该通道启用硬件时间戳，则在 payload 后追加 **4 字节** `timestamp_us`（小端，单位微秒，取低 32 位）

总长度：

- Classic：`12 + 8`（或 `12 + 8 + 4`）
- FD：`12 + 64`（或 `12 + 64 + 4`）

### 3.3 DLC 与 FD 长度映射

- Classic：`can_dlc` 上限 8（超过 8 会被钳制为 8）
- FD：`can_dlc` 通过 FD DLC 映射表转换为 `len`（`0..64`）

FD DLC 表（实现内置）：

| DLC | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LEN | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 12  | 16  | 20  | 24  | 32  | 48  | 64  |

---

## 4. 生命周期：Init / Deinit

### 4.1 `Init(endpoint_pool, start_itf_num)`

初始化流程要点：

1. 分配 Bulk IN/OUT 端点，配置为 BULK 类型
2. 填充接口描述符与两个端点描述符，并通过 `SetData()` 交给上层配置描述符拼装
3. 注册端点回调：
   - OUT 完成 → `OnDataOutComplete()`（解析 host 下发）
   - IN 完成 → `OnDataInComplete()`（继续尝试发送下一帧）
4. 复位状态：
   - `host_format_ok_ = false`（需主机执行 HOST_FORMAT 协商）
   - 各通道 `can_enabled_/fd_enabled_/berr_enabled_/timestamps_enabled_ch_` 清零
   - `term_state_` 置为 OFF
5. 注册 CAN RX 回调（仅首次注册）：
   - Classic：订阅 STANDARD/EXTENDED/REMOTE/ERROR 等类型
   - FD：订阅 STANDARD/EXTENDED（FD pack）
6. `inited_ = true`，并调用 `MaybeArmOutTransfer()` 保持 OUT 端点处于挂起接收状态

### 4.2 `Deinit(endpoint_pool)`

- 关闭端点并归还到 `EndpointPool`
- 清空关键状态并复位开关位
- `host_format_ok_ = false`

---

## 5. Host → Device 数据路径（Bulk OUT）

### 5.1 OUT 完成回调：`OnDataOutComplete()`

处理逻辑（高层）：

1. 校验长度（至少包含 Classic frame 的 20 字节：`12 + 8`）
2. 解析 `WireHeader`，检查 `channel` 合法且该通道对象存在
3. 按 `flags` 判断是否 FD：
   - FD：要求 `fd_supported_ && fdcans_[ch] && fd_enabled_[ch]`
   - Classic：要求 `can_enabled_[ch] == true`
4. wire → pack：
   - Classic：`HostWireToClassicPack()` → `CAN::ClassicPack` → `cans_[ch]->AddMessage(pack)`
   - FD：`HostWireToFdPack()` → `FDCAN::FDPack` → `fdcans_[ch]->AddMessage(pack)`
5. 若 `echo_id != 0xFFFFFFFF`：
   - 生成一个 `QueueItem` 放入 **echo_queue_**，用于后续 Bulk IN 回送 echo（见 6.2）
6. 重新挂起 OUT 接收：`MaybeArmOutTransfer()`

---

## 6. Device → Host 数据路径（Bulk IN）

设备向主机发送的数据来源有两类：

1. **TX echo**（优先级更高）：回送主机下发帧的 `echo_id`
2. **RX 上报**：CAN/FDCAN 接收的帧、以及错误帧（可选）

### 6.1 CAN RX 回调入队

#### Classic：`OnCanRx(in_isr, ch, pack)`

- 若为 `Type::ERROR`：
  - 在 `berr_enabled_[ch]` 打开的前提下，将 LibXR 错误包转换为 **SocketCAN 语义的错误帧**（`CAN_ERR_FLAG` 等）并入队
- 否则：
  - 只有 `can_enabled_[ch]` 为 true 才会上报
  - 将 pack 转换为 `QueueItem` 并入队（echo_id 固定为 RX 值）

#### FD：`OnFdCanRx(in_isr, ch, pack)`

- 仅当 `fd_supported_ && fd_enabled_[ch] && fdcans_[ch]` 时上报
- pack 转为 `QueueItem`，并根据 FD 配置将 `BRS/ESI` 标志映射到 `hdr.flags`

### 6.2 入队与发送触发：`EnqueueFrame()` / `TryKickTx()`

- 入队：`rx_queue_`（RX 上报）或 `echo_queue_`（TX echo）
- 一旦入队成功，会调用 `TryKickTx()` 尝试启动 Bulk IN 发送

`TryKickTx()` 要点：

1. 仅当 IN 端点状态为 `IDLE` 才会启动发送
2. 出队顺序：**echo_queue_ 优先**，其后才是 rx_queue_
3. 将 `QueueItem` 打包为 wire bytes：
   - 固定写入 12 字节 header
   - 写入 8 或 64 字节 payload
   - 若该通道启用时间戳，再追加 4 字节 `timestamp_us`
4. 调用 `ep_data_in_->TransferMultiBulk(...)` 发送
5. IN 发送完成回调会再次调用 `TryKickTx()` 发送下一帧，实现连续发送

---

## 7. OUT 端点保持挂起：`MaybeArmOutTransfer()`

为避免 host 下发被“断流”，设备会尽可能让 Bulk OUT 保持在接收状态：

- 条件：
  - OUT 端点为 `IDLE`
  - **rx_queue_ 与 echo_queue_ 均未满**（`EmptySize() != 0`）
- 满足条件后，提交一个 `WIRE_MAX_SIZE`（最大 wire 帧长度）的接收缓冲：
  - `TransferMultiBulk(rx_buf_, WIRE_MAX_SIZE)`

设计含义：

- 当任一队列满时，会暂时停止 arm OUT 接收，避免在 OUT 回调中继续堆积导致丢包/覆盖。

---

## 8. Vendor Request（控制面）

`GsUsbClass` 不实现标准 Class Request（`OnClassRequest()` 返回 `NOT_SUPPORT`），所有控制面均通过 **Vendor Request（gs_usb BREQ）** 完成。

### 8.1 Device → Host（读）

| BREQ              | 返回结构                        | 说明                                 |
| ----------------- | ------------------------------- | ------------------------------------ |
| `BT_CONST`        | `GsUsb::DeviceBTConst`          | classic bit timing 常量与 feature 位 |
| `BT_CONST_EXT`    | `GsUsb::DeviceBTConstExtended`  | 扩展/FD 能力常量（仅 FD 支持时）     |
| `DEVICE_CONFIG`   | `GsUsb::DeviceConfig`           | 设备配置（通道数、版本等）           |
| `TIMESTAMP`       | `uint32_t`                      | 全局时间戳（us，低 32 位）           |
| `GET_TERMINATION` | `GsUsb::DeviceTerminationState` | 读取终端电阻状态（按通道）           |
| `GET_STATE`       | `GsUsb::DeviceState`            | 读取 CAN 错误状态/计数（按通道）     |
| `GET_USER_ID`     | `uint32_t`                      | 读取 USER_ID（来自 RAM 或 Database） |

### 8.2 Host → Device（写，有 DATA 阶段）

| BREQ              | 写入结构                        | 说明                                              |
| ----------------- | ------------------------------- | ------------------------------------------------- |
| `HOST_FORMAT`     | `GsUsb::HostConfig`             | 主机字节序协商（通过后才允许配置 bit timing 等）  |
| `BITTIMING`       | `GsUsb::DeviceBitTiming`        | 仲裁相位 bit timing（按通道）                     |
| `DATA_BITTIMING`  | `GsUsb::DeviceBitTiming`        | 数据相位 bit timing（FD，仅 FD 支持时）           |
| `MODE`            | `GsUsb::DeviceMode`             | START/RESET 与模式标志（loopback/listen-only 等） |
| `BERR`            | `uint32_t`                      | 错误帧上报开关（按通道）                          |
| `IDENTIFY`        | `GsUsb::Identify`               | Identify GPIO 控制（若硬件存在）                  |
| `SET_TERMINATION` | `GsUsb::DeviceTerminationState` | 终端电阻开关（若硬件存在）                        |
| `SET_USER_ID`     | `uint32_t`                      | 写入 USER_ID（RAM 或 Database）                   |

### 8.3 HOST_FORMAT 约束

- `HandleHostFormat()` 以 `cfg.byte_order == 0x0000beef` 判定协商是否通过
- `host_format_ok_ == false` 时：
  - `BITTIMING / MODE` 等将返回 `ARG_ERR`，从而强制主机先完成格式协商

---

## 9. CAN 配置处理（BITTIMING / MODE 等）

### 9.1 `BITTIMING`（仲裁相位）

`HandleBitTiming(ch, bt)`：

- 校验：`host_format_ok_`、通道号范围、`cans_[ch]` 非空
- 将 `DeviceBitTiming` 映射到 `LibXR::CAN::Configuration::bit_timing`
- 计算派生量：
  - `TSEG1 = prop_seg + phase_seg1`
  - `TSEG2 = phase_seg2`
  - `TQ_NUM = 1 + TSEG1 + TSEG2`
  - `bitrate = FCLK / (brp * TQ_NUM)`（若分母为 0 则置 0）
  - `sample_point = (1 + TSEG1) / TQ_NUM`
- 应用：`cans_[ch]->SetConfig(cfg)`
- 若 FD 支持：同步将仲裁相位配置复制到 `fd_config_[ch]`

### 9.2 `DATA_BITTIMING`（数据相位，FD）

`HandleDataBitTiming(ch, bt)`：

- 仅在 `fd_supported_ && fdcans_[ch]` 时有效，否则 `NOT_SUPPORT`
- 将 data phase timing 写入 `fd_config_[ch].data_timing`
- 计算 `data_bitrate / data_sample_point`
- 应用：`fdcans_[ch]->SetConfig(fd_cfg)`

### 9.3 `MODE`（START/RESET + 标志位）

`HandleMode(ch, mode)`：

- `RESET`：
  - `can_enabled_[ch] = false`
  - `fd_enabled_[ch] = false`
- `START`：
  - `can_enabled_[ch] = true`
  - 若 FD 支持且主机设置 FD 标志，则 `fd_enabled_[ch] = true`

模式标志映射到 `cfg.mode`：

- loopback / listen-only / triple-sampling / one-shot

并同步控制：

- `timestamps_enabled_ch_[ch]`（硬件时间戳开关）
- `berr_enabled_[ch]`（错误帧上报开关）

### 9.4 `BERR`（错误帧上报开关）

`HandleBerr(ch, berr_on)`：仅修改 `berr_enabled_[ch]`。

### 9.5 `IDENTIFY` / `SET_TERMINATION`

- Identify：若存在 `identify_gpio_`，按请求 ON/OFF 写 GPIO
- Termination：若存在对应通道的 `termination_gpio_[ch]`，写 GPIO 并更新 `term_state_[ch]`

### 9.6 `GET_STATE`

- 从 `cans_[ch]->GetErrorState()` 获取：
  - bus off / error passive / error warning / active
  - rx/tx error counter
- 以 `GsUsb::DeviceState` 返回给主机

---

## 10. 错误帧映射（SocketCAN 语义）

Classic CAN 的 `Type::ERROR` 通过 `ErrorPackToHostErrorFrame()` 转换为主机可识别的错误帧：

- `can_id` 使用 `CAN_ERR_FLAG` 并按不同错误类型设置 `CAN_ERR_*` 位
- `data[6]` / `data[7]` 填充 TX/RX error counter（饱和到 0..255）
- 仅当：
  - `berr_enabled_[ch] == true`
  - `err_pack.id` 为 LibXR 约定的错误 ID
  才会上报

---

## 11. 时间戳行为

- `MakeTimestampUs(ch)`：
  - 仅当该通道启用时间戳且 `LibXR::Timebase::timebase != nullptr` 时返回 `GetMicroseconds()` 的低 32 位
  - 否则返回 0
- 时间戳在 wire frame 尾部以 4 字节追加（是否追加由 `timestamps_enabled_ch_[ch]` 决定）
---

## 12. 使用示例

### 12.1 Classic CAN（2 通道）

```cpp
using Dev = LibXR::USB::GsUsbClass<2>;

Dev gsusb({&can1, &can2},
          /*in_ep*/LibXR::USB::Endpoint::EPNumber::EP1,
          /*out_ep*/LibXR::USB::Endpoint::EPNumber::EP2,
          /*rx_queue*/64,
          /*echo_queue*/64,
          /*identify*/&led_gpio,
          /*termination*/{&term1_gpio, &term2_gpio},
          /*db*/&db);

// USB device class list: {{&gsusb}}
// usb_dev.Init();
// usb_dev.Start();
```

### 12.2 FDCAN（1 通道）

```cpp
using Dev = LibXR::USB::GsUsbClass<1>;

Dev gsusb({&fdcan1},
          /*in_ep*/LibXR::USB::Endpoint::EPNumber::EP_AUTO,
          /*out_ep*/LibXR::USB::Endpoint::EPNumber::EP_AUTO);
```

主机侧（Linux）一般通过 `gs_usb` 驱动枚举为 SocketCAN 设备（如 `can0`），随后使用 `ip link set can0 up type can bitrate ...` 或 `cansend/candump` 等工具进行收发。
