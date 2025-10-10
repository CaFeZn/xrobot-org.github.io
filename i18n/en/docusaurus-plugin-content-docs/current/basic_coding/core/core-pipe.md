---
id: core-pipe
title: Pipe — Unidirectional Pipe
sidebar_position: 12
---

# Pipe — Unidirectional Pipe

`Pipe` connects a `WritePort` and a `ReadPort` through the **same lock-free byte queue** into a **unidirectional** data channel: bytes written by the writer can be read directly by the reader, with no intermediate copy between ports (there is only a single copy into the shared queue). This class is suitable for efficient data forwarding and loopback tests between threads/tasks/ISRs and tasks.

---

## Feature Overview

- **Zero extra copies**: writer writes → goes directly into the shared queue → reader takes from the same queue.
- **ISR-friendly**: the `in_isr` flag ensures that advancing the read side follows interrupt-context constraints.
- **Consistent semantics with `ReadPort`/`WritePort`**: completion modes such as blocking/callback/polling are uniformly controlled by `Operation`.

---

## Public API

```cpp
class Pipe {
public:
  // Construct with the capacity (bytes) of the shared data queue; in_isr = true
  // indicates callbacks may run in ISR context
  Pipe(size_t buffer_size, bool in_isr = false);

  // Non-copyable / non-assignable
  Pipe(const Pipe&) = delete;
  Pipe& operator=(const Pipe&) = delete;
  ~Pipe() = default;

  // Port access
  ReadPort&  GetReadPort();
  WritePort& GetWritePort();
};
```

- `buffer_size`: total capacity of the shared queue (in bytes) used to hold written data. Immutable after creation.
- `in_isr`: indicates whether `WriteFun` should advance the read side with ISR semantics (e.g., avoid blocking / perform only necessary progress).

> `Pipe` does not directly expose methods like `Size`/`Reset`—please use the corresponding port interfaces via `GetReadPort()` / `GetWritePort()`.
