---
id: env-setup-stm32
title: STM32环境配置
sidebar_position: 1
---

# STM32 环境配置

本页面将指导你如何配置STM32的开发环境，以便使用LibXR，CodeGenerator，XRobot。

## 基础环境

Windows安装：

* [git](https://git-scm.com/)
* [python](https://apps.microsoft.com/detail/9ncvdn91xzqp)

linux使用apt安装：

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

## 基于GCC (旧版STM32 VSCode 插件)

## Windows环境配置

需要安装[STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)

## Linux环境配置

需要安装的软件包:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

从[ARM官网](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads)下载适合你的编译器。例如使用x64的linux系统，请下载`x86_64 Linux hosted cross toolchains`下的`AArch32 bare-metal target (arm-none-eabi)`，即为arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz。

解压后移动到`/opt`下，创建软链接`/usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi`，即可使用`arm-none-eabi-`前缀的命令，例如`arm-none-eabi-gcc`。

然后使用链接命令：

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```

## 基于GCC/Clang (新版STM32 VSCode 插件)

在STM32CubeMX (>=15.0)中，已经集成了Clang 相关工具链的CMake配置。 在`Project Manager`中选择`Default Compiler/Linker`为gcc或者starm-clang即可，不需要额外配置。

`Default Compiler/Linker`的设置会写到工程根目录的`CMakePresets.json`中的`toolchainFile`，为`${sourceDir}/cmake/starm-clang.cmake`或者`${sourceDir}/cmake/gcc-arm-none-eabi.cmake`。

然后安装使用插件`STMicroelectronics.stm32-vscode-extension`的预览版本即可，插件会自行下载工具链等。

### clangd 使用建议

ST 新版插件的 clangd 支持存在较多缺陷，建议直接**停用 `stmicroelectronics.stm32cube-ide-clangd` 插件**，转而使用 [官方 `llvm-vs-code-extensions.vscode-clangd` 插件](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd)。并手动添加如下配置：

```json
"clangd.arguments": [
    "--query-driver=${env:CUBE_BUNDLE_PATH}/st-arm-clang/19.1.6+st.8/bin/starm-clang.exe,${env:CUBE_BUNDLE_PATH}/st-arm-clang/19.1.6+st.8/bin/starm-clang++.exe"
]
```

如使用 GCC 工具链，则需改为：

```json
"clangd.arguments": [
    "--query-driver=${env:CUBE_BUNDLE_PATH}/gnu-tools-for-stm32/10.3.1+st.3/bin/arm-none-eabi-gcc.exe,${env:CUBE_BUNDLE_PATH}/gnu-tools-for-stm32/10.3.1+st.3/bin/arm-none-eabi-g++.exe"
]
```

---

#### Windows 下 clangd 安装

可前往 [LLVM 官网](https://github.com/llvm/llvm-project/tags)下载安装包。

#### Linux 下 clangd 安装

可直接通过 apt 安装。注意 Ubuntu 24.04 之前系统自带的 clangd 版本较老，遇到问题建议升级。

---

#### stm32cube-clangd 插件主要问题

* 不会为 `--query-driver` 自动添加 C++ 编译器路径，且手动添加后每次打开工程会被覆盖
* 无法识别 ST-ARM-CLANG 的 `--multi-lib-config` 编译选项

### CLion / 命令行编译

windows需要先配置相关path

```bash
# gcc
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${版本号}\bin

# starm-clang
set PATH=%PATH%;C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${版本号}\bin;
```

需要设置环境变量：

windows:

```powershell
$env:GCC_TOOLCHAIN_ROOT = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\gnu-tools-for-stm32\${版本号}\bin"
$env:CLANG_GCC_CMSIS_COMPILER = "C:\Users\$env:USERNAME\AppData\Local\stm32cube\bundles\st-arm-clang\${版本号}"
```

linux:

```bash
export GCC_TOOLCHAIN_ROOT=/opt/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi/bin
export CLANG_GCC_CMSIS_COMPILER=/opt/st-arm-clang
```

编译时还要指定`-DCMAKE_TOOLCHAIN_FILE="cmake/gcc-arm-none-eabi.cmake"`或者`-DCMAKE_TOOLCHAIN_FILE="cmake/starm-clang.cmake"`来选择工具链。对于使用`starm-clang.cmake`，还可以指定`-DSTARM_TOOLCHAIN_CONFIG`为`STARM_HYBRID` `STARM_NEWLIB` `STARM_PICOLIBC`三者中的一个，默认为`STARM_HYBRID`。

### 旧版CubeMX工程(<15.0)迁移到新版本编译问题

如果提示链接不到库`ob`，则在工程根目录的`CMakeLists.txt`中添加:

```cmake
# Remove wrong libob.a library dependency when using cpp files
list(REMOVE_ITEM CMAKE_C_IMPLICIT_LINK_LIBRARIES ob)
```
