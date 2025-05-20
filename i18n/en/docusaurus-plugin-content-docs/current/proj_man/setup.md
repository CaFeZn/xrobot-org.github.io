---
id: proj-man-setup
title: One-Click Setup
sidebar_position: 5
---

# One-Click Setup

XRobot provides a convenient one-click setup tool `xrobot_setup`, which streamlines the entire project setup process, including module fetching, configuration, and main function generation.

## Usage

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
