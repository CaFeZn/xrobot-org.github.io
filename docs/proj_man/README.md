---
id: proj-man
title: 项目管理（XRobot）
sidebar_position: 7
---

# 项目管理（XRobot）

本章简要介绍 XRobot 在嵌入式项目中的基本用法，包括模块拉取、配置和主函数生成等。详细的命令说明将在后续页面中分模块展开。

## 使用前提

确保已通过 pip 或 pipx 安装 `xrobot` 工具：

```bash
pip install xrobot
# 或使用 pipx
pipx install xrobot
```

## 基本目录结构

XRobot 使用约定的目录布局进行模块管理和代码生成：

```bash
YourProject/
├── Modules/               # 存放模块仓库
│   └── modules.yaml       # 仓库列表
├── User/                  # 用户配置与生成输出
│   ├── xrobot.yaml        # 构造参数配置
│   └── xrobot_main.hpp    # 自动生成主函数
```

## 工具说明

XRobot 工具集包括以下命令，具体用法见后续子页面：

- `xrobot_add_mod`：添加模块仓库或模块实例
- `xrobot_init_mod`：拉取/更新模块仓库
- `xrobot_gen_main`：生成主函数代码
- `xrobot_create_mod`：创建模块模板
- `xrobot_mod_parser`：解析模块头文件中的构造参数
- `xrobot_setup`：一键生成入口文件和配置

后续页面将逐个介绍这些命令的详细用法与参数。
