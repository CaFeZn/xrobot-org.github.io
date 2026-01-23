---
id: xrusb-dev-stack-daplinkv2
title: DAPLinkV2
sidebar_position: 5
---

# DAPLinkV2 Device Stack

This document describes XRUSB's **CMSIS-DAP v2 (Bulk)** device-class implementation: `LibXR::USB::DapLinkV2Class`.

The class targets mainstream CMSIS-DAP v2 host toolchains (e.g., pyOCD, OpenOCD’s CMSIS-DAP backend, DAPLink-compatible clients) using **USB Bulk transport**. It exposes **one vendor-specific interface with two Bulk endpoints (IN/OUT)**, implements a practical subset of CMSIS-DAP v2 commands (primarily SWD), and advertises **WinUSB (MS OS 2.0)** capabilities for plug-and-play access on Windows.

Supported features:

- **CMSIS-DAP v2 Bulk transport**
- **SWD-only** (`DAP_Connect` supports SWD only; JTAG is not implemented)
- **Optional nRESET control** (via injected `GPIO* nreset_gpio`; unsupported if null)
- **SWJ_Pins shadow semantics** (SWDIO/SWCLK are presented as shadow states; if nRESET is wired, the real level can be reported)
- **WinUSB (MS OS 2.0) BOS platform capability** (CompatibleID="WINUSB" + DeviceInterfaceGUIDs)
- **DAP_Transfer / DAP_TransferBlock** (includes AP posted-read pipeline; `DAP_Transfer` enforces match/timestamp constraints)

---

## 1. Class and Construction

### 1.1 `LibXR::USB::DapLinkV2Class`

Constructor:

```cpp
explicit DapLinkV2Class(
    LibXR::Debug::Swd& swd_link,
    LibXR::GPIO* nreset_gpio = nullptr,
    Endpoint::EPNumber data_in_ep_num  = Endpoint::EPNumber::EP_AUTO,
    Endpoint::EPNumber data_out_ep_num = Endpoint::EPNumber::EP_AUTO);
```

Parameters:

- `swd_link`: SWD backend provided by `LibXR::Debug::Swd` (SWD transactions, bit sequences, etc.).
- `nreset_gpio`: optional nRESET GPIO. If null, reset-related commands are handled best-effort (no physical reset line).
- `data_in_ep_num` / `data_out_ep_num`: Bulk IN/OUT endpoint numbers; `EP_AUTO` is supported.

### 1.2 Optional InfoStrings

You can override the default string set via `SetInfoStrings()` to affect `DAP_Info` replies:

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

Notes:

- `DAP_Info` string responses include the **trailing NUL**.
- If truncated due to capacity limits, the payload is still guaranteed to end with NUL.

---

## 2. USB Interface and Endpoints

### 2.1 Interface Descriptor

`DapLinkV2Class` contributes **one interface** and does not use IAD:

- `GetInterfaceCount()` returns `1`
- `HasIAD()` returns `false`

The interface class is fixed to `0xFF` (Vendor Specific) and exposes **two Bulk endpoints**.

### 2.2 Bulk Endpoints

- **Bulk OUT**: Host → Device (DAP request packet)
- **Bulk IN**: Device → Host (DAP response packet)

Endpoint configuration notes:

- `Configure(max_len = UINT16_MAX, double_buffer = false)`
  - `UINT16_MAX` is an upper bound only; the core selects a valid maximum packet size ≤ this value (endpoint implementation-dependent).
- `double_buffer = false` preserves strict request/response sequencing and, together with `tx_busy_`, prevents `tx_buf_` overwrite.

---

## 3. WinUSB (MS OS 2.0) Support

For driverless user-mode access on Windows, the class advertises an MS OS 2.0 platform capability in BOS and provides an MS OS 2.0 descriptor set:

- BOS Capability: MS OS 2.0 Platform Capability
- Vendor code: `0x20` (`WINUSB_VENDOR_CODE`)
- Compatible ID: `"WINUSB"`
- DeviceInterfaceGUIDs (REG_MULTI_SZ, UTF-16LE): `{CDB3B5AD-293B-4663-AA36-1AAE46463776}` (single GUID + double-NUL terminator)

The interface number is assigned at bind time (`start_itf_num`). Therefore, the MS OS 2.0 function subset field `bFirstInterface` is patched during `BindEndpoints()` to match the actual interface number, ensuring consistent Windows enumeration.

---

## 4. Transport Model (Bulk Request/Response)

The device follows a synchronous **CMSIS-DAP v2 over Bulk** request/response model:

1. Host sends one request to **Bulk OUT**.
2. Device parses the request and builds a response in the OUT completion callback.
3. Device sends the response via **Bulk IN**.
4. After IN completes, device arms OUT again for the next request.

---

## 5. Lifecycle: Bind / Unbind

### 5.1 `BindEndpoints(endpoint_pool, start_itf_num)`

Key steps:

1. Set `interface_num_ = start_itf_num` and patch WinUSB MS OS 2.0 function subset interface fields.
2. Allocate Bulk OUT and Bulk IN endpoints from `EndpointPool`.
3. Configure endpoints (BULK, `max_len=UINT16_MAX`, `double_buffer=false`).
4. Register endpoint callbacks:
   - OUT complete → `OnDataOutComplete()`
   - IN complete → `OnDataInComplete()`
5. Build and submit the configuration descriptor block (Interface + 2x Endpoint) via `SetData()`.
6. Reset runtime defaults:
   - Clear `dap_state_`, then set `debug_port=DISABLED`, `transfer_abort=false`
   - Set `swj_clock_hz_ = 1 MHz` and propagate to `swd_`
   - SWJ shadow defaults: SWDIO=1, nRESET=1, SWCLK=0 (see 6.3)
7. Set `inited_=true` and call `ArmOutTransferIfIdle()` to keep OUT armed.

### 5.2 `UnbindEndpoints(endpoint_pool)`

Key steps:

- Clear `inited_` and `tx_busy_`, set `dap_state_.debug_port = DISABLED`.
- Close and release IN/OUT endpoints back to `EndpointPool`.
- Call `swd_.Close()` to stop the SWD backend.
- Reset SWJ shadow defaults (SWDIO=1, nRESET=1, SWCLK=0).

---

## 6. Runtime State and Defaults

### 6.1 DAP State

`GetState()` returns `LibXR::USB::DapLinkV2Def::State`, including:

- `debug_port`: current port (default DISABLED; becomes SWD after CONNECT)
- `transfer_abort`: TransferAbort flag (set by `DAP_TransferAbort`; see 8.6)
- `transfer_cfg`: policy parsed from TransferConfigure (idle_cycles / retry_count / match_retry)

### 6.2 SWJ Clock

- Default: `1,000,000 Hz`
- `DAP_SWJ_Clock` updates `swj_clock_hz_` and calls `swd_.SetClockHz(hz)`

### 6.3 SWJ Shadow Semantics

This USB class does not bit-bang SWDIO/SWCLK directly; that is handled by `LibXR::Debug::Swd`. To maintain CMSIS-DAP compatibility, the class keeps an SWJ pin shadow:

- Defaults after bind: SWDIO=1, nRESET=1, SWCLK=0
- `DAP_SWJ_Pins` updates shadow values for SWDIO/SWCLK even if the pins are not physically driven here
- For nRESET: if `nreset_gpio_` exists, the GPIO is driven and reads return the real level; otherwise shadow is used

---

## 7. Host → Device Data Path (Bulk OUT)

### 7.1 OUT Completion Callback: `OnDataOutComplete()`

High-level flow:

1. Validate `inited_` and endpoint pointers.
2. If `tx_busy_ == true`, return early as a safety guard.
3. Read OUT data:
   - Empty packet / null pointer → re-arm OUT immediately.
   - Otherwise call `ProcessOneCommand(req, req_len, tx_buf_, MAX_RESP, out_len)` to build a response.
4. Set `tx_busy_ = true` and send the response on IN via `TransferMultiBulk(tx_buf_[0..out_len))`.
5. If IN submission fails, clear `tx_busy_` and re-arm OUT.

### 7.2 Keeping OUT Armed: `ArmOutTransferIfIdle()`

To keep requests flowing, OUT is armed when:

- `inited_ == true`
- `tx_busy_ == false`
- OUT endpoint state is `IDLE`

When conditions are met, the device posts a receive buffer: `TransferMultiBulk(rx_buf_, MAX_REQ)`.

---

## 8. Command Set (Overview)

`ProcessOneCommand()` dispatches by the first request byte `CMD` (command ID). Unknown commands return a single byte `0xFF`.

### 8.1 Implemented Commands

| Command                 |                   ID | Summary                                                                                          |
| ----------------------- | -------------------: | ------------------------------------------------------------------------------------------------ |
| `DAP_Info`              |               `INFO` | Returns strings/numerics (including PACKET_SIZE / TIMESTAMP_CLOCK, etc.)                         |
| `DAP_HostStatus`        |        `HOST_STATUS` | Returns OK (simplified)                                                                          |
| `DAP_Connect`           |            `CONNECT` | SWD only; enters SWD and returns SWD port on success                                             |
| `DAP_Disconnect`        |         `DISCONNECT` | Closes SWD backend and returns to DISABLED                                                       |
| `DAP_TransferConfigure` | `TRANSFER_CONFIGURE` | Sets idle_cycles/retry policy and maps to SWD policy                                             |
| `DAP_Transfer`          |           `TRANSFER` | DP/AP R/W, match, timestamp constraints, AP posted-read pipeline                                 |
| `DAP_TransferBlock`     |     `TRANSFER_BLOCK` | DP/AP block R/W; AP read posted pipeline; no match/timestamp                                     |
| `DAP_TransferAbort`     |     `TRANSFER_ABORT` | Sets abort flag; next Transfer/Block errors and clears the flag                                  |
| `DAP_WriteABORT`        |        `WRITE_ABORT` | Writes ABORT via SWD backend; OK/ERROR based on ACK                                              |
| `DAP_Delay`             |              `DELAY` | Microsecond delay (Timebase)                                                                     |
| `DAP_ResetTarget`       |       `RESET_TARGET` | If nRESET is present, pulse reset and set Execute=1; else Execute=0 while still returning DAP_OK |
| `DAP_SWJ_Pins`          |           `SWJ_PINS` | Updates shadow and best-effort controls nRESET; supports PinWait polling                         |
| `DAP_SWJ_Clock`         |          `SWJ_CLOCK` | Updates SWJ clock and propagates to SWD backend                                                  |
| `DAP_SWJ_Sequence`      |       `SWJ_SEQUENCE` | Writes SWJ sequence (LSB-first), updates shadow (SWDIO=last bit, SWCLK=0)                        |
| `DAP_SWD_Configure`     |      `SWD_CONFIGURE` | Best-effort parsing; always returns OK                                                           |
| `DAP_SWD_Sequence`      |       `SWD_SEQUENCE` | Multi-segment I/O; input data appended to response (LSB-first)                                   |
| `DAP_QueueCommands`     |     `QUEUE_COMMANDS` | Always returns DAP_ERROR (not implemented)                                                       |
| `DAP_ExecuteCommands`   |   `EXECUTE_COMMANDS` | Always returns DAP_ERROR (not implemented)                                                       |

Note: the exact numeric IDs come from `DapLinkV2Def::CommandId`. This document uses enum names for readability.

---

## 9. Error and Compatibility Conventions

- Unknown commands return `0xFF` (single-byte unknown command response).
- For some operations, the device returns a well-formed response packet (transport-level OK) while encoding failure via status bytes (semantic ERROR), preventing host desynchronization due to malformed/short responses.
- `QUEUE_COMMANDS` / `EXECUTE_COMMANDS` are not implemented and always return `DAP_ERROR`.
- `SWD_CONFIGURE` is best-effort and always returns OK to maintain host compatibility.

---

## 10. Usage Examples

### 10.1 Device-side Initialization (Illustrative)

```cpp
#include "daplink_v2.hpp"
#include "usb/device.hpp"
#include "debug/swd.hpp"

// This is a base-class example; in practice you may use a derived implementation.
LibXR::Debug::Swd swd(/* ... init ... */);
LibXR::GPIO nreset(/* ... optional ... */);

LibXR::USB::DapLinkV2Class dap(swd, &nreset);

// Optional: override DAP_Info strings
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

### 10.2 Windows/WinUSB Access

Because the device advertises WinUSB and DeviceInterfaceGUIDs via BOS/MS OS 2.0 descriptor sets, Windows typically enumerates it as a WinUSB device without requiring a custom INF. Applications can enumerate and open the interface using the published GUID.

---

## 11. SWD Implementation

### 11.1 SwdGeneralGPIO

`SwdGeneralGPIO` uses two standard GPIOs as SWDIO and SWCLK to implement a generic SWD transport, without requiring any special peripheral configuration. It is recommended to place a 33 Ω series resistor on each I/O and add a 10 kΩ pull-up on SWDIO.
