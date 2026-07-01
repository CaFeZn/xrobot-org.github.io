---
id: message-linux-shared-topic
title: Linux Shared-Memory Topic
sidebar_position: 3
---

# Linux Shared-Memory Topic

`LibXR::LinuxSharedTopic<T>` is a Linux / Webots shared-memory derived implementation of `Topic`. Payloads live in shared memory, while publish/receive synchronization is handled with atomics and futex. This is designed for host-side inter-process communication, not for MCU-side ISR pipelines.

## Scope

- available only under `Linux` / `Webots` system configurations
- `TopicData` must be trivially copyable
- this is a **host IPC** transport, not a generic replacement for normal `Topic`

## Config

```cpp
struct LinuxSharedTopicConfig
{
  uint32_t slot_num = 64;
  uint32_t subscriber_num = 8;
  uint32_t queue_num = 64;
};
```

- `slot_num`: number of shared payload slots
- `subscriber_num`: maximum subscriber count
- `queue_num`: descriptor queue depth per subscriber

## Publisher Construction

Publisher mode creates or takes over the shared topic:

```cpp
struct Frame {
  uint32_t seq;
  uint32_t checksum;
  uint8_t payload[128];
};

LibXR::LinuxSharedTopicConfig config;
config.slot_num = 64;
config.subscriber_num = 8;
config.queue_num = 64;

LibXR::LinuxSharedTopic<Frame> topic("vision_frame", config);
ASSERT(topic.Valid());
```

You can also specify a domain name or `Topic::Domain` explicitly:

```cpp
LibXR::LinuxSharedTopic<Frame> topic("vision_frame", "vision", config);
```

## Attach-Only Mode

Constructors without `config` open an existing shared topic in attach-only mode:

```cpp
LibXR::LinuxSharedTopic<Frame> attach_only("vision_frame");
ASSERT(attach_only.Valid());
```

Attach-only topics cannot act as publishers. Calling `CreateData()` on them returns `ErrorCode::STATE_ERR`.

## Subscriber Modes

```cpp
enum class LinuxSharedSubscriberMode : uint8_t
{
  BROADCAST_FULL = 0,
  BROADCAST_DROP_OLD = 1,
  BALANCE_RR = 2,
};
```

### `BROADCAST_FULL`

- broadcast to this subscriber
- if the queue is full, the publish fails

### `BROADCAST_DROP_OLD`

- broadcast to this subscriber
- if the queue is full, drop the oldest descriptor and keep the newest one

### `BALANCE_RR`

- join the round-robin balanced subscriber group
- each publish is delivered to only one balanced subscriber

## Subscriber Usage

### Pattern 1: `Wait()` and read through the subscriber

```cpp
using Topic = LibXR::LinuxSharedTopic<Frame>;
using Subscriber = Topic::SyncSubscriber;

Subscriber sub("vision_frame", LibXR::LinuxSharedSubscriberMode::BROADCAST_FULL);
ASSERT(sub.Valid());

if (sub.Wait(1000) == ErrorCode::OK) {
  const Frame* frame = sub.GetData();
  // ... use frame ...
  sub.Release();
}
```

In this form:

- `GetData()` returns a read-only pointer to the currently held slot
- you must call `Release()` when done

### Pattern 2: receive through a `SharedData` handle

```cpp
using Topic = LibXR::LinuxSharedTopic<Frame>;
using SharedData = Topic::Data;
using Subscriber = Topic::SyncSubscriber;

Subscriber sub("vision_frame");
SharedData data;

if (sub.Wait(data, 1000) == ErrorCode::OK) {
  const Frame* frame = data.GetData();
  // ... use frame ...
  data.Reset();
}
```

This form lets the `SharedData` handle own the slot lifetime. `Reset()` or destruction releases the slot automatically.

## Publishing

### Pattern 1: publish by value

```cpp
Frame frame = {};
frame.seq = 1;

topic.Publish(frame);
```

This path acquires a slot, copies the payload, and publishes it.

### Pattern 2: acquire a slot first, then fill it in place

```cpp
using Topic = LibXR::LinuxSharedTopic<Frame>;
using SharedData = Topic::Data;

SharedData data;
if (topic.CreateData(data) == ErrorCode::OK) {
  Frame* frame = data.GetData();
  frame->seq = 2;
  topic.Publish(data);
}
```

This path is useful when the payload is large and you want to avoid an extra copy before publishing.

## Useful Observability APIs

### Publisher side

- `Valid()`
- `GetError()`
- `GetSubscriberNum()`
- `GetPublishFailedNum()`
- `Remove(name)`

### Subscriber side

- `Valid()`
- `GetPendingNum()`
- `GetDropNum()`
- `GetSequence()`

### SharedData handle

- `Valid()` / `Empty()`
- `GetSequence()`
- `GetData()`
- `Reset()`

## Compared to normal `Topic`

- normal `Topic` is for in-process publish-subscribe
- `LinuxSharedTopic<T>` is for Linux host inter-process transport
- normal `Topic` is an in-process exact-typed dispatch path and no longer stores a built-in latest payload cache
- `LinuxSharedTopic<T>` payloads live in fixed shared-memory slots
- normal `Topic` focuses on subscription semantics
- `LinuxSharedTopic<T>` adds per-subscriber queue policy and `BALANCE_RR`

## Usage Guidance

- if your modules are inside one process, prefer normal `Topic`
- use `LinuxSharedTopic<T>` when you need Linux host IPC with larger payloads
- treat slot lifetime carefully, especially in the `Wait() + GetData() + Release()` form
