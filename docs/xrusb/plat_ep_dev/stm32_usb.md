---
id: xrusb-plat-dev-stm32
title: STM32 USB 实现
sidebar_position: 1
---

# STM32 USB 实现

STM32一共有四种USB设备，如下所示。可以参考代码生成工具自动生成的CDC代码，了解USB设备的端点配置。

| 名称          | 角色      | 端点是否为双向       | 双缓冲        | DMA支持 |
| ------------- | --------- | -------------------- | ------------- | ------- |
| USB_DEVICE_FS | 从机      | 硬件双缓冲不支持双向 | 软件/硬件实现 | 不支持  |
| USB_DRV_FS    | 主机/从机 | 硬件双缓冲不支持双向 | 软件/硬件实现 | 不支持  |
| USB_OTG_FS    | 主机/从机 | 双向                 | 支持          | 不支持  |
| USB_OTG_HS    | 主机/从机 | 双向                 | 支持          | 支持    |

## USB_DEVICE_FS/USB_DRV_FS

支持两种端点的声明方式，缓冲区端点号自动递增：

1. `{usb_fs_ep0_in_buf, usb_fs_ep0_out_buf, 8, 8}`：声明一个双向端点，无法使用硬件双缓冲
    - usb_fs_ep0_in_buf: EP0 IN软件缓冲区数组
    - usb_fs_ep0_out_buf: EP0 OUT软件缓冲区大小
    - 8: EP0 IN硬件RAM大小
    - 8: EP0 OUT硬件RAM大小
2. `{usb_fs_ep2_in_buf, 16, true}`：声明一个单向端点，使用硬件双缓冲
    - usb_fs_ep2_in_buf: EP2 IN软件缓冲区数组
    - 16: EP2 IN硬件RAM大小

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
    0x483, 0x5740, 0xF407,
    {&USB_FS_LANG_PACK},
    {{&usb_fs_cdc}}
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
    0x483, 0x5740, 0xF407,
    {&USB_OTG_FS_LANG_PACK},
    {{&usb_otg_fs_cdc}}
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


