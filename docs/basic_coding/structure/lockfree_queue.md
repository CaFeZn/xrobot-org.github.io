---
id: lockfree_queue
title: LockFreeQueue（历史兼容说明）
sidebar_position: 4
---

# LockFreeQueue（历史兼容说明）

旧版本 LibXR 文档里曾经把 `LockFreeQueue` 当作通用无锁队列来介绍，但当前 `libxr master` 的公开队列家族已经不是这套接口。

当前主线公开的是：

- `LibXR::Queue<T>`
- `LibXR::SPSCQueue<T>`
- `LibXR::MPMCQueue<T>`

也就是说，如果你现在在写新代码，不应该再把这一页当成现行 API 使用说明。

## 旧代码迁移怎么判断

### 1. 单生产者 / 单消费者

如果原来的使用关系本质上是单生产者单消费者，迁到 `SPSCQueue<T>`。

### 2. 多生产者或多消费者

如果原来的队列真的是公共并发队列，迁到 `MPMCQueue<T>`。

### 3. 其实不需要并发语义

如果只是普通局部 FIFO，直接改成 `Queue<T>`。

## 为什么保留这页

保留这一页的目的只是为了：

- 告诉你旧文档/旧模块里看到 `LockFreeQueue` 时，当前主线该往哪里对应；
- 避免侧边栏里原链接直接消失，导致历史引用断链。

如果你正在人工核对代码，请把这页理解成“兼容导航页”，不要把它当作现行接口说明。
