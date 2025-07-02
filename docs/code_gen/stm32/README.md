---
id: code-gen-stm32
title: STM32 代码生成
sidebar_position: 1
---

# STM32 代码生成

LibXR 提供 `xr_cubemx_cfg` 命令用于从 STM32CubeMX 工程中一键生成符合 LibXR 架构的 C++ 初始化代码。该命令集成了配置解析、代码生成、中断补丁、CMake 集成等多个子工具。

---

## 快速使用

在 STM32CubeMX 工程根目录下执行：

```bash
xr_cubemx_cfg -d .
```

该命令将自动完成以下流程：

1. 初始化或更新 `libxr` 子模块；
2. 查找 `.ioc` 文件并解析为 `.config.yaml`；
3. 生成 `app_main.cpp` 初始化代码；
4. 补丁中断处理函数；
5. 修改 `CMakeLists.txt`，集成 LibXR 构建配置。

---

## 示例输出

```text
[INFO] LibXR submodule already exists. Checking for updates...
[INFO] [OK] cd . && git submodule update --init --recursive
[INFO] LibXR submodule updated.
Found .ioc file: ./atom.ioc
Parsing .ioc file...
[INFO] [OK] xr_parse_ioc -d . -o ./.config.yaml
Generating C++ code...
[INFO] [OK] xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp
Modifying STM32 interrupt files...
[INFO] [OK] xr_stm32_it ./Core/Src
[INFO] [OK] xr_stm32_cmake .
[INFO] [Pass] All tasks completed successfully!
```

---

## 输出结构

执行完成后，项目将包含以下新增或修改文件：

```txt
.
├── .config.yaml                      # 解析生成的配置文件
├── User/
│   │── app_main.cpp                  # 主入口初始化代码
│   │── app_main.h                    # 主入口初始化代码的头文件
│   │── libxr_config.yaml             # LibXR 配置文件
│   └── flash_map.hpp                 # FLASH 地址映射表
├── Core/Src/stm32f1xx_it.c           # 补丁后的中断处理函数
├── cmake/LibXR.CMake                 # LibXR 构建配置
├── CMakeLists.txt                    # 自动集成 LibXR
└── Middlewares/Third_Party/LibXR     # Git 子模块：LibXR 本体
```

---

## 使用说明

在工程入口处调用 `app_main()`：

### 裸机项目

```cpp
#include "app_main.h"

int main() {
    HAL_Init();
    SystemClock_Config();
    ...
    app_main();  // 初始化外设并启动应用层
    while (1){
        ...
    }
}
```

### FreeRTOS 项目

将 `app_main()` 放入主线程入口函数中调用。

---

## 可选参数

| 参数       | 说明                        |
| ---------- | --------------------------- |
| `-d`       | 指定 STM32 工程根目录       |
| `-t`       | 设置终端外设（如 `usart1`） |
| `-c`       | 启用 Clang 构建支持         |
| `--xrobot` | 生成 XRobot 模块 glue 代码  |

---

## 项目要求

- 必须为 STM32CubeMX 导出的 CMake 工程；
- 必须存在 `.ioc` 文件；
- FreeRTOS 必须开启互斥锁（`configUSE_MUTEXES`）

---

## 编译优化

默认生成的 CMake 配置在 Debug 模式下会为 LibXR、HAL 库、FreeRTOS 和 USB 等库添加 `-O2` 优化选项，而对 User 目录下的代码以及 XRobot 的模块则使用 `-Og` 优化选项，以此减少 FLASH 占用。

---

## 相关命令（由 `xr_cubemx_cfg` 内部调用，可单独执行）

| 工具名              | 功能说明                             |
| ------------------- | ------------------------------------ |
| `xr_parse_ioc`      | 解析 `.ioc`，生成 `.config.yaml`     |
| `xr_gen_code_stm32` | 根据 YAML 配置生成 `app_main.cpp`    |
| `xr_stm32_it`       | 补丁中断文件，插入 UART/USB 回调支持 |
| `xr_stm32_cmake`    | 修改 CMake 构建文件，集成 LibXR      |

## 参考

[LibXR 命令行工具以及文档](https://pypi.org/project/libxr/)
