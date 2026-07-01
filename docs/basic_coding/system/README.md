---
id: system-coding
title: 操作系统
sidebar_position: 4
---

# 操作系统

本模块提供 LibXR 对线程管理、同步原语、定时器等底层操作系统资源的统一抽象，确保在不同 RTOS、Linux 乃至裸机环境下均可无缝移植。

## 目录

- [Thread（线程）](./thread.md)
- [Mutex（互斥锁）](./mutex.md)
- [Semaphore（信号量）](./semaphore.md)
- [Async（异步任务）](./async.md)
- [Timer（定时器）](./timer.md)

说明：

- 这一组页面描述的是 LibXR 对不同系统后端（如 `linux / freertos / threadx / none`）的统一抽象层，而不是承诺所有后端都共享完全相同的实现策略。
- 例如 `Mutex / Semaphore / Timer / Thread` 当前主线都已经按不同后端分别处理了优先级继承、轮询等待、线程占位实现等差异；阅读具体行为时应进入对应页面，而不要只依赖目录页的统一描述。

更多使用方法和平台差异见各页面。
