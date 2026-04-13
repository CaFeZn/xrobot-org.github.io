---
id: debug-swd
title: SWD调试接口
sidebar_position: 1
---

# SWD调试接口

这一组页面主要分成两层：

- [SWD 基类](./swd-base.md)：说明 `LibXR::Debug::Swd` 的抽象层、传输策略和 DP/AP 辅助接口
- [SWD GPIO 实现](./swd-gpio.md)：说明基于 GPIO bit-bang 的 `SwdGeneralGPIO` 实现，以及 `loops_per_us` 标定和频率选择
