---
id: xrusb-plat-dev-ch32
title: CH32 USB Implementation
sidebar_position: 2
---

# CH32 USB Implementation

CH32 provides three kinds of USB peripherals as shown below.

| Name                           | Role        | Bidirectional Endpoints            | Double Buffering       | DMA Support   |
| ------------------------------ | ----------- | ---------------------------------- | ---------------------- | ------------- |
| USB_DEVICE (not yet supported) | Device      | HW double buffer not bidirectional | Software/Hardware      | Not supported |
| USBHS                          | Host/Device | HW double buffer not bidirectional | Hardware double buffer | Supported     |
| USBFS                          | Host/Device | Bidirectional                      | Hardware double buffer | Supported     |

## USBFS

CH32 USBFS only supports declaring endpoints in the following way. For non-EP0 endpoints, a buffer size of 128 bytes is recommended:

1. `{{ep0_buffer}, ...}`: pass the buffers directly. Except for EP0, each entry will be split into IN/OUT buffers. Endpoint numbers auto-increment.

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

CH32 USBHS supports three endpoint declaration styles. For non-EP0 endpoints, a buffer size of 1024 bytes is recommended. Endpoint numbers auto-increment:

1. `{ep0_buffer_hs}`: pass the EP0 buffer directly.
2. `{ep1_buffer_tx_hs, true}`: pass the buffer and enable double buffering
   - ep1_buffer_tx_hs: buffer for the EP1 endpoint
   - true: whether this endpoint is configured as IN
3. `{ep2_buffer_rx_hs, ep2_buffer_tx_hs}`: pass buffers for a bidirectional endpoint without enabling double buffering

```cpp
LibXR::CH32USBDeviceHS usb_dev_hs(
    /* EP */
    {
        {ep0_buf_hs},
        {ep1_in_buf_hs, true},
        {ep2_out_buf_hs, false},
        {ep3_out_buf_hs, ep3_in_buf_hs}
    },
    /* vid pid bcd */
    0x1209, 0x0001, 0x0100,
    /* language */
    {&LANG_PACK_EN_US},
    /* config */
    {{&cdc2}});
```

