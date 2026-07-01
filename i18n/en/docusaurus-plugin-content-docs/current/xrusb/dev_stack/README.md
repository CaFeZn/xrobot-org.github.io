---
id: xrusb-dev-stack
title: Device Stack
sidebar_position: 2
---

# Device Stack

This section covers the USB device classes currently exposed by XRUSB:

- [CDC](/docs/xrusb/dev_stack/xrusb-dev-stack-cdc): virtual serial ports and CDC ↔ UART adaptation
- [HID](/docs/xrusb/dev_stack/xrusb-dev-stack-hid): keyboards, mice, gamepads, and other HID devices
- [UAC](/docs/xrusb/dev_stack/xrusb-dev-stack-uac): UAC1 microphone device path
- [GSUSB](/docs/xrusb/dev_stack/xrusb-dev-stack-gsusb): Linux SocketCAN-compatible device class
- [DAPLinkV1](/docs/xrusb/dev_stack/xrusb-dev-stack-daplinkv1): CMSIS-DAP v1 (HID) device class
- [DAPLinkV2](/docs/xrusb/dev_stack/xrusb-dev-stack-daplinkv2): CMSIS-DAP v2 (Bulk) device class
- [DFU Runtime](/docs/xrusb/dev_stack/xrusb-dev-stack-dfu-runtime): runtime `DETACH` handling and bootloader jump path
- [DFU Bootloader](/docs/xrusb/dev_stack/xrusb-dev-stack-dfu-bootloader): standalone DFU bootloader flow
