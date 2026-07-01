---
id: stm32-code-gen-timebase
title: Time Base
sidebar_position: 2
---

# Time Base

STM32CubeMX uses SysTick as the default time base, but other timers can also be selected manually.

For bare-metal projects, keeping SysTick as the time base is usually fine, although raising SysTick interrupt priority is generally recommended.

For RTOS-based projects, using another timer as the time base is usually preferable, and the selected timer interrupt should typically be kept at the highest practical priority.

From the current generator’s perspective, this page mainly determines the shape of the single timebase instance constructed before `PlatformInit(...)`.

## Example

The generator emits one of the following shapes according to the CubeMX timebase configuration:

```cpp
// SysTick as the time base
STM32Timebase timebase;
```

```cpp
// A timer as the time base
STM32TimerTimebase timebase(&htimX); // X is the selected timebase timer
```

## Current generator coverage

In current `GeneratorCodeSTM32.py`, the timebase generation path mainly does the following:

- when `Timebase.Source == SysTick`, emit `STM32Timebase timebase;`
- when `Timebase.Source` is `TIMx / LPTIMx / HRTIMx`, emit `STM32TimerTimebase timebase(&hxxx);`
- after that, whether `PlatformInit(...)` is emitted with no arguments or with software-timer priority / stack arguments depends on the current `SYSTEM` setting (`None / FreeRTOS / ThreadX`).

## Usage

```cpp
// Get microsecond timestamps
LibXR::Timebase::GetMicroseconds();

// Get millisecond timestamps
LibXR::Timebase::GetMilliseconds();
```
