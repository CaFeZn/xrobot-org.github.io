---
id: device-coding
title: Device Drivers
sidebar_position: 5
---

# Device Drivers

This module summarizes LibXR's abstract interfaces for common hardware peripherals.

The common properties of these device interfaces are:

- **Platform Independent**: Abstract interfaces use unified naming and behavior, independent of low-level hardware registers or driver structures.
- **Asynchronous Operation Support**: The common operation model is based on `ReadPort` / `WritePort`, and fits interrupt- and DMA-driven implementations.
- **Type Safety**: Interface parameters and configuration structures use strong typing.
- **Minimal Dependencies**: Core modules rely only on C++17 features and basic LibXR components.
- **Flexible Extension**: Each peripheral can be implemented according to platform capabilities, including shared-resource cases such as shared buses.

## Contents

- [GPIO (General Purpose Input/Output)](./gpio.md)
- [UART (Serial Communication)](./uart.md)
- [I2C (I2C Bus)](./i2c.md)
- [SPI (SPI Interface)](./spi.md)
- [CAN / FDCAN (Controller Area Network)](./can.md)
- [ADC (Analog-to-Digital Conversion)](./adc.md)
- [DAC (Digital-to-Analog Conversion)](./dac.md)
- [PWM (Pulse-Width Modulation)](./pwm.md)
- [Flash (Flash Interface)](./flash.md)
- [Power (Power Management)](./power.md)
- [Timebase (Time Base)](./timebase.md)
- [Watchdog (Watchdog Timer)](./watchdog.md)
- [USB (Universal Serial Bus)](./usb.md)

## Interface structure

Each peripheral abstraction class typically includes:

- a `Configuration` structure
- a `SetConfig()` interface
- `Read()` / `Write()` data transfer interfaces
- `Enable()` / `Disable()` control interfaces, when applicable
- `Callback` registration for event handling, such as interrupts

Users do not need to care whether the backend is STM32UART, ESP32UART, or LinuxUART. Use the base class interface directly.
