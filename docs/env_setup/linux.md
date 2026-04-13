---
id: env-setup-linux
title: Linux环境配置
sidebar_position: 4
---

# Linux 环境配置

Linux 下直接安装依赖即可。这里按 `Ubuntu 24.04` / Debian 系 apt 环境说明。

```bash
sudo apt update
sudo apt install -y \
  git curl wget zip make file tar xz-utils \
  python3 python3-pip python3-venv pipx \
  cmake ninja-build gcc g++ gdb \
  clang clangd clang-tidy \
  libwpa-client-dev libnm-dev libudev-dev
```

其中：

* `libwpa-client-dev` / `libnm-dev` / `libudev-dev` 主要用于 Linux 侧网络和设备相关驱动

## 使用 Clang

直接在 CMake 里指定编译器即可：

```bash
cmake -S . -B build -G Ninja \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++
```

如果你想直接复用一套固定环境，也可以使用 `docker-image-linux`。
