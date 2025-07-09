---
id: env-setup-stm32
title: STM32 Environment Setup
sidebar_position: 1
---

# STM32 Environment Setup

This page will guide you through configuring the development environment for STM32 to work with LibXR, CodeGenerator, and XRobot.

## Windows Setup

Required packages:

* [STM32CubeCLT](https://www.st.com/en/development-tools/stm32cubeclt.html)
* [git](https://git-scm.com/)
* [python](https://apps.microsoft.com/detail/9ncvdn91xzqp)

## Linux Setup

Required packages:

```bash
sudo apt update
sudo apt install -y git python3 python3-pip cmake tar xz-utils wget pipx ninja-build
```

Download the appropriate toolchain from the [ARM official website](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads).  
For example, if you are using x64 Linux, download the **AArch32 bare-metal target (arm-none-eabi)** under **x86_64 Linux hosted cross toolchains**.  
This will be a file like: `arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi.tar.xz`.

After extraction, move the toolchain to `/opt` and create a symbolic link `/usr/local/arm-gnu-toolchain-14.2.rel1-x86_64-arm-none-eabi`.  
You will then be able to use commands with the `arm-none-eabi-` prefix, such as `arm-none-eabi-gcc`.

Symlink command:

```bash
sudo ln -s /opt/arm-gun-toolchain-xx.x/bin/* /usr/bin
```

## Using Clang Compiler (Optional)

clang compiler has better support for clangd, so we recommend using it.

### Windows

Download and install [LLVM](https://github.com/llvm/llvm-project/tags). Make sure the version is 18.1 or above.

### Linux

You can install it using apt. Ensure the version is 18.1 or above (versions in Ubuntu before 24.04 might be outdated):

```bash
sudo apt update
sudo apt install -y clang clangd
```

## IDE Configuration

All IDEs need to configure the STM32CubeCLT path. CLion also requires OpenOCD.

### VSCode

Use the official STM32 extension (`STMicroelectronics.stm32-vscode-extension`) to import and build the project.

### CLion

Create a new project in CLion, choose STM32CubeMX, and import the generated project.
