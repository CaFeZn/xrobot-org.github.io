---
id: proj-man-init-mod
title: 初始化模块仓库
sidebar_position: 1
---

# 初始化模块仓库

XRobot提供了模块初始化工具`xrobot_init_mod`，可以通过本地或远程yaml文件初始化模块仓库。

## 使用方法

### 无本地/远程配置文件

```bash
# 第一次运行会创建一个模板yaml文件
$ xrobot_init_mod
[WARN] Configuration file not found, creating template: Modules/modules.yaml
[INFO] Please edit the configuration file and rerun this script.

# 第二次运行会根据配置文件初始化模块仓库
$ xrobot_init_mod
[INFO] Cloning new module: BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 22, done.
remote: Counting objects: 100% (22/22), done.
remote: Compressing objects: 100% (15/15), done.
remote: Total 22 (delta 7), reused 22 (delta 7), pack-reused 0 (from 0)
Receiving objects: 100% (22/22), done.
Resolving deltas: 100% (7/7), done.
[SUCCESS] All modules processed
```

### 本地配置文件

使用--config选项指定本地配置文件，初始化模块仓库。

```bash
$ xrobot_init_mod --config Modules/modules.yaml
[INFO] Updating module: BlinkLED
Already up to date.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules processed
```

### 远程配置文件

使用--config选项指定远程配置文件，初始化模块仓库。

```bash
$ xrobot_init_mod --config https://raw.githubusercontent.com/${user_or_org_name}/${repo_name}/refs/heads/${branch_name}/${yaml_file_name}.yaml
[INFO] Cloning new module: BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 22, done.
remote: Counting objects: 100% (22/22), done.
remote: Compressing objects: 100% (15/15), done.
remote: Total 22 (delta 7), reused 22 (delta 7), pack-reused 0 (from 0)
Receiving objects: 100% (22/22), done.
Resolving deltas: 100% (7/7), done.
[SUCCESS] All modules processed
```

## CMakeLists.txt 集成 XRobot

在工程的CMakeLists.txt文件中添加:

```cmake
# Add XRobot Modules
include(${CMAKE_CURRENT_LIST_DIR}/Modules/CMakeLists.txt)
```
