---
id: stm32-code-gen-pwm
title: PWM
sidebar_position: 6
---

# PWM

The code generation tool will parse all timer channels configured for PWM output and generate the corresponding code.

## Example

```cpp
STM32PWM pwm_timX_chX(&htimX, TIM_CHANNEL_1);
```
