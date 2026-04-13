---
id: swd-gpio
title: SWD GPIO Implementation
sidebar_position: 2
---

# SWD GPIO Implementation

`LibXR::Debug::SwdGeneralGPIO<SwclkGpioType, SwdioGpioType>` is a GPIO polling (bit-bang) SWD probe implementation. It inherits from `LibXR::Debug::Swd`, provides SWD link-layer capability, and is typically used by upper layers such as a CMSIS-DAP processor or debugger.

The focus here is on practical usage and on choosing/calibrating the delay parameter `loops_per_us`, not on implementation details.

---

## 1. Overview

`SwdGeneralGPIO` implements SWD using two GPIOs:

- SWCLK: driven by `SwclkGpioType` to output the clock.
- SWDIO: provided by `SwdioGpioType` for bidirectional data, switching at runtime between “output drive” and “input sampling”.

Timing is generated in software: it computes the number of busy-loop iterations for each half-period from the target clock `hz` and the delay calibration factor `loops_per_us`, approximating the requested SWCLK.

Recommended external circuitry (strongly recommended):
- 33Ω series resistors on SWCLK/SWDIO (current limiting / ringing suppression)
- 10k pull-up on SWDIO

---

## 2. Template Parameters and Required GPIO Capabilities

Class definition:

```cpp
template <typename SwclkGpioType, typename SwdioGpioType>
class SwdGeneralGPIO final : public Swd;
```

Minimum expected capabilities from the GPIO types (abstractly):
- `SetConfig({Direction, Pull}) -> ErrorCode`
- `Write(bool)`
- `Read() -> bool`

SWDIO must support two configurations:
- Output drive: `OUTPUT_PUSH_PULL`
- Input sampling: `INPUT + PULL_UP`

---

## 3. Quick Start

Constructor:

```cpp
explicit SwdGeneralGPIO(SwclkGpioType& swclk,
                        SwdioGpioType& swdio,
                        uint32_t loops_per_us,
                        uint32_t default_hz = DEFAULT_CLOCK_HZ);
```

Typical usage flow:
1) Create GPIO objects and the probe instance (start with a “conservative” frequency and a calibrated `loops_per_us`).
2) Call `EnterSwd()` on the target (recommended if you are unsure which debug mode the target is in).
3) Use the `Swd` base class “retry-enabled” APIs in upper layers (to handle WAIT, insert idle clocks, etc.).

Example:

```cpp
using Probe = LibXR::Debug::SwdGeneralGPIO<MyGpio, MyGpio>;

MyGpio swclk, swdio;

// Calibrate loops_per_us first; start default_hz conservatively (e.g., 100k~500k)
Probe probe(swclk, swdio, /*loops_per_us=*/calibrated, /*default_hz=*/500000);

probe.EnterSwd();

// Upper layers should prefer a retry-enabled path (illustrative; depends on your Swd wrappers)
uint32_t idcode = 0;
LibXR::Debug::SwdProtocol::Ack ack;
probe.ReadIdCode(idcode, ack);
```

---

## 4. Clock and Delay Parameter (Key)

### 4.1 Meaning and Behavior of `hz`

`SetClockHz(hz)` sets the **target SWCLK frequency**.

- `hz` is clamped to the range supported by this implementation (values below the minimum are raised; values above the maximum are lowered).
- Whether the actual frequency matches the configured value depends on `loops_per_us`, GPIO toggle speed, CPU load, etc.
- `hz == 0` forces the internal “no-delay path” (no BusyLoop delay is inserted). In this mode, the SWCLK frequency is determined by CPU and GPIO toggle speed and is typically “as fast as possible”.

### 4.2 What `loops_per_us` Means

`loops_per_us` is a **delay calibration factor**: the approximate number of BusyLoop iterations required per 1 microsecond.

It is not a universal constant and typically varies significantly with:
- CPU clock frequency
- Compiler optimization level (`-O0/-O2/-Os`, etc.)
- LTO and compiler version
- Instruction/bus wait states (on some MCUs, power/clock domains may also affect it)

Whenever any of the above changes, you should re-calibrate `loops_per_us`.

### 4.3 When the “No-Delay Path” Is Used

In practice, the implementation enters the “no-delay path” in two cases:
- You explicitly set `loops_per_us = 0`; or
- At a high enough `hz`, the computed half-period delay is < 1 loop, so the internal half-period loop count becomes 0 and the implementation automatically switches to the no-delay path.

Implications of the no-delay path:
- Pros: lower overhead and higher throughput.
- Cons: SWCLK is no longer precisely controlled by `hz`; it becomes “as fast (and as stable) as the platform allows”.

Engineering guidance:
- If you need a **controllable and reproducible** SWCLK, ensure the computed `half_period_loops_` is clearly > 0 (i.e., calibrate `loops_per_us` properly and avoid overly high `hz`).
- If you only need it to **work and be as fast as possible**, you may set `loops_per_us = 0`, or set `hz` high enough that the implementation naturally falls into the no-delay path.

---

## 5. Choosing and Calibrating `loops_per_us`

Two common calibration methods are provided below. The key principle: calibrate under the **same compiler options and the same CPU frequency** as your final firmware.

### Method A: Calibrate with a Hardware Timer / Cycle Counter

Idea: run a BusyLoop with a known iteration count and measure elapsed time, then infer `loops_per_us`.

Steps:
1) Choose a sufficiently large iteration count N (e.g., around 1e6) so measurement time is well above timer resolution.
2) Record start time t0, run BusyLoop(N), record end time t1.
3) Compute elapsed time `dt_us` in microseconds.
4) `loops_per_us ≈ N / dt_us` (integer rounding is fine).

Pros: independent of SWD/target state; after calibration, frequency control is predictable.

### Method B: Fit by Measuring SWCLK with a Logic Analyzer / Oscilloscope

Idea: start with a rough `loops_per_us`, set a low-to-mid `hz` (e.g., 100 kHz or 500 kHz), measure SWCLK frequency, and adjust `loops_per_us` until it matches.

Steps:
1) Start with a configuration that **ensures the delayed path is used** (i.e., choose a lower `hz`).
2) Measure SWCLK frequency `f_meas`.
3) Adjust proportionally: `loops_per_us_new ≈ loops_per_us_old * (f_meas / f_target)`, iterate 1–2 times to converge.

Pros: no need to use timer resources; GPIO toggle overhead is included in the fit.  
Note: If you are already in the no-delay path (very high frequency), this method may stop working, because adjusting `loops_per_us` may not bring you back into the delayed path.

---

## 6. Practical Frequency Selection

Increase frequency gradually from conservative to aggressive, rather than starting at the limit:

- Initial bring-up: 100 kHz ~ 500 kHz (easier to debug wiring and signal integrity)
- After stable: try 1 MHz, 2 MHz, 4 MHz in steps
- For higher speeds: first confirm trace length, series damping, ground reference, and target pin drive capability; then increase frequency

If you see the following symptoms, it usually indicates frequency is too high or signal integrity is insufficient:
- ACK frequently becomes WAIT/FAULT/NO_ACK
- Parity failures on read data
- Instability only on certain cable lengths / certain boards

Recommended mitigation order:
1) Lower frequency first;
2) Verify 33Ω series resistors and SWDIO pull-up;
3) Shorten the cable / improve grounding;
4) Re-calibrate `loops_per_us` (especially after changing compiler optimization options).

---

## 7. Close and Safe State

Calling `Close()` returns the probe pins to a safer state (useful when exiting debug or switching pin muxing):
- SWCLK driven high
- SWDIO switched to input with pull-up
