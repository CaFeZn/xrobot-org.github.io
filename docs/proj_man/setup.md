---
id: proj-man-setup
title: 一键配置
sidebar_position: 5
---

# 一键配置

XRobot 提供了一键配置的工具 `xrobot_setup`，可以快速配置项目，包括模块拉取、配置和主函数生成等。

## 使用方法

```bash
$ xrobot_setup
Starting XRobot auto-configuration
[EXEC] xrobot_init_mod --config Modules/modules.yaml --dir Modules
[INFO] Updating module: BlinkLED
Already up to date.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules processed
[INFO] Generated default Modules/CMakeLists.txt at: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp --config User/xrobot.yaml
Discovered modules: BlinkLED
[INFO] Using existing configuration file: User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```
