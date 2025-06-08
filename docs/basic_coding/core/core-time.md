---
id: core-time
title: 时间戳与时间差
sidebar_position: 7
---

# 时间戳与时间差

本模块定义了微秒级和毫秒级的时间戳类型 `TimestampUS` 和 `TimestampMS`，用于表示系统时钟时间，并可计算两个时间点之间的时间差。适用于定时器、延迟控制、性能分析等场景。

## TimestampUS

```cpp
class TimestampUS {
 public:
  TimestampUS();
  TimestampUS(uint64_t microsecond);
  operator uint64_t() const;
  TimeDiffUS operator-(const TimestampUS &old) const;
};
```

表示微秒级时间戳，支持隐式转换为 `uint64_t`，可计算时间差。

### TimeDiffUS

```cpp
class TimeDiffUS {
 public:
  TimeDiffUS(uint64_t diff);
  operator uint64_t() const;
  double to_second() const;
  float to_secondf() const;
  uint64_t to_microsecond() const;
  uint32_t to_millisecond() const;
};
```

表示两个 `TimestampUS` 之间的差值，单位为微秒。支持以秒/毫秒返回差值。

## TimestampMS

```cpp
class TimestampMS {
 public:
  TimestampMS();
  TimestampMS(uint32_t millisecond);
  operator uint32_t() const;
  TimeDiffMS operator-(TimestampMS &old);
};
```

表示毫秒级时间戳，支持隐式转换为 `uint32_t`，可计算时间差。

### TimeDiffMS

```cpp
class TimeDiffMS {
 public:
  TimeDiffMS(uint32_t diff);
  operator uint32_t() const;
  double to_second();
  float to_secondf();
  uint32_t to_millisecond() const;
  uint64_t to_microsecond() const;
};
```

表示两个 `TimestampMS` 之间的差值，单位为毫秒。支持以秒/微秒返回差值。

## 溢出处理

时间差计算中已考虑时间戳回绕（如溢出），可用于嵌入式平台上的系统时钟处理。

---

本模块是 LibXR 时间处理的基础，可结合 IO、调度器、定时器等模块使用，确保时间相关操作的精度与可移植性。
