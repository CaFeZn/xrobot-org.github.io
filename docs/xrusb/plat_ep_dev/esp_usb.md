---
id: xrusb-plat-dev-esp
title: ESP32 USB 实现
sidebar_position: 3
---

# ESP32 USB 实现

ESP 平台当前有两条和 USB 相关的实现：

| 路径 | 对应芯片 | 类 | 说明 |
| ---- | -------- | --- | ---- |
| 原生 USB Device | `ESP32-S3` | `LibXR::ESP32USBDevice` | XRUSB 的平台设备实现 |
| USB Serial/JTAG | `ESP32-C3 / ESP32-C6` | `LibXR::ESP32CDCJtag` | UART 后端，不属于 XRUSB 通用 Device Core |

---

## ESP32-S3 原生 USB Device

`ESP32USBDevice` 是 `ESP32-S3` 上的 XRUSB 设备侧实现，代码位于：

- `driver/esp/esp_usb.hpp`
- `driver/esp/esp_usb_dev.hpp`
- `driver/esp/esp_usb_ep.hpp`

这条路径负责编排：

- 设备描述符与配置描述符
- 端点对象与端点池
- FIFO 分配
- DWC2 设备核初始化
- 中断分发与端点传输

当前实现特征：

- 仅在 `SOC_USB_OTG_SUPPORTED && CONFIG_IDF_TARGET_ESP32S3` 下编译
- 当前按 `USB 2.1 / Full-Speed Device` 方式构造
- `EP0` 必须存在
- 端点号按配置顺序从 `EP0` 递增

### 端点声明方式

`ESP32USBDevice::EPConfig` 支持两种声明方式：

1. `{buffer}`：声明一个双向端点
2. `{buffer, true/false}`：声明一个单向端点
   - `true`：IN
   - `false`：OUT

第一个配置项必须是 `EP0` 的缓冲区，后续项按顺序对应 `EP1`、`EP2`、`EP3`...

```cpp
LibXR::ESP32USBDevice usb_dev(
    {
        {ep0_buffer},
        {ep1_buffer},
        {ep2_in_buffer, true},
        {ep3_out_buffer, false},
    },
    LibXR::USB::DeviceDescriptor::PacketSize0::SIZE_64,
    0x1D50, 0x6199, 0x0100,
    {&LANG_PACK_EN_US},
    {{&cdc_uart}},
    {uid_addr, uid_size});
```

设备启动方式与其他平台一致：

```cpp
usb_dev.Init(false);
usb_dev.Start(false);
```

说明：

- `VID / PID / bcdDevice / Serial` 的选值规则仍按 [VID/PID 与 Serial 使用约定](/docs/xrusb/xrusb-id)
- 最后一个参数仍是可选 UID 字节数组，可用于构造设备序列号

---

## ESP32-C3 / ESP32-C6 USB Serial/JTAG

`ESP32CDCJtag` 位于 `driver/esp/esp_cdc_jtag.*`，它继承自 `LibXR::UART`，用于把芯片内置 `USB Serial/JTAG` 控制器包装成 UART 后端。

这条路径不属于 XRUSB 的通用设备控制器实现，因此不参与：

- `USB::DeviceCore`
- `EndpointPool`
- USB class 组合

构造函数：

```cpp
LibXR::ESP32CDCJtag usb_jtag_uart(
    1024,
    512,
    5,
    {115200, LibXR::UART::Parity::NO_PARITY, 8, 1});
```

当前限制：

- 仅在 `ESP32-C3 / ESP32-C6` 下编译
- 只接受 `8N1`
- 若 `CONFIG_ESP_CONSOLE_USB_SERIAL_JTAG=y`，会与 ESP-IDF 主控制台冲突

该实现本质上是 USB 相关的 UART 后端，不属于 `ESP32-S3` 这条 XRUSB 平台设备实现。
