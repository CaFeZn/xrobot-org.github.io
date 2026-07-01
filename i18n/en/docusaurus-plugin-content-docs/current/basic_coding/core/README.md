---
id: core-coding
title: Core Components
sidebar_position: 1
---

# Core Components

This chapter introduces the core modules of the LibXR framework, providing cross-platform general-purpose data types, error handling, operation encapsulation, time utilities, and terminal formatting support. These components form the foundational support for the entire system.

## Module Overview

- [`libxr_def`](./core-def.md): Common macro definitions, error codes, and basic constants  
- [`libxr_assert`](./core-assert.md): Assertion mechanism and fatal error callbacks  
- [`libxr_cb`](./core-cb.md): Type-safe callback mechanism  
- [`libxr_type`](./core-type.md): Raw data encapsulation and type identification  
- [`libxr_mem`](./core-mem.md): Memory copy, clear, and compare helpers
- [`libxr_string`](./core-string.md): Fixed-length safe string  
- [`libxr_color`](./core-color.md): Terminal output formatting and ANSI control  
- [`print`](./core-print.md): Compile-time formatting output and sink / bounded-buffer wrappers
- [`libxr_time`](./core-time.md): Microsecond/millisecond-level timestamps and time differences  
- [`libxr_rw`](./core-rw.md): General read/write interfaces and operation encapsulation  
- [`Operation`](./core-op.md): Asynchronous completion-feedback model
- [`Pipe`](./core-pipe.md): Unidirectional pipe built on a shared byte queue

Each module will be introduced in detail in the following pages.
