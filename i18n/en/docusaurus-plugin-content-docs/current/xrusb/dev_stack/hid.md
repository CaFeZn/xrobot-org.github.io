---
id: xrusb-dev-stack-hid
title: HID
sidebar_position: 2
---

# HID Device Stack

This section documents XRUSB’s **USB HID (Human Interface Device)** device-class implementation and extension model, focusing on:

- The templated HID base class (`LibXR::USB::HID`) and automatic descriptor generation
- Optional **Interrupt OUT endpoint** support (Output Report over Interrupt OUT)
- Standard `GET_DESCRIPTOR` handling for HID / Report descriptors
- HID class requests (`GET_REPORT/SET_REPORT/GET_IDLE/SET_IDLE/GET_PROTOCOL/SET_PROTOCOL`) and the control-transfer data stage
- Input Report transmission (Interrupt IN) and transfer-complete callbacks
- Reference derived classes: mouse (`HIDMouse`), keyboard (`HIDKeyboard`), and gamepad (`HIDGamepadT`)

---

## Component Overview

### `LibXR::USB::HID<REPORT_DESC_LEN, TX_REPORT_LEN, RX_REPORT_LEN>`

`HID` is a templated HID base class (inherits from `DeviceClass`). It fixes report/descriptor sizing at compile time via template parameters, making it straightforward to implement keyboards, mice, gamepads, and similar devices:

- `REPORT_DESC_LEN`: Report Descriptor length (bytes)
- `TX_REPORT_LEN`: maximum Input Report length (Interrupt IN `wMaxPacketSize`)
- `RX_REPORT_LEN`: Output Report length (Interrupt OUT `wMaxPacketSize`), default `0` (unused)

The base class provides:

- Endpoint allocation and configuration (Interrupt IN; optional Interrupt OUT)
- Automatic generation of a configuration-descriptor block containing:
  - Interface Descriptor
  - HID Descriptor (0x21)
  - Endpoint Descriptor(s)
- Standard `GET_DESCRIPTOR` support for HID (0x21) and Report (0x22) descriptors
- A framework for HID class requests and the control-transfer data stage (override in derived classes)
- An Input Report helper `SendInputReport()` (copies into the endpoint buffer and starts the transfer)
- Transfer-complete hooks for both directions (`OnDataInComplete` / `OnDataOutComplete`)

---

## Descriptors and Endpoint Layout

### Interface

`HID` is a single-interface device class:

- `GetInterfaceNum()` returns `1`
- `HasIAD()` returns `false`
- `bInterfaceClass = 0x03` (HID)
- `bNumEndpoints = 1` (IN only) or `2` (IN + OUT)

> Note: The current base implementation fills `bInterfaceSubClass` and `bInterfaceProtocol` as `0`.  
> For strict **HID Boot Keyboard/Mouse** behavior, the interface descriptor is typically set as:
>
> - Boot Keyboard: `bInterfaceSubClass=1`, `bInterfaceProtocol=1`
> - Boot Mouse: `bInterfaceSubClass=1`, `bInterfaceProtocol=2`
>
> You can customize this either by adjusting the base class descriptor population or by providing an upper-layer wrapper that modifies the interface descriptor fields.

### HID Descriptor (0x21)

The base class generates a 9-byte HID class descriptor with key fields:

- `bcdHID = 0x0111` (HID v1.11)
- `bNumDescriptors = 1`
- `bReportDescriptorType = 0x22`
- `wReportDescriptorLength = REPORT_DESC_LEN`

### Endpoints

During `BindEndpoints()`, the base class acquires endpoints from `EndpointPool` and configures them:

| Endpoint                | Direction | Type      | `wMaxPacketSize` | Purpose                     |
| ----------------------- | --------- | --------- | ---------------: | --------------------------- |
| IN endpoint             | IN        | INTERRUPT |  `TX_REPORT_LEN` | Device → host Input Report  |
| OUT endpoint (optional) | OUT       | INTERRUPT |  `RX_REPORT_LEN` | Host → device Output Report |

Polling intervals:

- `in_ep_interval_`: written into IN endpoint descriptor `bInterval`
- `out_ep_interval_`: written into OUT endpoint descriptor `bInterval`

> Note: `bInterval` semantics vary by speed (FS frame-based vs HS microframe encoding).  
> This stack treats the parameter as “milliseconds”, and the final behavior depends on the underlying controller/stack interpretation.

---

## Initialization and Resource Release

### Init (`HID::BindEndpoints(endpoint_pool, start_itf_num)`)

Key steps:

1. Record `itf_num_ = start_itf_num`, clear endpoint pointers, and reset `inited_`
2. Acquire Interrupt IN endpoint from `EndpointPool` and `Configure({IN, INTERRUPT, TX_REPORT_LEN})`
3. If enabled, acquire Interrupt OUT endpoint and `Configure({OUT, INTERRUPT, RX_REPORT_LEN})`
4. Populate the configuration-descriptor block:
   - Interface Descriptor
   - HID Descriptor (0x21)
   - Endpoint IN Descriptor
   - (optional) Endpoint OUT Descriptor
5. Publish the descriptor block via `SetData(RawData{...})` for the device framework to stitch into the Configuration Descriptor
6. Register transfer-complete callbacks:
   - `ep_in_->SetOnTransferCompleteCallback(on_data_in_complete_cb_)`
   - (optional) `ep_out_->SetOnTransferCompleteCallback(on_data_out_complete_cb_)`
7. If OUT is enabled, start the first OUT receive: `ep_out_->Transfer(RX_REPORT_LEN)` (then re-armed automatically)
8. Set `inited_ = true`

### Deinit (`HID::UnbindEndpoints(endpoint_pool)`)

- Set `inited_ = false`
- Close and release IN/OUT endpoints back to `EndpointPool`
- Null out endpoint pointers

---

## Standard Request: GET_DESCRIPTOR (HID / Report)

`HID` overrides `OnGetDescriptor()` to handle standard `GET_DESCRIPTOR`:

- If `(wValue >> 8) == 0x21`: return HID Descriptor (`GetHIDDesc()`)
- If `(wValue >> 8) == 0x22`: return Report Descriptor (`GetReportDesc()`)
- Other types (e.g., Physical 0x23): return `ErrorCode::NOT_SUPPORT`

Returned data is truncated to `wLength`.

Derived classes must implement:

```cpp
virtual ConstRawData GetReportDesc() = 0;
```

to provide the Report Descriptor pointer and length.

---

## HID Class Requests and Control-Transfer Data Stage

The base class implements common HID class requests in `OnClassRequest()`:

- `GET_REPORT`: uses the high byte of `wValue` to select `INPUT/OUTPUT/FEATURE`, then calls:
  - `OnGetInputReport(report_id, result)`
  - `OnGetLastOutputReport(report_id, result)`
  - `OnGetFeatureReport(report_id, result)`
- `SET_REPORT`: checks `wLength != 0`, then delegates to:
  - `OnSetReport(report_id, result)` (typically sets `result.read_data` to accept data in the control transfer)
  - the actual payload is delivered in `OnClassData()` and finalized by `OnSetReportData(in_isr, data)`
- `GET_IDLE / SET_IDLE`: maintains a single `idle_rate_` (units of 4 ms); current implementation only supports `report_id=0`
- `GET_PROTOCOL / SET_PROTOCOL`: maintains `protocol_` (BOOT / REPORT)

Override points for device-specific logic:

- Report retrieval:
  - `OnGetInputReport()` / `OnGetLastOutputReport()` / `OnGetFeatureReport()`
- Report setting:
  - `OnSetReport()` (setup stage)
  - `OnSetReportData()` (data stage)
- Custom extensions:
  - `OnCustomClassRequest()` / `OnCustomClassData()`

---

## Data Path: IN/OUT Endpoints and Completion Callbacks

### Sending an Input Report: `SendInputReport()`

`SendInputReport(ConstRawData report)` sends an Interrupt IN report to the host:

1. Validate initialized state and IN endpoint presence
2. Validate `report.addr_` and `0 < report.size_ <= TX_REPORT_LEN`
3. Ensure the IN endpoint state is `IDLE`; otherwise return `ErrorCode::BUSY`
4. Copy `report` into the endpoint buffer (`ep_in_->GetBuffer()`)
5. Start the transfer via `ep_in_->Transfer(report.size_)`

Common return codes (subject to stack definitions):

- `OK`: transfer started successfully
- `BUSY`: endpoint is still transmitting
- `ARG_ERR`: invalid report size
- `NO_BUFF`: endpoint buffer insufficient
- `FAILED`: not initialized or endpoint invalid

### Receiving Output Reports (optional): automatic re-arm

If the OUT endpoint is enabled, the default behavior is:

- After `BindEndpoints()`, `ep_out_->Transfer(RX_REPORT_LEN)` arms the OUT endpoint
- Each OUT completion triggers `OnDataOutCompleteStatic()`:
  1. Calls the virtual `OnDataOutComplete(in_isr, data)`
  2. Immediately re-arms via `ep_out_->Transfer(RX_REPORT_LEN)` (continuous reception)

Override:

```cpp
virtual void OnDataOutComplete(bool in_isr, LibXR::ConstRawData& data);
```

to process Output Reports (e.g., keyboard LEDs).

### IN transfer-complete hook

When an IN transfer completes, the stack calls:

```cpp
virtual void OnDataInComplete(bool in_isr, LibXR::ConstRawData& data);
```

Typical uses:

- Dequeue/dispatch the next report in a software TX queue
- Throughput accounting and link monitoring

---

## Reference Derived Classes

### `HIDMouse`: Standard Boot Mouse

- Report Descriptor: standard Boot Mouse
- Input Report length: 4 bytes (Buttons + X + Y + Wheel)
- IN-only, default `bInterval=1 ms`

Key APIs:

```cpp
void Move(uint8_t buttons, int8_t x, int8_t y, int8_t wheel = 0);
void Release();
```

`Move()` builds a report and calls `SendInputReport()`.

### `HIDKeyboard`: Standard Boot Keyboard (with LEDs)

- Report Descriptor: standard Boot Keyboard
- Input Report length: 8 bytes (Modifier + Reserved + 6 KeyCodes)
- Optional OUT endpoint (`RX_REPORT_LEN=1`) for LED state
- Implements the `SET_REPORT` control-transfer path (compatible with hosts that deliver LEDs via control endpoint)

Key APIs:

- Send keys:

```cpp
void PressKey(std::initializer_list<KeyCode> keys, uint8_t mods = Modifier::NONE);
void ReleaseAll();
```

- Read LED state (bitwise):

```cpp
bool GetNumLock();
bool GetCapsLock();
bool GetScrollLock();
```

- LED change callback:

```cpp
void SetOnLedChangeCallback(LibXR::Callback<bool, bool, bool> cb);
```

Callback parameters are `(NumLock, CapsLock, ScrollLock)` and may be triggered by either OUT endpoint reception or the `SET_REPORT` data stage.

### `HIDGamepadT`: Templated 4-Axis + 8-Button Gamepad

- Input Report is fixed to 9 bytes: `4 × int16 axis + 1 × uint8 buttons`
- Report Descriptor is a compile-time constant of 50 bytes
- Logical range is templated:
  - `LOG_MIN` / `LOG_MAX` (default `0..2047`)
- Convenience sending APIs:

```cpp
ErrorCode Send(int x, int y, int z, int rx, uint8_t buttons);
ErrorCode SendButtons(uint8_t buttons);
ErrorCode SendAxes(int x, int y, int z, int rx);
```

Provided aliases:

- `HIDGamepad`: `0..2047`
- `HIDGamepadBipolar`: `-2048..2047`

---

## Usage Examples

> Note: The exact mechanism to register class instances depends on your upper-layer `usb_dev` implementation. The examples below show construction and typical APIs.

### Mouse

```cpp
#include "hid_mouse.hpp"  // adjust to your actual header

LibXR::USB::HIDMouse hid_mouse;

// usb_dev class list: {{&hid_mouse}}
// usb_dev.Init();
// usb_dev.Start();

hid_mouse.Move(LibXR::USB::HIDMouse::LEFT, 10, 0);  // move right
hid_mouse.Release();
```

### Keyboard (with LED callback)

```cpp
#include "hid_keyboard.hpp"  // adjust to your actual header

LibXR::USB::HIDKeyboard hid_kbd(true);  // enable_out_endpoint=true

hid_kbd.SetOnLedChangeCallback(
  LibXR::Callback<bool, bool, bool>(
    [](bool in_isr, bool num, bool caps, bool scroll) {
      (void)in_isr;
      // Update on-board LEDs based on num/caps/scroll
    }
  )
);

// Send: Shift + A
hid_kbd.PressKey({LibXR::USB::HIDKeyboard::KeyCode::A},
                 LibXR::USB::HIDKeyboard::Modifier::LEFT_SHIFT);
hid_kbd.ReleaseAll();
```

### Gamepad

```cpp
#include "hid_gamepad.hpp"  // adjust to your actual header

LibXR::USB::HIDGamepad gamepad;

gamepad.Send(1024, 1024, 1024, 1024, LibXR::USB::HIDGamepad::BTN1);
```

---

## Extension Guidelines (Derived-Class Checklist)

When implementing a new HID device, you typically do the following:

1. **Provide a Report Descriptor** by overriding `GetReportDesc()`
2. **Define your Input Report** so it does not exceed `TX_REPORT_LEN`
3. (Optional) Implement Output/Feature handling:
   - If using **control transfers**: override `OnSetReport()` / `OnSetReportData()`
   - If using an **Interrupt OUT endpoint**: construct with `enable_out_endpoint=true` and override `OnDataOutComplete()`

If you need continuous transmission (TX queue), implement “send next report” scheduling in `OnDataInComplete()`.
