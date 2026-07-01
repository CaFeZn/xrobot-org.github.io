---
id: mpmc_queue
title: MPMCQueue
sidebar_position: 3
---

# MPMCQueue（多生产者多消费者有界队列）

`LibXR::MPMCQueue<T>` 是当前主线公开的多生产者多消费者有界队列。

和 `SPSCQueue` 相比，它面向的是更通用的并发拓扑：

- 多个上下文都可能入队；
- 多个上下文都可能出队；
- 队列容量固定；
- payload 按字节块搬运。

## 基本用法

```cpp
LibXR::MPMCQueue<uint16_t> queue(32);

queue.Push(100);

uint16_t value = 0;
queue.Pop(value);
```

## 类型要求

当前主线对 `MPMCQueue<T>` 的限制比 `Queue<T>` 和 `SPSCQueue<T>` 更明确：

- `T` 必须是 `trivially copyable`；
- `T` 必须是 `trivially destructible`。

这是因为底层直接把 payload 当原始字节块搬运，不会在队列内部管理复杂对象生命周期。

## 当前适用场景

适合：

- 多个生产者共享同一发送队列；
- 中断与线程、多个线程共同访问的公共队列；
- 驱动内部需要有界并发队列的地方。

当前主线里典型例子包括多处 CAN 发送队列，它们都已经改成 `MPMCQueue<ClassicPack>` 或类似类型。

## 和 `SPSCQueue` 的取舍

不要把 `MPMCQueue` 当成“通用替代品”默认乱用。主线现在更强调按拓扑选型：

- 明确只有一个生产者、一个消费者：优先 `SPSCQueue`；
- 真有多生产者或多消费者：才用 `MPMCQueue`。

这样做的好处是语义更明确，也更符合当前代码里的设计边界。
