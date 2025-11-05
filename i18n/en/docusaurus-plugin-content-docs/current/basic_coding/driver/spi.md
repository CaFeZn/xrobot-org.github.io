---
id: spi
title: SPI
sidebar_position: 4
---

# SPI (Serial Peripheral Interface)

`LibXR::SPI` provides a platform-agnostic abstraction for SPI bus communication. It supports full‑duplex transfers, register read/write, and communication parameter configuration, making it suitable for drivers of peripherals such as sensors and displays.

## Interface Overview

### Enumerations

```cpp
enum class ClockPolarity : uint8_t {
  LOW,   // Idle low level
  HIGH   // Idle high level
};

enum class ClockPhase : uint8_t {
  EDGE_1, // Sample on the first clock edge
  EDGE_2  // Sample on the second clock edge
};

enum class Prescaler : uint8_t {
  DIV_1 = 0, DIV_2, DIV_4, DIV_8, DIV_16, DIV_32, DIV_64, DIV_128,
  DIV_256, DIV_512, DIV_1024, DIV_2048, DIV_4096, DIV_8192,
  DIV_16384, DIV_32768, DIV_65536,
  UNKNOWN = 0xFF // Unknown divider
};
```

### Configuration Structure

```cpp
struct Configuration {
  ClockPolarity clock_polarity = ClockPolarity::LOW;
  ClockPhase    clock_phase    = ClockPhase::EDGE_1;
  Prescaler     prescaler      = Prescaler::UNKNOWN;
  bool          double_buffer  = false;
};
```

### Primary APIs

```cpp
// Construction & configuration
SPI(RawData rx_buffer, RawData tx_buffer);
virtual ErrorCode SetConfig(Configuration config) = 0;
inline Configuration& GetConfig();
inline bool IsDoubleBuffer() const;

// Rate / prescaler capabilities
virtual uint32_t GetMaxBusSpeed() const = 0;
virtual Prescaler GetMaxPrescaler() const = 0;
uint32_t GetBusSpeed() const;
Prescaler CalcPrescaler(uint32_t target_max_bus_speed,
                        uint32_t target_min_bus_speed,
                        bool increase);

// Buffer management (zero-copy & double buffering)
RawData GetRxBuffer();
RawData GetTxBuffer();
void SwitchBuffer();
void SetActiveLength(size_t len);
size_t GetActiveLength() const;

// Transfer interface
virtual ErrorCode ReadAndWrite(RawData read_data,
                               ConstRawData write_data,
                               OperationRW& op) = 0;

virtual ErrorCode Read(RawData read_data, OperationRW& op);
virtual ErrorCode Write(ConstRawData write_data,
                        OperationRW& op);

virtual ErrorCode Transfer(size_t size,
                           OperationRW& op) = 0;

// Register read/write
virtual ErrorCode MemWrite(uint16_t reg,
                           ConstRawData write_data,
                           OperationRW& op) = 0;

virtual ErrorCode MemRead(uint16_t reg,
                          RawData read_data,
                          OperationRW& op) = 0;
```

### Operation Struct

```cpp
struct ReadWriteInfo {
  RawData read_data;
  ConstRawData write_data;
  OperationRW op;
};
```

## Feature Summary

- Supports configuration of SPI clock **polarity** and **phase**.
- **Prescaler** and **bus-rate calculation**: choose an appropriate prescaler within a target speed range.
- Provides full‑duplex transfer APIs and **zero‑copy `Transfer`**, with **double buffering** to reduce jitter and improve throughput.
- A generic operation model (`OperationRW = WriteOperation`) supporting synchronous, callback, and polling modes.