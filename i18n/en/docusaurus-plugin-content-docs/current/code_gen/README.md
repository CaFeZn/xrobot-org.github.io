---
id: code-gen
title: Code Generation
sidebar_position: 5
---

# Code Generation

The core purpose of CodeGenerator is to generate LibXR-side initialization and integration code from SDK or project description files. A typical example is reading STM32CubeMX IOC files and generating matching C++ peripheral initialization code plus a `libxr_config.yaml` configuration skeleton.

This chapter mainly explains:

- how the generator recognizes project inputs;
- how YAML configuration affects generated output;
- which parameters and constraints matter during generation for different peripherals / platforms;
- how the generated skeleton is integrated back into the project.

It does not attempt to document the full runtime API semantics. For runtime behavior, return to `basic_coding` and the corresponding platform pages.

## Current coverage

- [STM32 Code Generation](./stm32/README.md)
- [XRobot Integration Code Generation](./xrobot_inter.md)

The `STM32` directory currently covers generation topics such as GPIO, UART, SPI, I2C, ADC, DAC, CAN, PWM, Flash, Cache, Watchdog, and Timebase.
