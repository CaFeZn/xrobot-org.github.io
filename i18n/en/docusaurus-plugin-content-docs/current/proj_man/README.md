---
id: proj-man
title: Project Management (XRobot)
sidebar_position: 7
---

# Project Management (XRobot)

XRobot handles module repositories, parameter configuration, and main-function generation, usually together with LibXR.

This chapter covers installation, directory conventions, and CLI tools.

## Installation

If you mainly use XRobot inside `VS Code`, you can also install the official plugin [`XRobot.xrobot`](https://marketplace.visualstudio.com/items?itemName=XRobot.xrobot). The plugin provides a graphical workspace entry for configuration and works well together with the command line tools.

Recommended installation uses `pipx`:

**Windows:**

```ps
python -m pip install --user pipx
python -m pipx ensurepath
pipx install xrobot
# Restart terminal
```

**Linux:**

```bash
sudo apt install pipx
pipx install xrobot
pipx ensurepath
# Restart terminal
```

**Or install with pip:**

```bash
pip install xrobot
```

**Source installation:**

```bash
git clone https://github.com/xrobot-org/XRobot.git
cd XRobot
pip install .
```

Do not install the same package with both `pip` and `pipx` at the same time. That usually leads to mixed PATH state and version conflicts.

## Directory Structure Convention

The default layout is:

```text
YourProject/
├── Modules/               # Stores module repositories
│   └── modules.yaml       # Repository list
│   └── sources.yaml       # (Optional) Source index
├── User/                  # User config and output files
│   ├── xrobot.yaml        # Configuration for construction
│   └── xrobot_main.hpp    # Auto-generated main function
```

## Main Features

- **Module repository fetch and sync**
  Automatically fetches, syncs, and recursively parses module repositories to keep dependencies and versions aligned.
- **Parameter extraction and configuration**
  Automatically extracts parameters from module headers and manages YAML configuration.
- **Main function generation**
  Generates a `XRobotMain()` C++ entry function from configuration, supporting multiple modules, instances, and nesting.
- **Manifest parsing**  
  Parses and formats module manifest headers.
- **Module template generation**  
  Generates a standardized module folder with CI in one step.
- **Multi-source module management**  
  Supports local and remote YAML configuration plus multi-source repository indexing.

## CLI Tools Summary

| Command               | Description                                              |
|-----------------------|----------------------------------------------------------|
| `xrobot_gen_main`     | Generate main C++ entry source file                      |
| `xrobot_mod_parser`   | Parse and show module manifest                           |
| `xrobot_create_mod`   | Create a new module folder & header                      |
| `xrobot_init_mod`     | Clone and recursively sync all module repos              |
| `xrobot_setup`        | One-click workspace setup & main function generation     |
| `xrobot_add_mod`      | Add repo or append module instance config                |
| `xrobot_src_man`      | Multi-source module repository management utility        |

See the following sections for detailed options and usage.

## Quick Start

```bash
# 1. One-click initialize workspace, fetch modules, and generate main function
$ xrobot_setup
Starting XRobot auto-configuration...
[INFO] Created default Modules/modules.yaml
Please edit this file; each line should be a full module name like:
  - xrobot-org/BlinkLED
  - your-namespace/YourModule@dev
[INFO] Created default Modules/sources.yaml
Please configure sources index.yaml for official or custom/private mirrors.
Default official source already included.

$ xrobot_setup
Starting XRobot auto-configuration...
[EXEC] xrobot_init_mod --config Modules/modules.yaml --directory Modules --sources Modules/sources.yaml
[INFO] Cloning new module: xrobot-org/BlinkLED
... (cloning output) ...
[SUCCESS] All modules and their dependencies processed.
[INFO] Created default Modules/CMakeLists.txt: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp

# 2. Pull or sync module repositories separately
$ xrobot_init_mod --config Modules/modules.yaml --directory Modules
... (sync output) ...
```
