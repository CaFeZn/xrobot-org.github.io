---
id: env-setup-hpm
title: HPM 环境配置
sidebar_position: 6
---

# HPM 环境配置

本文只覆盖 HPM 开发环境的基础配置，不包含 LibXR 自动代码生成部分。

## 基础环境

Windows:

- Git: https://git-scm.com/
- Python (>= 3.8): https://www.python.org/downloads/
- CMake (>= 3.13): https://cmake.org/download/
- Ninja (推荐): https://github.com/ninja-build/ninja/releases

> 官方文档也提到可使用包管理器安装依赖，但笔者未验证；建议仍以手动安装或 `sdk_env` 为准。

Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build libc6-i386 libc6-i386-cross libstdc++6-i386-cross
sudo apt install -y git python3 python3-pip tar xz-utils wget
```

## 获取 HPM SDK 与工具

按网络情况选择 gitee 或 github：

```bash
# HPM SDK
git clone https://gitee.com/hpmicro/hpm_sdk.git
# or
git clone https://github.com/hpmicro/hpm_sdk.git

# SDK 环境与工具链
git clone https://gitee.com/hpmicro/sdk_env.git
# or
git clone https://github.com/hpmicro/sdk_env.git

# OpenOCD (HPM patched)
git clone https://gitee.com/hpmicro/riscv-openocd.git
# or
git clone https://github.com/hpmicro/riscv-openocd.git
```

建议将这些仓库放在固定路径（不要放在“下载”这类经常整理移动的目录），例如：

- `D:\hpm\hpm_sdk`
- `D:\hpm\sdk_env`
- `D:\hpm\riscv-openocd`

## 工具链配置

推荐使用 `sdk_env` 中提供的工具链与环境脚本，避免手动配置出错。

### Windows (PowerShell)

在 `sdk_env` 目录中执行：

```powershell
.\env.cmd
```

> 也可以使用 Chocolatey 安装依赖（需要管理员权限）。

### Linux / macOS

在 `sdk_env` 目录中执行：

```bash
source ./env.sh
```

> 如果你已经安装了独立的 RISC-V GCC 工具链，也可以自行设置 `PATH`，但建议优先使用 `sdk_env` 以保持一致性。

### 可选：手动设置工具链环境变量

如果不使用 `sdk_env`，需要手动设置以下环境变量（以 GNU GCC 为例，默认工具链）：

Linux/macOS:

```bash
export GNURISCV_TOOLCHAIN_PATH=/path/to/toolchain
export HPM_SDK_TOOLCHAIN_VARIANT=
```

Windows:

```cmd
set GNURISCV_TOOLCHAIN_PATH=C:\path\to\toolchain
set HPM_SDK_TOOLCHAIN_VARIANT=
```

> 也可切换 `HPM_SDK_TOOLCHAIN_VARIANT` 为 `nds-gcc` 或 `zcc`。

## HPM SDK 环境变量

使用脚本或手动声明 `HPM_SDK_BASE`：

Linux/macOS:

```bash
export HPM_SDK_BASE=/path/to/hpm_sdk
```

Windows:

```cmd
set HPM_SDK_BASE=C:\path\to\hpm_sdk
```

## 安装 Python 依赖

Linux/macOS:

```bash
pip3 install --user -r "$HPM_SDK_BASE/scripts/requirements.txt"
```

Windows:

```cmd
pip install --user -r "%HPM_SDK_BASE%/scripts/requirements.txt"
```

> Windows 默认不提供 `python3/pip3`，请使用 `python/pip`。

## VSCode + CMake（推荐）

建议使用 VSCode + CMake Tools 进行构建与调试。

### 推荐插件

- CMake Tools
- C/C++
- clangd
- HPM Pinmux Tool (可选)

```json
{
  "recommendations": [
    "ms-vscode.cmake-tools",
    "ms-vscode.cpptools",
    "llvm-vs-code-extensions.vscode-clangd",
    "hpmicro.hpm-pinmux-tool"
  ]
}
```

### CMake 构建方式

以 HPM SDK 示例工程为例：

```bash
mkdir build
cd build
cmake -GNinja -DBOARD=hpm6750evkmini ..
ninja
```

不同板卡对应的 CMake 参数可能不同，请以 HPM SDK 的对应 board/sample 说明为准。

## 烧录与调试

- 使用 `riscv-openocd` 进行调试与烧录
- 使用板卡配套的调试器（J-Link / HPM 官方调试器）

如果你在调试时遇到连接问题，优先检查：

- 调试器驱动是否安装
- 目标板供电与复位脚状态
- OpenOCD 配置是否匹配芯片型号

如果需要手动配置 OpenOCD 脚本路径：

Windows:

```cmd
set OPENOCD_SCRIPTS=%HPM_SDK_BASE%\boards\openocd
```

Linux/macOS:

```bash
export OPENOCD_SCRIPTS=$HPM_SDK_BASE/boards/openocd
```

## 参考

- HPM SDK 快速入门: https://hpm-sdk.readthedocs.io/zh-cn/latest/get_started.html
