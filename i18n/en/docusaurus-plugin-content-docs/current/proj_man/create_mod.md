---
id: proj-man-create-mod
title: Quickly Create a Module
sidebar_position: 3
---

XRobot provides a convenient tool `xrobot_create_mod` to quickly generate a new module from a template. This allows developers to start module development without manually setting up the repository or header files.

## Usage

```bash
$ xrobot_create_mod MySensor --desc "IMU interface module" --hw imu scl sda
[OK] Module MySensor generated at Modules/MySensor
```

Use `xrobot_mod_parser` to inspect module information:

```bash
$ xrobot_mod_parser --path ./Modules/MySensor/

=== Module: MySensor ===
Description       : IMU interface module

Constructor Args  :
  - name               = your_arg_name_here

Required Hardware : imu scl sda
```

The module directory structure is as follows:

```bash
Modules/
└── BlinkLED/
    ├── BlinkLED.hpp        # Header file with manifest block
    ├── README.md           # Module documentation
    └── CMakeLists.txt      # Build configuration
```

A standard MANIFEST (module metadata) format is as follows:

```yaml
// clang-format off
/* === MODULE MANIFEST ===
module_name: BlinkLED
module_description: 控制 LED 闪烁的简单模块 / A simple module to control LED blinking
constructor_args:
  - blink_cycle: 250
required_hardware: led/LED/led1/LED1
repository: https://github.com/xrobot-org/BlinkLED
=== END MANIFEST === */
// clang-format on
```
