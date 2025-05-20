---
id: proj-man-add-mod
title: Add Module
sidebar_position: 4
---

# Add Module

The `xrobot_add_mod` tool allows you to quickly add a new module to the repository, or create an instance of an existing module.

## Usage

### Add a Remote Module to the Repository

The `--version` option can be omitted, but make sure the specified branch exists when using it.

```bash
$ xrobot_add_mod https://github.com/yourorg/BlinkLED.git --version main
[SUCCESS] Added repo module 'BlinkLED' to Modules/modules.yaml
```

Then fetch the module:

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

### Create a Module Instance

```bash
$ xrobot_add_mod BlinkLED
[SUCCESS] Appended module instance 'BlinkLED' to User/xrobot.yaml

# Regenerate code
$ xrobot_gen_main
...
```
