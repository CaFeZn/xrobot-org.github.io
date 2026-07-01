---
id: xrusb-plat-dev-stm32
title: STM32 USB 实现
sidebar_position: 1
---

# STM32 USB 实现

STM32一共有四种USB设备，如下所示。可以参考代码生成工具自动生成的CDC代码，了解USB设备的端点配置。  
在 STM32 平台上，**设备序列号建议使用芯片内置 UID（Unique ID），在构造函数最后以十六进制数组形式传入。**

| 当前主线路径 | 对应类 | 角色 | 说明 |
| ------------ | ------ | ---- | ---- |
| `USB_BASE / FSDEV` | `LibXR::STM32USBDeviceDevFs` | 从机 | FSDEV / DRD FS 的设备侧路径 |
| `USB_OTG_FS` | `LibXR::STM32USBDeviceOtgFS` | 主机/从机中的设备侧 | OTG FS 设备路径 |
| `USB_OTG_HS` | `LibXR::STM32USBDeviceOtgHS` | 主机/从机中的设备侧 | OTG HS 设备路径 |

由于STM32的USB_DEVICE_FS不支持DMA，所以硬件双缓冲的加速作用并不高于LibXR的软件双缓冲区。而且会大量占用宝贵的PMA内存，不推荐使用硬件双缓冲。

## `STM32USBDeviceDevFs`

`STM32USBDeviceDevFs` 支持两种端点声明方式，缓冲区端点号自动递增：

1. `{usb_fs_ep0_in_buf, usb_fs_ep0_out_buf, 8, 8}`：声明一个双向端点，无法使用硬件双缓冲
    - usb_fs_ep0_in_buf: EP0 IN软件缓冲区数组
    - usb_fs_ep0_out_buf: EP0 OUT软件缓冲区大小
    - 8: EP0 IN硬件RAM大小
    - 8: EP0 OUT硬件RAM大小
2. `{usb_fs_ep2_in_buf, 16, true}`：声明一个单向端点 ~~使用硬件双缓冲~~
    - usb_fs_ep2_in_buf: EP2 IN软件缓冲区数组
    - 16: EP2 IN硬件RAM大小
    - bool: 是in方向

为了确保传输速度，对于bulk端点，硬件RAM大小应当不小于64，软件缓冲区可以远大于64，大小与传输速度成正比。

```cpp
STM32USBDeviceDevFs usb_fs(
    /* USB Handler */
    &hpcd_USB_FS,
    /* Endpoints */
    {
        {usb_fs_ep0_in_buf, usb_fs_ep0_out_buf, 8, 8},
        {usb_fs_ep1_in_buf, usb_fs_ep1_out_buf, 128, 128},
        {usb_fs_ep2_in_buf, 16, true}
    },
    USB::DeviceDescriptor::PacketSize0::SIZE_8,
    0x1D50, 0x6199, 0x0100,
    /* 语言包（内部包含可读 Serial Number 字符串前缀） */
    {&USB_FS_LANG_PACK},
    /* Classes */
    {{&usb_fs_cdc}},
    /* Serial Number UID（从 STM32 UID 读取的十六进制字节数组） */
    {reinterpret_cast<void *>(UID_BASE), 12}
);
```

## USB_OTG_FS/USB_OTG_HS

STM32USBDeviceOtgHS和STM32USBDeviceOtgFS同样支持两种端点声明方式，IN/OUT端点缓冲区端点号各自自动递增：

1. `{{usb_otg_fs_ep0_in_buf, 8},...}`：in端点必须声明缓冲区与Fifo大小
2. `{usb_otg_fs_ep0_out_buf, ...}`：out端点只需要声明缓冲区

所有out端点共用一个rx fifo，应该分配较大的空间。为了保证速度，IN端点Fifo的大小不应小于包大小，软件缓冲区大小与传输速度成正比。

```cpp
// STM32USBDeviceOtgHS usb_hs(
STM32USBDeviceOtgFS usb_fs(
    /* USB Handler */
    &hpcd_USB_OTG_FS,
    /* RX Fifo Size */
    256,
    /* Out Endpoints */
    {usb_otg_fs_ep0_out_buf, usb_otg_fs_ep1_out_buf},
    /* In Endpoints */
    {{usb_otg_fs_ep0_in_buf, 8}, {usb_otg_fs_ep1_in_buf, 128}, {usb_otg_fs_ep2_in_buf, 16}},
    USB::DeviceDescriptor::PacketSize0::SIZE_8,
    0x1D50, 0x6199, 0x0100,
    /* 语言包（内部包含可读 Serial Number 字符串前缀） */
    {&USB_OTG_FS_LANG_PACK},
    /* Classes */
    {{&usb_otg_fs_cdc}},
    /* Serial Number UID（从 STM32 UID 读取的十六进制字节数组） */
    {reinterpret_cast<void *>(UID_BASE), 12}
);
usb_fs.Init();
usb_fs.Start();
```

## 运行

添加以下语句即可。

```cpp
usb_fs.Init();
usb_fs.Start();
```
