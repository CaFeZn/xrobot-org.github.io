---
id: proj-man-add-mod
title: 添加模块
sidebar_position: 4
---

# 添加模块

通过`xrobot_add_mod`工具可以快速添加一个新模块到仓库，或者从仓库中选择一个模块创建实例。

## 使用方法

### 添加远程模块到仓库

--version可以省略，使用时要确保对应分支存在。

```bash
$ xrobot_add_mod https://github.com/yourorg/BlinkLED.git --version main
[SUCCESS] Added repo module 'BlinkLED' to Modules/modules.yaml
```

然后拉取模块：

```bash
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

### 创建模块实例

```bash
$ xrobot_add_mod BlinkLED
[SUCCESS] Appended module instance 'BlinkLED' to User/xrobot.yaml

# 重新生成代码
$ xrobot_gen_main
...
```
