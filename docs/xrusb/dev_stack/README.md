---
id: xrusb-dev-stack
title: 设备协议栈
sidebar_position: 2
---

# 设备协议栈

本节介绍 XRUSB 当前提供的 USB Device Class：

- [CDC](./cdc.md)：虚拟串口与 CDC ↔ UART 适配
- [HID](./hid.md)：键盘、鼠标、手柄等 HID 设备
- [UAC](./uac.md)：UAC1 麦克风设备
- [GSUSB](./gsusb.md)：Linux SocketCAN 兼容设备类
- [DAPLinkV2](./dap.md)：CMSIS-DAP v2（Bulk）设备类
- [DFU Runtime](./dfu-runtime.md)：运行时 `DETACH` 与跳转 bootloader
- [DFU Bootloader](./dfu-bootloader.md)：独立 DFU bootloader 流程
