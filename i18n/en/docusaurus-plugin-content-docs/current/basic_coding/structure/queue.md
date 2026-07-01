---
id: queue
title: Queue
sidebar_position: 1
---

# Queue (ordinary FIFO queue)

`LibXR::Queue<T>` is the most basic member of the current public queue family: a fixed-capacity FIFO without built-in concurrency semantics. It is suitable for single-threaded code or for cases where synchronization is already handled externally.

The current public queue family is:

- `Queue<T>`: ordinary FIFO;
- `SPSCQueue<T>`: single-producer / single-consumer lock-free queue;
- `MPMCQueue<T>`: bounded multi-producer / multi-consumer queue.

If you just need a general ring queue, start here. If you need concurrency semantics, choose `SPSCQueue` or `MPMCQueue` explicitly.

## Structure Layers

The implementation is split into two layers:

- `QueueBase`: the byte-level ring buffer base;
- `Queue<T>`: the typed wrapper built on top of `QueueBase`.

So `Queue<T>` is still fundamentally a fixed-size FIFO byte queue with typed `Push/Pop/Peek` helpers.

## Basic Usage

```cpp
LibXR::Queue<int> queue(16);

queue.Push(42);

int value = 0;
queue.Pop(value);
```

## Main Interfaces

### Single-item operations

- `Push(const T&)`
- `Pop(T&)`
- `Pop()`
- `Peek(T&)`

### Batch operations

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### Queue state

- `Size()`
- `MaxSize()`
- `EmptySize()`
- `Reset()`

### Extra helpers

- `Overwrite(const T&)`
- `operator[](int32_t index)` with negative indexing support

## Current Behavior Boundaries

### 1. Fixed capacity

Capacity is decided at construction time and does not grow automatically:

```cpp
LibXR::Queue<uint32_t> queue(5);
```

### 2. Capacity 1 is valid

Current mainline tests explicitly cover `Queue<T>(1)`. This is not a special unsupported corner case.

### 3. Non-default-constructible payloads are supported

As long as the payload still fits the current byte-moving queue contract, it can work without a default constructor:

```cpp
struct NoDefaultPayload
{
    explicit NoDefaultPayload(uint32_t value_in) : value(value_in) {}
    uint32_t value;
};

LibXR::Queue<NoDefaultPayload> queue(1);
```

### 4. `Overwrite()` replaces the queue contents with exactly one new element

Current mainline tests verify that `Overwrite()` leaves the queue containing only the new item, rather than partially replacing old contents.

## When to Use `Queue<T>`

Good fit:

- single-threaded state machines;
- local FIFO buffering;
- business queues without interrupt or multi-thread contention;
- cases where you want a plain data structure without concurrency semantics.

Not a good fit:

- ISR-to-thread lock-free transfer;
- two threads concurrently pushing/popping;
- shared multi-producer ingress.

## How to Choose Between the Queue Types

| Queue | Concurrency shape | Notes |
|------|-------------------|------|
| `Queue<T>` | none | ordinary FIFO |
| `SPSCQueue<T>` | one producer / one consumer | lock-free single-channel queue |
| `MPMCQueue<T>` | multiple producers / multiple consumers | bounded concurrent queue |

So the old advice "use `LockFreeQueue` for multithreaded code" is no longer accurate. Current mainline expects you to choose between `SPSCQueue` and `MPMCQueue` based on the actual producer/consumer topology.
