---
id: env-setup-stm32
title: STM32 Environment Setup
sidebar_position: 1
---

# STM32 Environment Setup

This page will guide you on how to configure your STM32 development environment for use with LibXR, CodeGenerator, and XRobot.

## Basic Environment

Windows installation:

* [git](https://git-scm.com/)
* [python](https://apps.microsoft.com/detail/9ncvdn91xzqp)

For Linux, install with apt:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

## Based on GCC (Legacy STM32 VSCode Extension)

### Windows Environment Setup

You need to install [STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)

### Linux Environment Setup

Required packages:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

Download the appropriate compiler from the [ARM official website](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads).  
For example, if you are using an x64 Linux system, download `AArch32 bare-metal target (arm-none-eabi)` under `x86_64 Linux hosted cross toolchains`, which is named `arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz`.

After extraction, move it to `/opt` and create a symbolic link `/usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi`.  
Now you can use commands with the `arm-none-eabi-` prefix, such as `arm-none-eabi-gcc`.

Then run the linking command:

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```

## Based on GCC/Clang (New STM32 VSCode Extension)

In STM32CubeMX (>=15.0), Clang-related toolchain CMake configurations are already integrated.  
In the Project Manager, simply select the Default Compiler/Linker as either gcc or starm-clang—no additional setup required.

The Default Compiler/Linker setting is written to the project's root `CMakePresets.json` under `toolchainFile`, which will be `${sourceDir}/cmake/starm-clang.cmake` or `${sourceDir}/cmake/gcc-arm-none-eabi.cmake`.

Then install and use the preview version of the `STMicroelectronics.stm32-vscode-extension`. The extension will automatically download toolchains as needed.

### CLion / Command-Line Compilation

On Windows, you need to configure the relevant path first:

```bash
# gcc
set PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${version}\bin

# starm-clang
set PATH=%PATH%;C:\Users\%USERNAME%\AppData\Local\stm32cube\bundles\st-arm-clang\${version}\bin;
```

You also need to set environment variables:

On Windows:

```powershell
$env:GCC_TOOLCHAIN_ROOT = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${version}\bin"
$env:CLANG_GCC_CMSIS_COMPILER = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${version}"
```

On Linux:

```bash
export GCC_TOOLCHAIN_ROOT=/opt/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin
export CLANG_GCC_CMSIS_COMPILER=/opt/st-arm-clang
```

During compilation, specify `-DCMAKE_TOOLCHAIN_FILE="cmake/gcc-arm-none-eabi.cmake"` or `-DCMAKE_TOOLCHAIN_FILE="cmake/starm-clang.cmake"` to select the toolchain.  
For `starm-clang.cmake`, you can also specify `-DSTARM_TOOLCHAIN_CONFIG` as one of `STARM_HYBRID`, `STARM_NEWLIB`, or `STARM_PICOLIBC` (default is `STARM_HYBRID`).

### Migrating Legacy CubeMX Projects (<15.0) to New Compilation

If you encounter an error about linking the library `ob`, add the following to the project's root `CMakeLists.txt`:

```cmake
# Remove wrong libob.a library dependency when using cpp files
list(REMOVE_ITEM CMAKE_C_IMPLICIT_LINK_LIBRARIES ob)
```
