---
id: spsc_queue
title: SPSCQueue
sidebar_position: 2
---

# SPSCQueue（单生产者单消费者无锁队列）

`LibXR::SPSCQueue<T>` 是当前主线公开的单生产者单消费者无锁队列。它适合明确的单向通道：

- 一个上下文负责 `Push`；
- 另一个上下文负责 `Pop`；
- 中间不再引入额外锁。

典型场景包括：ISR -> 线程、采集线程 -> 处理线程、`Topic::QueuedSubscriber` -> 消费线程。

## 基本用法

```cpp
LibXR::SPSCQueue<uint32_t> queue(16);

queue.Push(10);

uint32_t value = 0;
queue.Pop(value);
```

## 当前实现特点

- 模板层只是把 `T` 映射成固定大小字节 payload；
- 底层复用 `SPSCQueueBase`；
- 队列内部不管理 `T` 的复杂生命周期；
- 支持 `Push/Pop/Peek` 与批量操作；
- 支持 `PushWithWriter()` / `PopWithReader()` 这类回调式批量读写接口。

## 常用接口

### 单个元素

- `Push(const T&)`
- `Pop(T&)`
- `Peek(T&)`

### 批量元素

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### 回调式读写

- `PushWithWriter(Writer&& writer)`
- `PushWithWriter(size_t size, Writer&& writer)`
- `PopWithReader(Reader&& reader)`
- `PopWithReader(size_t size, Reader&& reader)`

### 其他

- `Size()`
- `MaxSize()`
- `EmptySize()`
- `Reset()`

## 在消息系统里的位置

当前 `Topic::QueuedSubscriber` 只接受 `SPSCQueue`：

```cpp
auto topic = LibXR::Topic::CreateTopic<float>("temperature");
LibXR::SPSCQueue<float> queue(8);
auto sub = LibXR::Topic::QueuedSubscriber(topic, queue);
```

也可以接收带时间戳的 `Topic::Message<T>`：

```cpp
LibXR::SPSCQueue<LibXR::Topic::Message<float>> queue(8);
auto sub = LibXR::Topic::QueuedSubscriber(topic, queue);
```

队满时，这次发布会直接丢弃，不会阻塞发布者。

## 选择建议

在下面这些条件同时成立时，优先用 `SPSCQueue`：

- 生产者只有一个；
- 消费者只有一个；
- 你想明确表达这条拓扑，而不是退回到更重的通用并发队列。

如果任一侧不止一个，就不要继续硬套 `SPSCQueue`，改用 `MPMCQueue` 或重新整理队列拓扑。
