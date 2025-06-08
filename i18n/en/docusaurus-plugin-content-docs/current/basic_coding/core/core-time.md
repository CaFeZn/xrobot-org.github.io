---
id: core-time
title: Timestamps and Time Differences
sidebar_position: 7
---

# Timestamps and Time Differences

This module defines microsecond- and millisecond-level timestamp types `TimestampUS` and `TimestampMS`, which represent system clock times and can be used to compute the time difference between two points. It is suitable for scenarios such as timers, delay control, and performance analysis.

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

Represents a microsecond-level timestamp. Supports implicit conversion to `uint64_t` and can be used to compute time differences.

### TimeDiffUS

```cpp
class TimeDiffUS {
 public:
  TimeDiffUS(uint64_t diff);
  operator uint64_t() const;
  double ToSecond() const;
  float ToSecondf() const;
  uint64_t ToMicrosecond() const;
  uint32_t ToMillisecond() const;
};
```

Represents the time difference between two `TimestampUS` instances, in microseconds. Supports conversion to seconds and milliseconds.

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

Represents a millisecond-level timestamp. Supports implicit conversion to `uint32_t` and can be used to compute time differences.

### TimeDiffMS

```cpp
class TimeDiffMS {
 public:
  TimeDiffMS(uint32_t diff);
  operator uint32_t() const;
  double ToSecond();
  float ToSecondf();
  uint64_t ToMicrosecond() const;
  uint32_t ToMillisecond() const;
};
```

Represents the time difference between two `TimestampMS` instances, in milliseconds. Supports conversion to seconds and microseconds.

## Overflow Handling

Time difference computations handle timestamp wrap-around (e.g., overflow), making it suitable for system clock management on embedded platforms.

---

This module forms the basis of time handling in LibXR and can be used with IO, schedulers, timers, and other modules to ensure precision and portability in time-related operations.
