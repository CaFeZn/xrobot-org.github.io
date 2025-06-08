---
id: core-rw
title: IO Read/Write Abstraction
sidebar_position: 8
---

# IO Read/Write Abstraction

This module defines the generic `ReadPort` and `WritePort` interface classes for cross-platform encapsulation of various I/O behaviors such as asynchronous, blocking, and polling. It binds completion feedback mechanisms via the `Operation` model. To adapt to different underlying drivers, simply implement the corresponding read/write functions and assign them to the port object to gain full asynchronous I/O capability.

## Core Types

### ReadPort / WritePort

`ReadPort` and `WritePort` encapsulate the invocation process, buffer management, and synchronization mechanisms for read/write operations. Each call is accompanied by an `Operation` instance to explicitly specify the desired completion feedback behavior (callback, blocking, polling, or ignore).

### ReadOperation / WriteOperation

```cpp
typedef Operation<ErrorCode> ReadOperation;
typedef Operation<ErrorCode> WriteOperation;
```

These represent asynchronous I/O operations with a completion response behavior. Callbacks, semaphores, or polling status variables can be passed via the constructor—see the [`core-operation`](./core-op.md) page for details.

## ReadPort Interface

### Initialization

```cpp
ReadPort(size_t buffer_size = 128);
```

Constructor that allocates the receive buffer, with a default size of 128 bytes.

### Set Read Function

```cpp
ReadPort &operator=(ReadFun fun);
```

Sets the read function pointer, usually called by the underlying driver—users typically don’t need to manage this.

### Submit Read Request

```cpp
ErrorCode operator()(RawData data, ReadOperation &op);
```

Requests to read `data.size_` bytes; blocks, polls, or invokes a callback depending on `op`.

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Readable();
```

Used to check buffer status and whether data is available to read.

### Process Pending Reads

```cpp
void ProcessPendingReads(bool in_isr);
```

Actively checks and completes previously pending read operations. Typically invoked by the driver after new data arrives.

### Reset State

```cpp
void Reset();
```

Clears the buffer and internal state.

## WritePort Interface

### Initialization

```cpp
WritePort(size_t queue_size = 3, size_t buffer_size = 128);
```

Constructor that allocates the write queue and buffer, supporting queuing of multiple write requests.

### Set Write Function

```cpp
WritePort &operator=(WriteFun fun);
```

Sets the write function pointer, usually assigned by the underlying driver.

### Submit Write Request

```cpp
ErrorCode operator()(ConstRawData data, WriteOperation &op);
```

Adds data to the write queue and handles completion based on the behavior of `op`.

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Writable();
```

Checks buffer space and whether data can be written.

### Reset State

```cpp
void Reset();
```

Clears the write queue and internal state.

## STDIO Interface

LibXR provides a global `STDIO` interface that can be bound to `ReadPort` / `WritePort` instances and used with the `Printf(...)` function to output debug information.

```cpp
LibXR::STDIO::write_ = uart_cdc.write_port_;
LibXR::STDIO::Printf("Hello, %d", 123);
```

## Usage Examples

```cpp
// Blocking write to UART, timeout set to 100ms (default is infinite wait)
WriteOperation op_block(sem, 100);
uart.Write("Hello", op_block);

// Asynchronous read with callback
ReadOperation op_cb(callback);
uart.Read(buffer, op_cb);
```

---

`ReadPort` and `WritePort` are the core interfaces of the LibXR I/O abstraction layer. They provide unified data buffering and completion feedback mechanisms, suitable for data stream scenarios such as UART, network, and file systems.
