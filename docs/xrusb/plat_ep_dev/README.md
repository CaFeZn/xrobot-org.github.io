---
id: xrusb-plat-dev
title: 平台相关实现
sidebar_position: 1
---

# 平台相关实现

本节介绍XRUSB在不同平台的实现原理与构造方式。对于使用不同的class，只需要在构造的最后传入指针即可。

例如：

```cpp
/* USB Classes */
LibXR::USB::CDCUart cdc_uart;
LibXR::USB::HIDKeyboard hid_keyboard;

static constexpr auto LANG_PACK =
    LibXR::USB::DescriptorStrings::MakeLanguagePack(
        /* Language Code */
        LibXR::USB::DescriptorStrings::Language::EN_US, 
        /* Manufacturer */
        "XRobot",
        /* Product */
        "XRUSB USB CDC Demo", 
        /* Serial Number */
        "123456789");


XXXUSBDevice usb(
    /* USB Hardware and Endpoints config */
    ..., 
    /* EP0 Packet Size */
    USB::DeviceDescriptor::PacketSize0::SIZE_8,
    /* Vendor ID */
    0x483,
    /* Product ID */
    0x5740,
    /* BcdDevice */
    0xF407,
    /* Language Pack */
    LANG_PACK,
    /* Classes */
    {{&cdc_uart, &hid_keyboard}});
```


