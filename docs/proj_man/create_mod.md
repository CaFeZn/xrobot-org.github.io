---
id: proj-man-create-mod
title: 快速创建模块
sidebar_position: 3
---

XRobot 提供了快速创建模块的工具 `xrobot_create_mod`，可以从模板中快速创建一个新模块，用于快速开发模块，无需手动创建模块仓库和模块头文件。

## 使用方法

```bash
$ xrobot_create_mod MySensor --desc "IMU interface module" --hw imu scl sda
[OK] Module MySensor generated at Modules/MySensor
```

通过xrobot_mod_parser查看模块信息：

```bash
$ xrobot_mod_parser --path ./Modules/MySensor/

=== Module: MySensor ===
Description       : IMU interface module

Constructor Args  :
  - name               = your_arg_name_here

Required Hardware : imu scl sda
```

模块的目录结构如下:

```bash
Modules/
└── BlinkLED/
    ├── BlinkLED.hpp        # 带 manifest 的头文件
    ├── README.md           # 模块文档
    └── CMakeLists.txt      # 构建配置
```

标准的MANIFEST（模块信息）格式如下：

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
