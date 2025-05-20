---
id: proj-man-init-mod
title: Initialize Module Repository
sidebar_position: 1
---

# Initialize Module Repository

XRobot provides a module initialization tool `xrobot_init_mod`, which can initialize the module repository using a local or remote YAML file.

## Usage

### Without a Local/Remote Configuration File

```bash
# The first run creates a template YAML file
$ xrobot_init_mod
[WARN] Configuration file not found, creating template: Modules/modules.yaml
[INFO] Please edit the configuration file and rerun this script.

# The second run initializes the module repository based on the config file
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

### Local Configuration File

Use the `--config` option to specify a local configuration file and initialize the module repository.

```bash
$ xrobot_init_mod --config Modules/modules.yaml
[INFO] Updating module: BlinkLED
Already up to date.
Already on 'master'
Your branch is up to date with 'origin/master'.
[SUCCESS] All modules processed
```

### Remote Configuration File

Use the `--config` option to specify a remote configuration file and initialize the module repository.

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

## Integrating XRobot in CMakeLists.txt

Add the following line to your project’s `CMakeLists.txt`:

```cmake
# Add XRobot Modules
include(${CMAKE_CURRENT_LIST_DIR}/Modules/CMakeLists.txt)
```
