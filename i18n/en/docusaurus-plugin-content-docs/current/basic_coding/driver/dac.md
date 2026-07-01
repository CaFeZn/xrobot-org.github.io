---
id: dac
title: Digital-to-Analog Conversion
sidebar_position: 7
---

# DAC (Digital-to-Analog Conversion)

`LibXR::DAC` provides a platform-independent abstract interface for digital-to-analog conversion (DAC), used to output an analog quantity represented by a floating-point value.

## Interface Definition

```cpp
class DAC {
public:
  DAC() = default;

  // Outputs the DAC floating-point value
  virtual ErrorCode Write(float voltage) = 0;
};
```

- `Write(voltage)` is a pure virtual function, and must be implemented by derived classes;
- the base interface only guarantees that the argument type is `float`, and does not define one universal physical unit, reference voltage, or calibration rule;
- in many concrete implementations this value is interpreted as a voltage target, but the actual unit and output range still depend on the backend;
- Returns `ErrorCode`, indicating success or failure of the operation;

## Example Usage

```cpp
// Example: output one floating-point target value to the DAC
dac->Write(1.23f);
```
