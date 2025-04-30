---
id: code-gen-stm32
title: STM32 Code Generation
sidebar_position: 1
---

# STM32 Code Generation

LibXR provides the `xr_cubemx_cfg` command to automatically generate C++ initialization code from an STM32CubeMX project. This command wraps several tools including configuration parsing, code generation, interrupt patching, and CMake integration.

---

## Quick Start

In the root directory of your STM32CubeMX project, run:

```bash
xr_cubemx_cfg -d .
```

This command will perform the following steps automatically:

1. Initialize or update the `libxr` submodule  
2. Locate the `.ioc` file and convert it into `.config.yaml`  
3. Generate `app_main.cpp` with initialization code  
4. Patch interrupt handler files  
5. Modify `CMakeLists.txt` to integrate LibXR

---

## Example Output

```text
[INFO] LibXR submodule already exists. Checking for updates...
[INFO] [OK] cd . && git submodule update --init --recursive
[INFO] LibXR submodule updated.
Found .ioc file: .\atom.ioc
Parsing .ioc file...
[INFO] [OK] xr_parse_ioc -d . -o .\.config.yaml
Generating C++ code...
[INFO] [OK] xr_gen_code_stm32 -i .\.config.yaml -o .\User\app_main.cpp
Modifying STM32 interrupt files...
[INFO] [OK] xr_stm32_it .\Core/Src
[INFO] [OK] xr_stm32_cmake .
[INFO] [Pass] All tasks completed successfully!
```

---

## Output Structure

After execution, your project directory will contain the following generated or modified files:

```txt
.
├── .config.yaml                      # Parsed configuration from .ioc
├── User/
│   ├── app_main.cpp                  # Main initialization code
│   ├── app_main.h                    # Header for app_main
│   ├── libxr_config.yaml             # LibXR runtime configuration
│   └── flash_map.hpp                 # Flash address mapping table
├── Core/Src/stm32f1xx_it.c           # Patched interrupt handlers
├── cmake/LibXR.CMake                 # CMake build config for LibXR
├── CMakeLists.txt                    # Modified to include LibXR
└── Middlewares/Third_Party/LibXR     # LibXR as a Git submodule
```

---

## How to Use

Call `app_main()` at the appropriate entry point in your project:

### Bare-metal Project

```cpp
#include "app_main.h"

int main() {
    HAL_Init();
    SystemClock_Config();
    ...
    app_main();  // Initialize peripherals and start application
    while (1) {
        ...
    }
}
```

### FreeRTOS Project

Place `app_main()` in the entry function of the main thread.

---

## Optional Arguments

| Argument   | Description                             |
| ---------- | --------------------------------------- |
| `-d`       | Specify STM32 project root directory    |
| `-t`       | Set terminal peripheral (e.g. `usart1`) |
| `-c`       | Enable Clang build support              |
| `--xrobot` | Generate glue code for XRobot modules   |

---

## Project Requirements

- Must be a CMake project exported from STM32CubeMX  
- Must contain a valid `.ioc` file  

---

## Subcommands (Internally used by `xr_cubemx_cfg`, can also be run separately)

| Tool                | Description                                      |
| ------------------- | ------------------------------------------------ |
| `xr_parse_ioc`      | Parses `.ioc` and generates `.config.yaml`       |
| `xr_gen_code_stm32` | Generates `app_main.cpp` from the YAML config    |
| `xr_stm32_it`       | Patches interrupt handlers with UART/USB support |
| `xr_stm32_cmake`    | Integrates LibXR into the project build system   |

---

## References

[LibXR CLI tool and documentation (PyPI)](https://pypi.org/project/libxr/)
