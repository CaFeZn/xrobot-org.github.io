---
id: lockfree_pool
sidebar_position: 8
title: Lock-Free Unordered Slot Pool
---

# LockFreePool

`LibXR::LockFreePool<Data>` implements a **fixed-capacity, unordered**
lock-free object/data slot pool.\
It supports multi-threaded (or interrupt-context) concurrent `Put` and
`Get`.\
Each slot is managed independently, with no strict order of
input/output,\
making it suitable for high-concurrency, low-latency caching and object
reuse scenarios.

## Class Structure and Principles

- The pool consists of `SLOT_COUNT` slots, each being a
    cache-line-aligned `Slot` union containing:
  - `std::atomic<SlotState> state`: slot state machine
        (`FREE → BUSY → READY → RECYCLE`).
  - `Data data`: actual data stored in the slot.
- Lock-free concurrency is achieved using `compare_exchange_strong`
    and C++11 atomic memory orderings (acquire/release/relaxed),
    ensuring visibility and bounded timing.
- Operations are performed at the granularity of a single slot.
    Different slots do not block each other, conflicts are localized to
    the same slot.
- `Put/Get` can specify a **starting slot index** (`start_index`) to
    distribute hotspots and reduce linear probing overhead.

## Interface Functions

### Constructor & Destructor

- `LockFreePool(uint32_t slot_count)`
- `~LockFreePool()`

### Write (Put)

- `ErrorCode Put(const Data& data)`
- `ErrorCode Put(const Data& data, uint32_t& start_index)`
- `ErrorCode PutToSlot(const Data& data, uint32_t index)`

### Read (Get)

- `ErrorCode Get(Data& data)`
- `ErrorCode Get(Data& data, uint32_t& start_index)`
- `ErrorCode GetFromSlot(Data& data, uint32_t index)`

### Recycle

- `ErrorCode RecycleSlot(uint32_t index)`

### Query / Utilities

- `size_t Size() const`: current number of `READY` slots\
- `size_t EmptySize()`: current number of writable slots (`FREE` or
    `RECYCLE`)\
- `uint32_t SlotCount() const`: total slot count

> Return codes:
>
> - `ErrorCode::OK`: success\
> - `ErrorCode::FULL`: no writable slots\
> - `ErrorCode::EMPTY`: no readable slots

## Current interface boundaries

- The current `Put(const Data&, uint32_t& start_index)` / `Get(Data&, uint32_t& start_index)` paths only scan linearly forward from the supplied starting slot; if you want to restart from the beginning, the caller must reset `start_index` to `0` explicitly.
- `RecycleSlot(index)` currently succeeds only when the slot is still in `READY`; if a slot has already been consumed by `Get*()` and moved to `RECYCLE`, calling `RecycleSlot()` again does not succeed.
- The core abstraction here is an unordered slot-state machine, not a FIFO queue, so it should not be treated as a transport abstraction with ordering or fairness guarantees.

## Usage Example

### Basic Put/Get

``` cpp
LibXR::LockFreePool<int> pool(64);

// Put
if (pool.Put(42) == LibXR::ErrorCode::OK) {
  // Put succeeded
}

// Get
int value = 0;
if (pool.Get(value) == LibXR::ErrorCode::OK) {
  // use value
}
```
