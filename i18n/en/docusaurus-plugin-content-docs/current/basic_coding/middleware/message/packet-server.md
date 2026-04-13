---
id: message-packet-server
title: Packet Packing and Parsing
sidebar_position: 2
---

# Packet Packing and Parsing

The `Message` module provides a unified `PackedData<T>` format and a `Server` parser for structured transport over UART, CAN, network links, and similar channels.

## Packet Example

```cpp
float value = 36.5f;
topic.Publish(value);

LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

> `DumpData(pkt)` depends on topic cache. If cache was not enabled when the topic was created, this call returns `ErrorCode::EMPTY`.

## Packet Layout

| Field | Meaning |
|------|------|
| `0xA5` | fixed prefix |
| CRC32 | topic name checksum |
| Length | payload length (24-bit) |
| CRC8 | header checksum |
| Data | payload |
| CRC8 | tail checksum |

## Server Parsing Example

```cpp
LibXR::Topic::Server server(512);
server.Register(topic);
server.ParseData(LibXR::ConstRawData(pkt));
```

The parser handles sticky packets and fragmented input, validates the frame, and publishes valid payloads to the target `Topic`.

## Data Export and `PackData`

### Read Cached Data

```cpp
float val = 0;
topic.DumpData(val);
```

### Export as PackedData

```cpp
LibXR::Topic::PackedData<float> pkt;
topic.DumpData(pkt);
```

### Pack Arbitrary Data Manually

```cpp
float value = 123.45f;
LibXR::RawData src(value);
uint8_t buffer[128];
LibXR::RawData dst(buffer, sizeof(buffer));

Topic::PackData(topic.GetKey(), dst, src);
```

## Method Comparison

| Scenario | Recommended method | Needs cache | Packed |
|------|----------|---------------|-----------|
| Get latest value | `DumpData(DataType)` | Yes | No |
| Build network packet | `DumpData(PackedData&)` | Yes | Yes |
| Fill custom buffer | `DumpData<Mode>(RawData, pack)` | Yes | Optional |
| Pack without cache | `PackData()` | No | Yes |
