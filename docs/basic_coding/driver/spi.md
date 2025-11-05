---
id: spi
title: SPI
sidebar_position: 4
---

# SPI（串行外设接口）

`LibXR::SPI` 提供平台无关的 SPI 总线通信抽象接口，支持全双工传输、寄存器读写和通信参数配置，适用于传感器、显示器等外设驱动。

## 接口概览

### 枚举类型

```cpp
enum class ClockPolarity : uint8_t {
  LOW,   // 空闲时低电平
  HIGH   // 空闲时高电平
};

enum class ClockPhase : uint8_t {
  EDGE_1, // 第一个时钟边沿采样
  EDGE_2  // 第二个时钟边沿采样
};

enum class Prescaler : uint8_t {
  DIV_1 = 0, DIV_2, DIV_4, DIV_8, DIV_16, DIV_32, DIV_64, DIV_128,
  DIV_256, DIV_512, DIV_1024, DIV_2048, DIV_4096, DIV_8192,
  DIV_16384, DIV_32768, DIV_65536,
  UNKNOWN = 0xFF // 未知分频系数
};
```

### 配置结构

```cpp
struct Configuration {
  ClockPolarity clock_polarity = ClockPolarity::LOW;
  ClockPhase    clock_phase    = ClockPhase::EDGE_1;
  Prescaler     prescaler      = Prescaler::UNKNOWN;
  bool          double_buffer  = false;
};
```

### 主要接口

```cpp
// 构造与配置
SPI(RawData rx_buffer, RawData tx_buffer);
virtual ErrorCode SetConfig(Configuration config) = 0;
inline Configuration& GetConfig();
inline bool IsDoubleBuffer() const;

// 速率/分频能力
virtual uint32_t GetMaxBusSpeed() const = 0;
virtual Prescaler GetMaxPrescaler() const = 0;
uint32_t GetBusSpeed() const;
Prescaler CalcPrescaler(uint32_t target_max_bus_speed,
                        uint32_t target_min_bus_speed,
                        bool increase);

// 缓冲管理（零拷贝 & 双缓冲）
RawData GetRxBuffer();
RawData GetTxBuffer();
void SwitchBuffer();
void SetActiveLength(size_t len);
size_t GetActiveLength() const;

// 传输接口
virtual ErrorCode ReadAndWrite(RawData read_data,
                               ConstRawData write_data,
                               OperationRW& op) = 0;

virtual ErrorCode Read(RawData read_data, OperationRW& op);
virtual ErrorCode Write(ConstRawData write_data,
                        OperationRW& op);

virtual ErrorCode Transfer(size_t size,
                           OperationRW& op) = 0;

// 寄存器读写
virtual ErrorCode MemWrite(uint16_t reg,
                           ConstRawData write_data,
                           OperationRW& op) = 0;

virtual ErrorCode MemRead(uint16_t reg,
                          RawData read_data,
                          OperationRW& op) = 0;
```

### 操作结构体

```cpp
struct ReadWriteInfo {
  RawData read_data;
  ConstRawData write_data;
  OperationRW op;
};
```

## 特性总结

- 支持 SPI 的极性与相位配置；
- **分频（Prescaler）**与**总线速率计算**，可按目标速率范围选择合适分频；
- 提供全双工传输接口与**零拷贝 `Transfer`**，并支持**双缓冲**以降低抖动、提升吞吐；
- 通用操作模型（`OperationRW = WriteOperation`），支持同步、回调、轮询等模式；
