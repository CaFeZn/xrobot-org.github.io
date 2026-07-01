---
id: system-coding
title: Operating System
sidebar_position: 4
---

# Operating System

This module provides LibXR's unified abstraction for low-level OS resources such as thread management, synchronization primitives, and timers, ensuring seamless portability across various RTOSes, Linux, and bare-metal environments.

## Contents

- [Thread](./thread.md)
- [Mutex](./mutex.md)
- [Semaphore](./semaphore.md)
- [Async](./async.md)
- [Timer](./timer.md)

Notes:

- This group describes LibXR's unified abstraction layer across different system backends such as `linux / freertos / threadx / none`; it is not a promise that every backend shares the same implementation strategy.
- For example, current mainline already handles backend-specific differences in `Mutex / Semaphore / Timer / Thread`, including priority inheritance, polling waits, and placeholder thread behavior. Read the concrete page for behavior details instead of relying on the directory page alone.

For usage details and platform differences, see the individual pages.
