---
id: xrusb
title: XRUSB Stack
sidebar_position: 9
---

# XRUSB

XRUSB is the USB device stack inside LibXR. It is built from platform-side USB device/endpoint implementations plus upper-layer USB device classes, and it is mainly oriented toward device-side development.

## Main Characteristics

- modern C++ implementation
- lock-free data structures where appropriate
- double-buffer and DMA-oriented transfer paths
- dynamic endpoint allocation
- one-shot construction-time memory allocation
- interrupt-driven and ISR-safe design

## Supported Device Classes

| Protocol | Status | Notes |
|------|--------|------|
| CDC-ACM | supported | exposed as LibXR UART adapters |
| HID | supported | keyboard / mouse / gamepad paths are ready to use; other HID types should derive their own class |
| UAC | supported | current mainline primarily documents a UAC1 microphone path |
| GSUSB | supported (CAN/FDCAN) | oriented toward Linux SocketCAN |
| DAPLinkV1 | supported (SWD only) | oriented toward CMSIS-DAP v1 HID host tooling |
| DFU Runtime | supported | handles runtime `DETACH` and deferred jump to bootloader |
| DFU Bootloader | supported | supports `DNLOAD / UPLOAD / GETSTATUS / ABORT / CLRSTATUS / manifest` flows |
| DAPLinkV2 | supported (SWD only) | oriented toward CMSIS-DAP v2 bulk host tooling |

## BOS / Platform Capability Support

| Capability | Status | Notes |
|------|--------|------|
| WebUSB | supported | mainly used by DFU runtime / bootloader paths |
| WinUSB MS OS 2.0 | supported | used by DAPLinkV2 and current DFU runtime / bootloader paths on Windows |

Additional notes:

- This table describes capability surfaces that can already be confirmed from current mainline device-class or BOS-related code.
- Whether a specific BOS capability is actually published by a device instance still depends on constructor choices such as WebUSB landing-page parameters or the selected/default WinUSB metadata scope.

## Platform Support

| Platform | Current mainline device class / controller path | Status | Tested hardware |
|------|-----------------------------------------------|--------|----------------|
| STM32 | `STM32USBDeviceDevFs` / FSDEV | supported | STM32F103 / STM32G431 |
| STM32 | `STM32USBDeviceOtgFS` / `USB_OTG_FS` | supported (Device) | STM32F401 / STM32F407 |
| STM32 | `STM32USBDeviceOtgHS` / `USB_OTG_HS` | supported (Device) | STM32F407 / STM32H750 |
| ESP32-S3 | `ESP32USBDevice` / `USB_OTG_FS` | supported (Device) | ESP32-S3 |
| CH32 | `CH32USBDeviceFS` / `USB_DEVICE_FS` | supported | CH32V203 |
| CH32 | `CH32USBOtgFS` / `USBFS` | supported (Device) | CH32V307 / CH32V203 / CH32V208 |
| CH32 | `CH32USBOtgHS` / `USBHS` | supported (Device) | CH32V305 / CH32V307 |

## Contents

- [Platform-specific implementation](/docs/xrusb/plat_ep_dev)
- [Device classes](/docs/xrusb/dev_stack)
- [VID/PID and serial usage conventions](/docs/xrusb/xrusb-id)

## Notes

- the platform-specific pages focus on how USB device and endpoint implementations are realized on different MCU / SoC targets;
- the device-class pages focus on the behavior and interfaces of each USB device class;
- the `VID/PID` page covers the default XRUSB conventions, not every special identification strategy such as CMSIS-DAP compatibility choices.
- the current documentation covers device-side paths only; the host side still does not have a stable public stack surface in current mainline that should be expanded into parallel host-stack pages.
