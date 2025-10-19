---
id: xrusb-plat-dev-ch32
title: CH32 USB 实现
sidebar_position: 2
---

# CH32 USB 实现

CH32一共有三种USB设备，如下所示。

| 名称                  | 角色      | 端点是否为双向       | 双缓冲        | DMA支持 |
| --------------------- | --------- | -------------------- | ------------- | ------- |
| USB_DEVICE (尚未支持) | 从机      | 硬件双缓冲不支持双向 | 软件/硬件实现 | 不支持  |
| USBHS                 | 主机/从机 | 硬件双缓冲不支持双向 | 硬件双缓冲    | 支持    |
| USBFS                 | 主机/从机 | 双向                 | 硬件双缓冲    | 支持    |

## USBFS

CH32 USBFS只支持这样声明端点，建议非EP0端点的缓冲区大小为128字节：

1. `{{ep0_buffer}, ...}`: 直接传入缓冲区即可，除了EP0都会被分割为IN/OUT缓冲区，端点号自动递增

```cpp
LibXR::CH32USBDeviceFS usb_dev(
    /* EP */
    {
        {ep0_buffer},
        {ep1_buffer},
        {ep2_buffer},
    },
    /* packet size */
    LibXR::USB::DeviceDescriptor::PacketSize0::SIZE_64,
    /* vid pid bcd */
    0x1209, 0x0001, 0x0100,
    /* language */
    {&LANG_PACK_EN_US},
    /* config */
    {{&cdc1}});
```

## USBHS

CH32 USBHS支持三种端点声明方式，非EP0端点的缓冲区大小推荐为1024字节，端点号自动递增：

1. `{ep0_buffer_hs}`: 直接传入EP0端点的缓冲区
1. `{ep1_buffer_tx_hs, true}`：传入缓冲区并开启双缓冲
   - ep1_buffer_tx_hs: EP1 端点的缓冲区
   - true: 是否配置为IN端点 
1. `{ep2_buffer_rx_hs, ep2_buffer_tx_hs}`：传入双向端点的缓冲区，不开启双缓冲

```cpp
LibXR::CH32USBDeviceHS usb_dev_hs(
    /* EP */
    {
        {ep0_buf_hs},                    // EP0
        {ep1_in_buf_hs, true},           // EP1 IN（单向，双缓冲）
        {ep2_out_buf_hs, false},         // EP2 OUT（单向，双缓冲）
        {ep3_out_buf_hs, ep3_in_buf_hs}  // EP3 双向（不启双缓冲）
    },
    /* vid pid bcd */
    0x1209, 0x0001, 0x0100,
    /* language */
    {&LANG_PACK_EN_US},
    /* config */
    {{&cdc2}});
```

