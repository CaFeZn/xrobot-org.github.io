---
id: watchdog
title: 看门狗
sidebar_position: 12
---

# Watchdog（看门狗）

`LibXR::Watchdog` 提供通用看门狗（Watchdog）抽象接口，支持配置溢出时间、自动喂狗周期等参数，并提供启动、停止和手动喂狗等控制接口，适配多线程和定时任务等不同运行环境。

需要注意的是，当前主线把“硬件配置”和“自动喂狗调度”分成了两层：

- `SetConfig(...)` 只负责把 `timeout_ms / feed_ms` 交给具体平台实现；
- `ThreadFun()` / `TaskFun()` 是否真的执行自动喂狗，还取决于公开运行态成员 `auto_feed_` 和 `auto_feed_interval_ms`。

## 接口概览

### 配置结构体

```cpp
struct Configuration {
  uint32_t timeout_ms;  // 看门狗溢出时间（毫秒）
  uint32_t feed_ms;     // 自动喂狗周期（毫秒）
};
```

### 构造与配置

```cpp
Watchdog();
virtual ~Watchdog();

virtual ErrorCode SetConfig(const Configuration& config) = 0;
```

### 控制接口

```cpp
virtual ErrorCode Start() = 0;
virtual ErrorCode Stop() = 0;
virtual ErrorCode Feed() = 0;
```

### 自动喂狗辅助函数

```cpp
static void ThreadFun(Watchdog* wdg);
static void TaskFun(Watchdog* wdg);
```

- `ThreadFun`：用于线程环境中的自动喂狗循环；
- `TaskFun`：适用于定时轮询任务系统中的自动喂狗函数。

当前辅助函数的真实语义：

- `ThreadFun()` 会循环调用 `LibXR::Thread::Sleep(auto_feed_interval_ms)`，并在 `auto_feed_ == true` 时执行 `Feed()`；
- `TaskFun()` 不做循环，只在本次被调度时检查一次 `auto_feed_` 并决定是否 `Feed()`。

也就是说，自动喂狗是否生效并不是单靠 `SetConfig()` 决定；上层还需要显式组织线程或周期任务，并设置好 `auto_feed_` 与 `auto_feed_interval_ms`。

## 特性总结

- 支持设置溢出时间与自动喂狗周期；
- 提供手动 `Feed` 接口与自动喂狗辅助函数；
- 适用于多种嵌入式运行模型（如 RTOS 线程、定时任务）；
- 平台无关，便于在不同硬件平台上统一使用；
- 可扩展，派生类实现具体底层驱动逻辑。
