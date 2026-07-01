---
id: dac
title: 数模转换
sidebar_position: 7
---

# DAC（数模转换）

`LibXR::DAC` 提供平台无关的数字转模拟（DAC）抽象接口，用于输出一个浮点值对应的模拟量。

## 接口定义

```cpp
class DAC {
public:
  DAC() = default;

  // 输出 DAC 浮点值
  // Outputs the DAC floating-point value
  virtual ErrorCode Write(float voltage) = 0;
};
```

- `Write(voltage)` 是纯虚函数，子类需实现具体的输出逻辑；
- 当前基类只约定参数类型为 `float`，并不在接口层统一规定量纲、参考电压或标定方式；
- 在很多平台实现里，这个值通常会被当作“电压值”解释，但具体单位与可输出范围仍由具体后端决定；
- 返回 `ErrorCode`，用于表示输出过程中的错误或成功状态；

## 典型用法

```cpp
// 示例：向 DAC 输出一个浮点目标值
dac->Write(1.23f);
```
