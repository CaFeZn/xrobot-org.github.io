---
id: spsc_queue
title: SPSCQueue
sidebar_position: 2
---

# SPSCQueue

`LibXR::SPSCQueue<T>` is the current public single-producer / single-consumer lock-free queue in mainline LibXR.

It is the right fit for clearly one-way channels such as:

- ISR -> thread;
- producer thread -> consumer thread;
- `Topic::QueuedSubscriber` -> one consumer.

## Basic Usage

```cpp
LibXR::SPSCQueue<uint32_t> queue(16);

queue.Push(10);

uint32_t value = 0;
queue.Pop(value);
```

## Current Characteristics

- the template layer maps `T` to a fixed-size byte payload;
- the implementation reuses `SPSCQueueBase`;
- the queue does not manage complex object lifetime internally;
- it supports `Push/Pop/Peek` and batch helpers;
- it also exposes `PushWithWriter()` / `PopWithReader()` for callback-style batched access.

## Common Interfaces

### Single-item operations

- `Push(const T&)`
- `Pop(T&)`
- `Peek(T&)`

### Batch operations

- `PushBatch(const T* data, size_t size)`
- `PopBatch(T* data, size_t size)`
- `PeekBatch(T* data, size_t size)`

### Callback-style batched access

- `PushWithWriter(Writer&& writer)`
- `PushWithWriter(size_t size, Writer&& writer)`
- `PopWithReader(Reader&& reader)`
- `PopWithReader(size_t size, Reader&& reader)`

### Other helpers

- `Size()`
- `MaxSize()`
- `EmptySize()`
- `Reset()`

## Role in the Message System

Current `Topic::QueuedSubscriber` uses `SPSCQueue`:

```cpp
auto topic = LibXR::Topic::CreateTopic<float>("temperature");
LibXR::SPSCQueue<float> queue(8);
auto sub = LibXR::Topic::QueuedSubscriber(topic, queue);
```

You can also queue `Topic::Message<T>` when you need timestamps as well.

If the queue is full, that publish is dropped immediately instead of blocking the publisher.

## Selection Rule

Use `SPSCQueue` when all of the following are true:

- there is exactly one producer;
- there is exactly one consumer;
- you want the topology to stay explicit instead of defaulting to a heavier general concurrent queue.

If either side is not singular anymore, switch to `MPMCQueue` or redesign the queue topology explicitly.
