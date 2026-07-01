---
id: adc
title: Analog-to-Digital Conversion
sidebar_position: 6
---

# ADC (Analog-to-Digital Conversion)

`LibXR::ADC` provides a platform-independent abstract interface for analog-to-digital conversion (ADC), used to read a floating-point value corresponding to the analog input. It is suitable for applications such as voltage monitoring and sensor data acquisition.

## Interface Definition

```cpp
class ADC {
public:
  ADC() = default;

  // Reads the ADC floating-point value
  virtual float Read() = 0;
};
```

- `Read()` is a pure virtual function, and must be implemented by subclasses to provide specific sampling logic;  
- the base interface only guarantees a `float` return value, and does not define one universal physical unit, reference voltage, or calibration rule;
- in many concrete implementations this value is organized as a voltage reading, but the actual unit and range still depend on the backend and upper-layer convention.
