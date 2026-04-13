---
id: message-topic
title: Topic 基础、订阅与线程安全
sidebar_position: 1
---

# Topic 基础、订阅与线程安全

`Topic` 是 `Message` 模块的核心对象。它负责发布数据、管理订阅者、按需缓存最新值，并把完成后的分发动作统一落到同步订阅、异步订阅、队列订阅或回调订阅上。

## 功能特点

- 支持多个订阅者同时接收同一主题数据；
- 支持同步、异步、队列与回调四种订阅方式；
- 内部采用红黑树和无锁链表组织主题与订阅者；
- 支持可选缓存与长度检查；
- 支持单发布者和多发布者两种发布语义。

## 创建 Topic 并发布消息

```cpp
auto domain = LibXR::Topic::Domain("sensor_data");
auto topic = LibXR::Topic::CreateTopic<float>("temperature", &domain, false, true, true);

float temp = 23.5f;
topic.Publish(temp);
```

这组参数依次对应：

- `multi_publisher = false`
- `cache = true`
- `check_length = true`

如果后面要调用 `DumpData()` 导出缓存数据，创建 `Topic` 时就需要把 `cache` 打开。

## 订阅方式

### 同步订阅

```cpp
float received_temp;
auto sync = LibXR::Topic::SyncSubscriber<float>("temperature", received_temp, &domain);

if (sync.Wait(1000) == ErrorCode::OK)
    printf("同步接收温度: %.2f\n", received_temp);
```

### 异步订阅

```cpp
auto async = LibXR::Topic::ASyncSubscriber<float>("temperature", &domain);
async.StartWaiting();

if (async.Available()) {
    float latest_temp = async.GetData();
    printf("异步接收温度: %.2f\n", latest_temp);
    async.StartWaiting();
}
```

### 队列订阅

```cpp
LibXR::LockFreeQueue<float> queue(10);
auto que_sub = LibXR::Topic::QueuedSubscriber<float>("temperature", queue, &domain);

float temp;
if (queue.Pop(temp) == ErrorCode::OK)
    printf("队列接收温度: %.2f\n", temp);
```

### 回调订阅

```cpp
float latest_temp = 0.0f;
auto cb = LibXR::Topic::Callback::Create(
    [](bool, float* arg, LibXR::RawData& data) {
        *arg = *reinterpret_cast<float*>(data.addr_);
    }, &latest_temp);

topic.RegisterCallback(cb);
```

## 线程安全

`Topic` 构造函数里有 `bool multi_publisher = false` 参数。默认只允许单线程/单中断发布；当设置为 `true` 时，会改用 `Mutex` 做线程同步，因此不再适合在 ISR 中直接发布。

```cpp
Topic(const char* name, uint32_t max_length, Domain* domain = nullptr,
      bool multi_publisher = false, bool cache = false, bool check_length = false);

template <typename Data>
Topic CreateTopic(const char* name, Domain* domain = nullptr,
                  bool multi_publisher = false, bool cache = false,
                  bool check_length = false);
```

## 类接口概览

| 类 / 方法 | 说明 |
|-----------|------|
| `CreateTopic<T>()` | 创建主题（带缓存与长度检查参数） |
| `Publish()` | 发布数据 |
| `SyncSubscriber` | 同步等待数据 |
| `ASyncSubscriber` | 异步读取最新数据 |
| `QueuedSubscriber` | 存入队列，保留历史 |
| `RegisterCallback()` | 注册回调函数 |
| `DumpData()` | 导出缓存数据或打包数据 |
| `PackData()` | 手动构造带头消息 |
| `Server::ParseData()` | 消息解包与转发 |
| `Server::Register()` | 注册解析目标 Topic |

## 缓存、导出与打包

`Topic` 的发布和分发是一回事，缓存是另一回事。

- 如果只想发布给订阅者，不一定需要缓存；
- 如果要 `DumpData(val)` 或 `DumpData(pkt)`，就必须启用缓存；
- `PackData()` 可以脱离缓存单独使用，适合日志、转发桥和模拟数据源。

消息打包与解析的详细格式和示例见 [数据打包与解析](./packet-server.md)。

## 应用场景

- 串口/网络消息结构化封装与解析；
- MCU 与主控通信的高效通道；
- 数据转发、日志传输与状态同步；
- 需要可选缓存、可选打包、可选多订阅模型的轻量通信场景。

## 注意事项

- 同一 `Domain` 名称将复用对象；
- 同一域名下的同名 `Topic` 将共享实例，配置需一致；
- `Topic` 为轻量包装类，支持拷贝与传参；
- 如果未启用缓存，后续 `DumpData()` 无法导出最新值。
