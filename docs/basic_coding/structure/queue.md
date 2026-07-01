---
id: queue
title: Queue
sidebar_position: 1
---

# Queue（普通 FIFO 队列）

`LibXR::Queue<T>` 是当前公开队列家族里最基础的一类：普通固定容量 FIFO，不带并发同步语义，适合单线程或你自己已经处理好外部同步的场景。

主线现在公开的队列家族分成三类：

- `Queue<T>`：普通 FIFO；
- `SPSCQueue<T>`：单生产者单消费者无锁队列；
- `MPMCQueue<T>`：多生产者多消费者有界队列。

如果你只是需要一个通用环形队列，先看这一页；如果你需要并发语义，再看 `SPSCQueue` 或 `MPMCQueue`。

## 结构分层

当前实现分两层：

- `QueueBase`：字节级环形缓冲基类；
- `Queue<T>`：在 `QueueBase` 上提供强类型接口的模板封装。

这意味着 `Queue<T>` 本质上仍是“固定大小元素的 FIFO 字节队列”，只是把 `Push/Pop/Peek` 包装成了强类型接口。

## 基本用法

```cpp
LibXR::Queue<int> queue(16);

queue.Push(42);

int value = 0;
queue.Pop(value);
```

## 主要接口

### 单个元素操作

- `Push(const T&)`
- `Pop(T&)`
- `Pop()`
- `Peek(T&)`

### 批量操作

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### 队列状态

- `Size()`
- `MaxSize()`
- `EmptySize()`
- `Reset()`

### 额外辅助

- `Overwrite(const T&)`
- `operator[](int32_t index)`（支持负索引）

## 当前行为边界

### 1. 固定容量

容量在构造时确定，之后不会自动扩展：

```cpp
LibXR::Queue<uint32_t> queue(5);
```

### 2. 允许容量为 1

当前主线测试覆盖了 `Queue<T>(1)` 这种场景，行为是正常的 FIFO，不需要额外绕开。

### 3. 支持无默认构造 payload

只要类型仍满足当前字节搬运契约，就可以使用无默认构造 payload：

```cpp
struct NoDefaultPayload
{
    explicit NoDefaultPayload(uint32_t value_in) : value(value_in) {}
    uint32_t value;
};

LibXR::Queue<NoDefaultPayload> queue(1);
```

### 4. `Overwrite()` 会直接把队列内容替换成一个新元素

当前主线测试验证过：`Overwrite()` 之后队列只保留这一个新元素，不是“覆盖队尾”或“尽量写进去”。

## 什么时候该用 `Queue<T>`

适合：

- 单线程状态机里的 FIFO；
- 局部缓冲；
- 不涉及中断/多线程竞争的业务队列；
- 只想要普通数据结构，不想引入并发约束。

不适合：

- ISR 到线程的无锁传输；
- 两个线程并发读写；
- 多生产者共享入队。

## 和另外两类队列怎么选

| 队列 | 适用关系 | 说明 |
|------|----------|------|
| `Queue<T>` | 无并发保证 | 普通 FIFO |
| `SPSCQueue<T>` | 单生产者 / 单消费者 | lock-free，常见于 ISR/线程或线程/线程单向通道 |
| `MPMCQueue<T>` | 多生产者 / 多消费者 | 有界并发队列，要求 payload 可平凡拷贝 |

所以“多线程环境下请用 `LockFreeQueue`”这类旧说法已经过时。当前主线要按生产者/消费者拓扑在 `SPSCQueue` 和 `MPMCQueue` 之间选。
