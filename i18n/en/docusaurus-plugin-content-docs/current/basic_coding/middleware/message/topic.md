---
id: message-topic
title: Topic Basics, Subscription Models, and Thread Safety
sidebar_position: 1
---

# Topic Basics, Subscription Models, and Thread Safety

`Topic` is the core object of the `Message` module. It publishes data, manages subscribers, optionally caches the latest value, and dispatches completion to synchronous, asynchronous, queued, or callback subscribers.

## Features

- Multiple subscribers can receive the same topic data;
- Supports synchronous, asynchronous, queued, and callback-based subscription models;
- Topics and subscribers are organized with red-black trees and lock-free lists;
- Supports optional cache and length checking;
- Supports both single-publisher and multi-publisher publishing semantics.

## Create a Topic and Publish Data

```cpp
auto domain = LibXR::Topic::Domain("sensor_data");
auto topic = LibXR::Topic::CreateTopic<float>("temperature", &domain, false, true, true);

float temp = 23.5f;
topic.Publish(temp);
```

These parameters mean:

- `multi_publisher = false`
- `cache = true`
- `check_length = true`

If you want to call `DumpData()` later, the topic needs cache enabled at creation time.

## Subscription Modes

### Synchronous Subscriber

```cpp
float received_temp;
auto sync = LibXR::Topic::SyncSubscriber<float>("temperature", received_temp, &domain);

if (sync.Wait(1000) == ErrorCode::OK)
    printf("Sync received temperature: %.2f\n", received_temp);
```

### Asynchronous Subscriber

```cpp
auto async = LibXR::Topic::ASyncSubscriber<float>("temperature", &domain);
async.StartWaiting();

if (async.Available()) {
    float latest_temp = async.GetData();
    printf("Async received temperature: %.2f\n", latest_temp);
    async.StartWaiting();
}
```

### Queued Subscriber

```cpp
LibXR::LockFreeQueue<float> queue(10);
auto que_sub = LibXR::Topic::QueuedSubscriber<float>("temperature", queue, &domain);

float temp;
if (queue.Pop(temp) == ErrorCode::OK)
    printf("Queued received temperature: %.2f\n", temp);
```

### Callback Subscriber

```cpp
float latest_temp = 0.0f;
auto cb = LibXR::Topic::Callback::Create(
    [](bool, float* arg, LibXR::RawData& data) {
        *arg = *reinterpret_cast<float*>(data.addr_);
    }, &latest_temp);

topic.RegisterCallback(cb);
```

## Thread Safety

The `Topic` constructor has a `bool multi_publisher = false` parameter. By default it assumes a single publisher path; when set to `true`, publishing switches to `Mutex`-based synchronization and is no longer appropriate for direct ISR publishing.

```cpp
Topic(const char* name, uint32_t max_length, Domain* domain = nullptr,
      bool multi_publisher = false, bool cache = false, bool check_length = false);

template <typename Data>
Topic CreateTopic(const char* name, Domain* domain = nullptr,
                  bool multi_publisher = false, bool cache = false,
                  bool check_length = false);
```

## Interface Overview

| Class / Method | Description |
|-----------|------|
| `CreateTopic<T>()` | Create a topic with cache and length-check options |
| `Publish()` | Publish data |
| `SyncSubscriber` | Wait synchronously for data |
| `ASyncSubscriber` | Read the latest data asynchronously |
| `QueuedSubscriber` | Push received data into a queue |
| `RegisterCallback()` | Register a callback |
| `DumpData()` | Export cached or packed data |
| `PackData()` | Build a packet manually |
| `Server::ParseData()` | Parse and forward received data |
| `Server::Register()` | Register a topic for parsing |

## Cache, Export, and Packing

Publishing and caching are separate concerns.

- if you only need fan-out delivery, cache is not mandatory
- if you need `DumpData(val)` or `DumpData(pkt)`, cache must be enabled
- `PackData()` can be used independently from cache, which is useful for bridges, logs, and synthetic sources

See [Packet Packing and Parsing](./packet-server.md) for the detailed packet format and parser workflow.

## Typical Use Cases

- structured transport over UART, CAN, or network links
- efficient MCU-to-host or MCU-to-controller data channels
- state forwarding, log forwarding, and lightweight synchronization
- message systems that need optional cache and optional packet format

## Notes

- Topics under the same `Domain` name reuse the same domain object;
- Topics with the same name in the same domain share the same instance and must keep consistent configuration;
- `Topic` is a lightweight wrapper and can be copied and passed around;
- If cache is disabled, `DumpData()` cannot export the latest value.
