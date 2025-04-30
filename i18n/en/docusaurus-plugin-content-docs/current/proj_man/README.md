---
id: proj-man
title: Project Management (XRobot)
sidebar_position: 4
---

# Project Management (XRobot)

This page provides a brief overview of how to use XRobot in embedded projects, including module pulling, configuration, and main function generation. Detailed command descriptions will be provided in subsequent pages, organized by module.

## Prerequisites

Ensure that the `xrobot` tool is installed via pip or pipx:

```bash
pip install xrobot
# Or use pipx
pipx install xrobot
```

## Basic Directory Structure

XRobot uses a conventional directory layout for module management and code generation:

```
YourProject/
├── Modules/               # Stores module repositories
│   └── modules.yaml       # Repository list
├── User/                  # User configuration and generated output
│   ├── xrobot.yaml        # Configuration for constructor parameters
│   └── xrobot_main.hpp    # Auto-generated main function
```

## Tool Overview

The XRobot toolset includes the following commands. Detailed usage and parameters will be covered in later subpages:

- `xrobot_add_mod`: Add a module repository or module instance  
- `xrobot_init_mod`: Pull or update module repositories  
- `xrobot_gen_main`: Generate main function code  
- `xrobot_create_mod`: Create a module template  
- `xrobot_mod_parser`: Parse constructor parameters from module header files  
- `xrobot_setup`: One-click generation of entry files and configuration  

These commands will be introduced in detail one by one in the following pages.
