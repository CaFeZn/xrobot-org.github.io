---
id: env-setup-linux
title: Linux Environment Setup
sidebar_position: 4
---

# Linux Environment Setup

On Linux, install the required dependencies directly. The examples below assume `Ubuntu 24.04` or another Debian-family environment using `apt`.

```bash
sudo apt update
sudo apt install -y \
  git curl wget zip make file tar xz-utils \
  python3 python3-pip python3-venv pipx \
  cmake ninja-build gcc g++ gdb \
  clang clangd clang-tidy \
  libwpa-client-dev libnm-dev libudev-dev
```

In current mainline, `libwpa-client-dev`, `libnm-dev`, and `libudev-dev` are the most relevant extra packages for Linux-side networking and device-related drivers.

## Using Clang

Just point CMake at Clang explicitly:

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++
```

If you want a prebuilt fixed environment, `docker-image-linux` is also available.
