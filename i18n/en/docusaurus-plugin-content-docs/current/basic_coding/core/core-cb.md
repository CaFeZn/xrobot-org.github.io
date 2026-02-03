---
id: core-callback
title: General Callback
sidebar_position: 3
---

# General Callback

This module provides a lightweight and ISR-safe general callback system, including the `Callback` and `CallbackBlock` template classes, commonly used for asynchronous notifications, event handling, and error callbacks.

## CallbackBlock

```cpp
template <typename ArgType, typename... Args>
class CallbackBlock;
```

Encapsulates a concrete callback function together with its first bound argument, and adds a reentrancy guard so it can be triggered safely from ISR or task contexts:

- `FunctionType`: Callback function signature: `void(bool in_isr, ArgType arg, Args... args)`.
- `Call(bool in_isr, Args... args)`: Triggers the callback and forwards extra arguments.

Binding is completed during construction. Supports move construction and assignment, copy is disabled.

### Reentrancy Guard Semantics

The guard prevents callback chains from blowing up the stack when they form loops (for example A → B → C → A, re-triggering the same callback while it is still running).

If the same `CallbackBlock` is triggered again while it is executing:

- No new nested stack frame is created (the callback is **not** invoked recursively).
- Only one pending request is cached (a snapshot of the latest arguments overwrites previous pending arguments).
- Once the current invocation finishes, the pending request is replayed at the same call site via a trampoline-style loop until no pending call remains.

> To cache the pending arguments, the implementation stores `Args...` as `std::decay_t` copies internally.

## Callback

```cpp
template <typename... Args>
class Callback;
```

A further abstraction of `CallbackBlock`, providing a unified interface, type erasure, and factory methods.

### Creating a callback

```cpp
LibXR::Callback<Args...> cb = LibXR::Callback<Args...>::Create(fun, bound_arg);
```

- `fun`: Callback function in the form `void(bool, BoundArgType, Args...)` and **must be convertible to a function pointer** (plain functions, static member functions, capture-less lambdas, etc.).
- `bound_arg`: The first argument bound to the callback

> `Create` currently performs `new CallbackBlock<BoundArgType, Args...>`, so it **allocates dynamically** and `Callback` itself does not manage deallocation.

### Running a callback

```cpp
cb.Run(in_isr, arg1, arg2, ...);
```

Any number of additional arguments can be passed. `in_isr` indicates if the call is within an interrupt context. Calling `Run` on an empty callback is a safe no-op.

### Other interfaces

- `Empty()`: Checks if the callback is empty (`cb_block_ == nullptr`).
- Supports default constructor, copy constructor, move constructor, and assignment.
  - Copying is shallow: multiple `Callback` instances share the same block pointer and entry point.

## Example Usage

```cpp
void OnEvent(bool in_isr, int context, const char* msg) {
  printf("ISR=%d context=%d msg=%s\n", in_isr, context, msg);
}

auto cb = LibXR::Callback<const char*>::Create(OnEvent, 42);
cb.Run(false, "Hello");
```

Output:

```bash
ISR=0 context=42 msg=Hello
```

## Design Features

- **Reentrancy guard**: Re-entrant triggers collapse into a pending request and are replayed at the current call site (trampoline flattening).
- **ISR-friendly**: Every interface explicitly carries `in_isr`, making it safe to run inside interrupts.
- **Type-safe encapsulation**: Templates and type deduction perform binding and invocation in a type-safe manner.
- **Lightweight & embeddable**: Minimal structure suitable for IO, timers, event buses, and other callback-based modules.

---

This module serves as the foundation of LibXR's asynchronous mechanism and callback interface. It's suitable for use in IO, timers, event dispatch, and other callback-based modules.
