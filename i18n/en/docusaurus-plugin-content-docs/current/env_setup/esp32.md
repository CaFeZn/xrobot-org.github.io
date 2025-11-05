---
id: env-setup-esp32
title: ESP32 Environment Setup
sidebar_position: 3
---

# ESP32 Environment Setup

The official ESP tutorial is already quite comprehensive: [ESP-IDF Getting Started](https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32c3/get-started/index.html). Just follow the instructions to install the environment.

## Project CMake Configuration

`libxr` provides a CMake configuration for ESP32: [esp32-cmake](https://github.com/Jiu-xiao/libxr/blob/master/CMake/esp32.cmake), which can be directly used.

For the official ESP Hello World project, add the following line at the end of `main/CMakeLists.txt`:

```cmake
include(path_to_libxr/CMake/esp32.cmake)
```

This completes the CMake setup. Be sure to replace `path_to_libxr` with the actual path to your `libxr` directory.

## Other

Due to fundamental conflicts between the design philosophy of ESP-IDF and LibXR, only a subset of drivers can be implemented on ESP32 via a highly inefficient compatibility layer. Driver adaptation work for all related models has been suspended indefinitely.
