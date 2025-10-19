---
id: xrusb-plat-dev
title: Platform-Specific Implementations
sidebar_position: 1
---

# Platform-Specific Implementations

This section describes XRUSB’s implementation principles and construction patterns across different platforms. To use different classes, simply pass pointers to them at the end of the constructor.

Example:

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


