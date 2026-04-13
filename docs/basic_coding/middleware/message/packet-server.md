---
id: message-packet-server
title: 数据打包与解析
sidebar_position: 2
---

# 数据打包与解析

`Message` 模块提供统一的打包格式 `PackedData<T>` 和服务端解析器 `Server`，可用于串口、CAN、网络等链路上的结构化消息传输。

## 打包数据示例

```cpp
float value = 36.5f;
topic.Publish(value);

LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

> `DumpData(pkt)` 依赖 `Topic` 缓存；如果创建 `Topic` 时没有启用 `cache`，这里会返回 `ErrorCode::EMPTY`。

## 数据包格式

| 字段 | 含义 |
|------|------|
| `0xA5` | 固定头部 |
| CRC32 | Topic 名称校验 |
| Length | 数据长度（24 位） |
| CRC8 | 头部校验 |
| Data | 实际数据 |
| CRC8 | 尾部校验 |

## 服务端解析示例

```cpp
LibXR::Topic::Server server(512);
server.Register(topic);
server.ParseData(LibXR::ConstRawData(pkt));
```

它会处理粘包与拆包，校验数据并丢弃无效数据，然后把结果发布到对应的 `Topic`。

## 数据导出与 `PackData`

### 读取缓存数据

```cpp
float val = 0;
topic.DumpData(val);
```

### 打包为网络格式

```cpp
LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

### 手动打包任意数据

```cpp
float value = 123.45f;
LibXR::RawData src(value);
uint8_t buffer[128];
LibXR::RawData dst(buffer, sizeof(buffer));

Topic::PackData(topic.GetKey(), dst, src);
```

## 方法对比

| 场景 | 推荐方法 | 是否依赖缓存 | 是否打包 |
|------|----------|---------------|-----------|
| 获取最新值 | `DumpData(DataType)` | 需要缓存 | ❌ 否 |
| 网络打包 | `DumpData(PackedData&)` | 需要缓存 | ✅ 是 |
| 自定义 buffer | `DumpData<Mode>(RawData, pack)` | 需要缓存 | 可选 |
| 独立打包 | `PackData()` | ❌ 否 | ✅ 是 |

## 相关接口

| 方法 | 说明 |
|------|------|
| `DumpData()` | 导出缓存数据或打包数据 |
| `PackData()` | 手动构造带头消息 |
| `Server::ParseData()` | 消息解包与转发 |
| `Server::Register()` | 注册解析目标 Topic |
