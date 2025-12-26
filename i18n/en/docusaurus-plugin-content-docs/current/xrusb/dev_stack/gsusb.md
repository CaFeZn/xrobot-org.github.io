---
id: xrusb-dev-stack-gsusb
title: GSUSB
sidebar_position: 4
---

# GSUSB Device Stack

This document describes XRUSB’s **GSUSB (Linux `gs_usb`)** device-class implementation: `LibXR::USB::GsUsbClass<CanChNum>`.

This device class targets the Linux/SocketCAN **USB-to-CAN** ecosystem. It uses a **Vendor Interface + Bulk IN/OUT** transport model and implements the commonly used `gs_usb` control and data planes, supporting:

- **Classic CAN** (8-byte data field)
- **CAN FD** (optional; 64-byte data field; DLC mapping follows the CAN FD table)
- **TX echo** (echoes `echo_id` for host-side TX buffer tracking)
- **Optional hardware timestamp** (4-byte `timestamp_us` appended to the end of the wire frame)
- **Multi-channel** (channel count fixed at compile time by the template parameter `CanChNum`)

---

## 1. Class and Construction

### 1.1 `LibXR::USB::GsUsbClass<CanChNum>`

- `CanChNum`: compile-time fixed CAN channel count (`1..255`). The channel index exposed to the host is represented as `uint8_t`.

This class supports both Classic CAN and (optionally) FDCAN. They are selected via **different constructors**:

#### Construct: Classic CAN

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

- `cans`: list of Classic CAN pointers; the list size must equal `CanChNum`.
- Default bulk endpoint numbers are EP1(IN) / EP2(OUT).

#### Construct: FDCAN (enables FD capability)

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

- `fd_cans`: list of FDCAN pointers; the list size must equal `CanChNum`.
- Internally, each `FDCAN*` is **upcast to `CAN*`** and stored into `cans_` so that part of the logic is shared.

---

## 2. USB Interface and Endpoints

### 2.1 Interface descriptor

`GsUsbClass` exposes **one interface** and does not use IAD:

- `GetInterfaceNum()` returns `1`
- `HasIAD()` returns `false`

The interface class/subclass/protocol are fixed to `0xFF/0xFF/0xFF` (Vendor Specific), and the interface has 2 endpoints.

### 2.2 Bulk endpoints

- **Bulk OUT**: Host → Device (host sends CAN/FD frames and uses it for TX-echo tracking)
- **Bulk IN**: Device → Host (device reports CAN/FD RX frames, error frames, and TX-echo replies)

Endpoint configuration notes:

- `Configure(..., max_len = UINT16_MAX, ...)`: `UINT16_MAX` is only an upper bound; the lower layer will choose an available maximum length not exceeding it (depending on the `Endpoint` implementation).
- TX uses `TransferMultiBulk()`; RX also uses `TransferMultiBulk()` to keep multi-packet reception armed.

---

## 3. `gs_usb` wire format (data plane)

### 3.1 Wire Header (12 bytes)

All bulk data frames start with a fixed 12-byte header:

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

Key constraints:

- `ECHO_ID_RX = 0xFFFFFFFF`: when the device reports **RX frames**, it always uses this fixed `echo_id`.
- If the host transmits a frame with `echo_id != 0xFFFFFFFF`, the device will send a **TX echo** event back for that frame (see Section 6.2).

### 3.2 Payload and optional timestamp

- Classic CAN: payload is always **8 bytes**
- CAN FD: payload is always **64 bytes**
- Optional timestamp: if hardware timestamping is enabled for the channel, append a **4-byte** `timestamp_us` (little-endian, microseconds, lower 32 bits) after the payload

Total lengths:

- Classic: `12 + 8` (or `12 + 8 + 4`)
- FD: `12 + 64` (or `12 + 64 + 4`)

### 3.3 DLC and CAN FD length mapping

- Classic: `can_dlc` is capped at 8 (values greater than 8 are clamped to 8)
- FD: `can_dlc` is converted to `len` (`0..64`) via the CAN FD DLC mapping table

CAN FD DLC table (built into the implementation):

| DLC | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  | 12  | 13  | 14  | 15  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LEN | 0   | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 12  | 16  | 20  | 24  | 32  | 48  | 64  |

---

## 4. Lifecycle: Init / Deinit

### 4.1 `Init(endpoint_pool, start_itf_num)`

Key initialization steps:

1. Allocate Bulk IN/OUT endpoints and configure them as BULK
2. Populate the interface descriptor and the two endpoint descriptors, and pass them upward via `SetData()` for configuration-descriptor assembly
3. Register endpoint callbacks:
   - OUT complete → `OnDataOutComplete()` (parse host transmissions)
   - IN complete → `OnDataInComplete()` (continue attempting to send the next frame)
4. Reset runtime state:
   - `host_format_ok_ = false` (HOST_FORMAT negotiation is required)
   - Clear per-channel flags: `can_enabled_ / fd_enabled_ / berr_enabled_ / timestamps_enabled_ch_`
   - Set `term_state_` to OFF
5. Register CAN RX callbacks (only once):
   - Classic: subscribe to STANDARD / EXTENDED / REMOTE / ERROR, etc.
   - FD: subscribe to STANDARD / EXTENDED (FD packs)
6. Set `inited_ = true`, then call `MaybeArmOutTransfer()` to keep the OUT endpoint armed for reception

### 4.2 `Deinit(endpoint_pool)`

- Close endpoints and release them back to `EndpointPool`
- Clear key state and reset enable flags
- Set `host_format_ok_ = false`

---

## 5. Host → Device data path (Bulk OUT)

### 5.1 OUT completion callback: `OnDataOutComplete()`

High-level processing flow:

1. Validate length (must be at least one Classic frame: 20 bytes = `12 + 8`)
2. Parse `WireHeader`, validate `channel`, and ensure the channel object exists
3. Determine whether the frame is FD by `flags`:
   - FD: requires `fd_supported_ && fdcans_[ch] && fd_enabled_[ch]`
   - Classic: requires `can_enabled_[ch] == true`
4. Convert wire → pack:
   - Classic: `HostWireToClassicPack()` → `CAN::ClassicPack` → `cans_[ch]->AddMessage(pack)`
   - FD: `HostWireToFdPack()` → `FDCAN::FDPack` → `fdcans_[ch]->AddMessage(pack)`
5. If `echo_id != 0xFFFFFFFF`:
   - Create a `QueueItem` and push it into **`echo_queue_`** for later TX-echo reply over Bulk IN (see Section 6.2)
6. Re-arm OUT reception: `MaybeArmOutTransfer()`

---

## 6. Device → Host data path (Bulk IN)

Device-to-host traffic comes from two sources:

1. **TX echo** (higher priority): echoes the `echo_id` for frames issued by the host
2. **RX reporting**: received CAN/FDCAN frames and optional error frames

### 6.1 CAN RX callback enqueue

#### Classic: `OnCanRx(in_isr, ch, pack)`

- If `Type::ERROR`:
  - When `berr_enabled_[ch]` is enabled, the LibXR error pack is converted into a **SocketCAN-semantics error frame** (with `CAN_ERR_FLAG`, etc.) and enqueued
- Otherwise:
  - Only reported if `can_enabled_[ch]` is true
  - Convert the pack to a `QueueItem` and enqueue (echo_id fixed to RX value)

#### FD: `OnFdCanRx(in_isr, ch, pack)`

- Reported only when `fd_supported_ && fd_enabled_[ch] && fdcans_[ch]`
- Convert the pack to a `QueueItem`, then map FD configuration flags into `hdr.flags`:
  - Set `BRS/ESI` bits if enabled

### 6.2 Enqueue and transmit triggering: `EnqueueFrame()` / `TryKickTx()`

- Enqueue destination: `rx_queue_` (RX reporting) or `echo_queue_` (TX echo)
- After a successful enqueue, `TryKickTx()` is called to attempt starting a Bulk IN transfer

`TryKickTx()` key points:

1. Transmit starts only when the IN endpoint is `IDLE`
2. Dequeue order: **`echo_queue_` first**, then `rx_queue_`
3. Pack a `QueueItem` into wire bytes:
   - Always write 12-byte header
   - Write 8-byte or 64-byte payload
   - If timestamps are enabled for the channel, append 4-byte `timestamp_us`
4. Send via `ep_data_in_->TransferMultiBulk(...)`
5. The IN completion callback calls `TryKickTx()` again to send the next frame, enabling continuous transmission

---

## 7. Keeping Bulk OUT armed: `MaybeArmOutTransfer()`

To avoid host transmissions being “stalled,” the device keeps Bulk OUT armed whenever possible:

- Conditions:
  - OUT endpoint is `IDLE`
  - **Both** `rx_queue_` and `echo_queue_` are not full (`EmptySize() != 0`)
- When conditions are met, submit a receive buffer sized to `WIRE_MAX_SIZE` (maximum wire-frame length):
  - `TransferMultiBulk(rx_buf_, WIRE_MAX_SIZE)`

Design rationale:

- If either queue is full, OUT re-arming is temporarily stopped to avoid further accumulation inside the OUT callback that could cause overruns or drops.

---

## 8. Vendor Requests (control plane)

`GsUsbClass` does not implement standard Class Requests (`OnClassRequest()` returns `NOT_SUPPORT`). All control-plane operations are implemented via **Vendor Requests (gs_usb BREQ)**.

### 8.1 Device → Host (read)

| BREQ              | Returned struct                 | Description                                    |
| ----------------- | ------------------------------- | ---------------------------------------------- |
| `BT_CONST`        | `GsUsb::DeviceBTConst`          | classic bit-timing constants and feature bits  |
| `BT_CONST_EXT`    | `GsUsb::DeviceBTConstExtended`  | extended/FD constants (FD-only)                |
| `DEVICE_CONFIG`   | `GsUsb::DeviceConfig`           | device configuration (channel count, versions) |
| `TIMESTAMP`       | `uint32_t`                      | global timestamp (us, lower 32 bits)           |
| `GET_TERMINATION` | `GsUsb::DeviceTerminationState` | read termination state (per-channel)           |
| `GET_STATE`       | `GsUsb::DeviceState`            | read CAN error state/counters (per-channel)    |
| `GET_USER_ID`     | `uint32_t`                      | read USER_ID (from RAM or Database)            |

### 8.2 Host → Device (write, with DATA stage)

| BREQ              | Written struct                  | Description                                                                 |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `HOST_FORMAT`     | `GsUsb::HostConfig`             | host endianness negotiation (must pass before configuring bit timing, etc.) |
| `BITTIMING`       | `GsUsb::DeviceBitTiming`        | arbitration-phase bit timing (per-channel)                                  |
| `DATA_BITTIMING`  | `GsUsb::DeviceBitTiming`        | data-phase bit timing (FD-only)                                             |
| `MODE`            | `GsUsb::DeviceMode`             | START/RESET and mode flags (loopback/listen-only, etc.)                     |
| `BERR`            | `uint32_t`                      | error-frame reporting enable (per-channel)                                  |
| `IDENTIFY`        | `GsUsb::Identify`               | Identify GPIO control (if available)                                        |
| `SET_TERMINATION` | `GsUsb::DeviceTerminationState` | termination control (if available)                                          |
| `SET_USER_ID`     | `uint32_t`                      | write USER_ID (RAM or Database)                                             |

### 8.3 HOST_FORMAT constraint

- `HandleHostFormat()` treats the negotiation as passed when `cfg.byte_order == 0x0000beef`
- When `host_format_ok_ == false`:
  - Requests such as `BITTIMING` and `MODE` return `ARG_ERR`, forcing the host to complete format negotiation first

---

## 9. CAN configuration handling (BITTIMING / MODE, etc.)

### 9.1 `BITTIMING` (arbitration phase)

`HandleBitTiming(ch, bt)`:

- Validates: `host_format_ok_`, channel range, and `cans_[ch]` non-null
- Maps `DeviceBitTiming` into `LibXR::CAN::Configuration::bit_timing`
- Computes derived values:
  - `TSEG1 = prop_seg + phase_seg1`
  - `TSEG2 = phase_seg2`
  - `TQ_NUM = 1 + TSEG1 + TSEG2`
  - `bitrate = FCLK / (brp * TQ_NUM)` (set to 0 if divisor is 0)
  - `sample_point = (1 + TSEG1) / TQ_NUM`
- Applies: `cans_[ch]->SetConfig(cfg)`
- If FD is supported: copies the arbitration-phase configuration into `fd_config_[ch]`

### 9.2 `DATA_BITTIMING` (data phase, FD)

`HandleDataBitTiming(ch, bt)`:

- Only valid when `fd_supported_ && fdcans_[ch]`, otherwise returns `NOT_SUPPORT`
- Writes data-phase timing into `fd_config_[ch].data_timing`
- Computes `data_bitrate / data_sample_point`
- Applies: `fdcans_[ch]->SetConfig(fd_cfg)`

### 9.3 `MODE` (START/RESET + flags)

`HandleMode(ch, mode)`:

- `RESET`:
  - `can_enabled_[ch] = false`
  - `fd_enabled_[ch] = false`
- `START`:
  - `can_enabled_[ch] = true`
  - If FD is supported and the host sets the FD flag, then `fd_enabled_[ch] = true`

Mode flags mapped into `cfg.mode`:

- loopback / listen-only / triple-sampling / one-shot

Additional toggles:

- `timestamps_enabled_ch_[ch]` (hardware timestamp enable)
- `berr_enabled_[ch]` (error-frame reporting enable)

### 9.4 `BERR` (error-frame reporting enable)

`HandleBerr(ch, berr_on)`: updates `berr_enabled_[ch]` only.

### 9.5 `IDENTIFY` / `SET_TERMINATION`

- Identify: if `identify_gpio_` exists, writes ON/OFF to GPIO
- Termination: if `termination_gpio_[ch]` exists, writes GPIO and updates `term_state_[ch]`

### 9.6 `GET_STATE`

- Reads `cans_[ch]->GetErrorState()` to obtain:
  - bus off / error passive / error warning / active
  - rx/tx error counters
- Returns the state to the host as `GsUsb::DeviceState`

---

## 10. Error-frame mapping (SocketCAN semantics)

Classic CAN `Type::ERROR` frames are converted by `ErrorPackToHostErrorFrame()` into host-recognizable error frames:

- `can_id` sets `CAN_ERR_FLAG` and the appropriate `CAN_ERR_*` bits depending on error type
- `data[6]` / `data[7]` are filled with TX/RX error counters (saturated to 0..255)
- A report is generated only when:
  - `berr_enabled_[ch] == true`
  - `err_pack.id` is a LibXR-defined error ID

---

## 11. Timestamp behavior

- `MakeTimestampUs(ch)`:
  - Returns the lower 32 bits of `GetMicroseconds()` only when timestamps are enabled for the channel and `LibXR::Timebase::timebase != nullptr`
  - Otherwise returns 0
- The timestamp is appended as 4 bytes at the end of the wire frame (whether it is appended is controlled by `timestamps_enabled_ch_[ch]`)

---

## 12. Usage examples

### 12.1 Classic CAN (2 channels)

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

### 12.2 FDCAN (1 channel)

```cpp
using Dev = LibXR::USB::GsUsbClass<1>;

Dev gsusb({&fdcan1},
          /*in_ep*/LibXR::USB::Endpoint::EPNumber::EP_AUTO,
          /*out_ep*/LibXR::USB::Endpoint::EPNumber::EP_AUTO);
```

On the host side (Linux), the device is typically enumerated by the `gs_usb` driver as a SocketCAN interface (e.g., `can0`). You can then use `ip link set can0 up type can bitrate ...` or tools such as `cansend`/`candump` for transmission and reception.
