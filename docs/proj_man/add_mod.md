---
id: proj-man-add-mod
title: 添加模块
sidebar_position: 4
---

# 添加模块

XRobot 提供了 `xrobot_add_mod` 工具，用于：

- **添加远程模块仓库**（添加到 `modules.yaml` 并拉取）
- **添加模块实例**（添加到 `xrobot.yaml` 并生成代码）

---

## 1. 添加远程模块

你可以通过提供模块仓库地址快速添加模块：

```bash
xrobot_add_mod xrobot-org/BlinkLED@master
```

输出示例：

```bash
[SUCCESS] Added repo module 'xrobot-org/BlinkLED@master' to Modules/modules.yaml
```

然后运行初始化命令：

```bash
xrobot_init_mod
```

该命令会自动拉取所有模块：

```bash
[INFO] Cloning new module: xrobot-org/BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 37, done.
remote: Counting objects: 100% (37/37), done.
remote: Compressing objects: 100% (25/25), done.
remote: Total 37 (delta 11), reused 33 (delta 10), pack-reused 0 (from 0)
Receiving objects: 100% (37/37), 7.48 KiB | 3.74 MiB/s, done.
Resolving deltas: 100% (11/11), done.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules and their dependencies processed.
```

---

## 2. 添加模块实例（生成代码配置）

假设你已拉取 BlinkLED 模块：

```bash
xrobot_add_mod BlinkLED
```

输出如下：

```bash
[SUCCESS] Appended module instance 'BlinkLED' as id 'BlinkLED_0' to User/xrobot.yaml
```

此时 `xrobot.yaml` 配置文件中将新增：

```yaml
modules:
- id: BlinkLED_0
  name: BlinkLED
  constructor_args:
    blink_cycle: 250
```

你可以直接运行 `xrobot_gen_main` 生成主函数：

```bash
xrobot_gen_main
```

---

## 3. 自定义实例 ID

默认实例 ID 为 `模块名_序号`，如 `BlinkLED_0`，可手动指定：

```bash
xrobot_add_mod BlinkLED --instance-id myled
```

---

## 5. 配置文件位置说明

| 配置类型     | 默认路径              | 内容                        |
|--------------|-----------------------|-----------------------------|
| 模块仓库列表 | `Modules/modules.yaml` | 存储模块地址/版本信息       |
| 实例配置文件 | `User/xrobot.yaml`     | 存储模块实例参数和 ID 等信息 |
