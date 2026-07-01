---
id: env-setup-docker
title: Docker Environment Setup
sidebar_position: 6
---

# Docker Environment Setup

[xrobot-org/Docker-Image](https://github.com/xrobot-org/Docker-Image) currently provides the following Docker images.

There are five available images:

* `docker-image-stm32`
* `docker-image-esp32`
* `docker-image-ch32-riscv`
* `docker-image-linux`
* `docker-image-webots`

## Current image contents

### `docker-image-stm32`

* Based on `ubuntu:24.04`
* Includes `arm-gnu-toolchain-14.2.rel1`
* Includes `starm-clang`
* Pins `stm32cube-ide-core` to `1.1.0`, because newer package lines no longer provide the Linux-side `cube` downloader

### `docker-image-ch32-riscv`

* Based on `ubuntu:24.04`
* Uses **WCH GCC15 v240**
* Compiler prefix: `riscv32-wch-elf-`
* Includes the matching OpenOCD

### `docker-image-esp32`

* Based on `ubuntu:24.04`
* Preinstalls `ESP-IDF v5.4.1`
* Installed at `~/esp/esp-idf`
* Suitable for the standard `idf.py` workflow

### `docker-image-linux`

* Based on `ubuntu:24.04`
* Preinstalls `clang / cmake / ninja / gcc / g++ / gdb`
* Preinstalls `libwpa-client-dev / libnm-dev / libudev-dev / libgpiod-dev`
* Suitable for native Linux driver and toolchain work

### `docker-image-webots`

* Intended for Webots simulation environments
* Includes GUI and simulation-related dependencies

## GHCR

Current pulls use `GHCR`:

* `docker pull ghcr.io/xrobot-org/docker-image-stm32:main`
* `docker pull ghcr.io/xrobot-org/docker-image-esp32:main`
* `docker pull ghcr.io/xrobot-org/docker-image-ch32-riscv:main`
* `docker pull ghcr.io/xrobot-org/docker-image-linux:main`
* `docker pull ghcr.io/xrobot-org/docker-image-webots:main`

## Docker Hub

If you use Docker Hub mirrors, you can also pull:

* `docker pull xrimage/xrimage-stm32`
* `docker pull xrimage/xrimage-esp32`
* `docker pull xrimage/xrimage-ch32-riscv`
* `docker pull xrimage/xrimage-linux`
* `docker pull xrimage/xrimage-webots`

## Run a container

```bash
docker run -it --rm <image-name>
```

To mount a local workspace, bind the working directory explicitly:

```bash
docker run -it --rm -v "$PWD":/work -w /work ghcr.io/xrobot-org/docker-image-linux:main
```
