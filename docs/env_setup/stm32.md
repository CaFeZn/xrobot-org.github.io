---
id: env-setup-stm32
title: STM32 环境配置
sidebar_position: 1
---

# STM32 环境配置

本页面将指导你如何配置STM32的开发环境，以便使用LibXR，CodeGenerator，XRobot。

## Windows环境配置

需要安装的软件包:

* [STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)
* [git](https://git-scm.com/)
* [python](https://apps.microsoft.com/detail/9ncvdn91xzqp)

## Linux环境配置

需要安装的软件包:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

从[ARM官网](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads)下载适合你的编译器。例如使用x64的linux系统，请下载`x86_64 Linux hosted cross toolchains`下的`AArch32 bare-metal target (arm-none-eabi)`，即为arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz。

解压后移动到`/opt`下，创建软链接`/usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi`，即可使用`arm-none-eabi-`前缀的命令，例如`arm-none-eabi-gcc`。

链接命令：

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```

## 使用Clang编译器(可选)

### Windows

下载[LLVM](https://github.com/llvm/llvm-project/tags)并安装，确保版本大于等于18.1。

### Linux

直接使用apt安装即可，确保版本大于等于18.1(在Ubuntu24.04之前apt的clang版本可能较低)。

```bash
sudo apt update
sudo apt install -y clang clangd
```

## IDE配置

所有IDE都需要配置STM32CubeCLT路径，CLion还需要OpenOCD。

### VSCode

使用STM32官方插件（`STMicroelectronics.stm32-vscode-extension`）导入工程即可编译。

### CLion

使用CLion新建工程，选择STM32CubeMX，导入生成好的工程即可。
