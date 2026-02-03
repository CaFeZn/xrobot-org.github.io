---
id: core-rw
title: IO Read/Write Abstraction
sidebar_position: 8
---

# IO Read/Write Abstraction

This module defines the generic `ReadPort` and `WritePort` interface classes for cross-platform encapsulation of various I/O behaviors such as asynchronous, blocking, and polling. It binds completion feedback mechanisms via the `Operation` model. To adapt to different underlying drivers, simply implement the corresponding read/write functions and assign them to the port object to gain full asynchronous I/O capability.

`ReadPort`, `WritePort`, and `WritePort::Stream` are implemented using atomic operations and lock-free data structures, enabling the entire read and write process to be performed without any system calls, while still ensuring thread safety. The "locks" mentioned below are purely logical abstractions and do not involve any actual mutex operations.

> Note: the default constructors of `ReadPort` / `WritePort` create internal lock-free queues and buffers (one-time allocation/initialization during construction) to hold data and write metadata.

## Core Types

### ReadPort / WritePort

`ReadPort` and `WritePort` encapsulate the invocation process, buffer management, and synchronization mechanisms for read/write operations. Each call is accompanied by an `Operation` instance to explicitly specify the desired completion feedback behavior (callback, blocking, polling, or ignore).

### ReadOperation / WriteOperation

```cpp
typedef Operation<ErrorCode> ReadOperation;
typedef Operation<ErrorCode> WriteOperation;
```

These represent asynchronous I/O operations with a completion response behavior. Callbacks, semaphores, or polling status variables can be passed via the constructor - see the `core-op` page for details.

## ReadPort Interface

### Initialization

```cpp
ReadPort(size_t buffer_size = 128);
```

Constructor that creates the receive buffer (lock-free queue), with a default size of 128 bytes.

### Set Read Function

```cpp
ReadPort &operator=(ReadFun fun);
```

Sets the read function pointer, usually bound during the driver initialization phase.

### Submit Read Request

```cpp
ErrorCode operator()(RawData data, ReadOperation &op, bool in_isr = false);
```

Requests to read `data.size_` bytes; blocks, polls, or invokes a callback depending on `op`.

- If another read is already pending (internal BusyState is PENDING), this call returns `ErrorCode::BUSY` immediately.
- When `data.size_ == 0`, the read semantics become "wait until any data is readable, then succeed" (in BLOCK mode it will actually wait).

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Readable();
```

Used to check buffer status and whether the port is readable (i.e., whether `ReadFun` has been bound).

### Process Pending Reads

```cpp
void ProcessPendingReads(bool in_isr);
```

Actively checks and completes previously pending read operations. Typically called after data arrives and the driver has pushed data into the software queue; if `info_.data.size_` is satisfied (or the `size == 0` "any readable" semantics), it dequeues and finishes the corresponding `ReadOperation`.

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

Constructor that creates the write queue (metadata queue) and the data buffer queue, supporting queuing of multiple write requests.

### Set Write Function

```cpp
WritePort &operator=(WriteFun fun);
```

Sets the write function pointer, usually bound during the driver initialization phase.

### Submit Write Request

```cpp
ErrorCode operator()(ConstRawData data, WriteOperation &op, bool in_isr = false);
```

Adds data to the write queue and handles completion based on the behavior of `op`.

- `WritePort` uses an atomic lock state (`lock_`) to ensure there is only one submitter at a time; if the port is already occupied, this call returns `ErrorCode::BUSY`.
- When `data.size_ == 0`, the write completes immediately with success (BLOCK mode will not wait).

### State Check

```cpp
size_t Size();
size_t EmptySize();
bool Writable();
```

Checks buffer space and whether the port is writable (i.e., whether `WriteFun` has been bound).

### Reset State

```cpp
void Reset();
```

Clears the write queue and internal state.

## STDIO Interface

LibXR provides a global `STDIO` interface that can be bound to `ReadPort` / `WritePort` instances and used with the `Printf(...)` function to output debug information.

```cpp
LibXR::STDIO::write_ = &uart.write_port_;
LibXR::STDIO::Printf("Hello, %d", 123);
```

Implementation note: when `LIBXR_PRINTF_BUFFER_SIZE` is enabled, `Printf` uses an internal mutex (only for formatting and serializing output), and chooses between the normal write path and the stream/bulk write path depending on whether `STDIO::write_stream_` is configured.

## Usage Examples

For data size of 0, Write will return success directly, and Read will complete once any data is readable.

```cpp
// Blocking write to UART, timeout set to 100ms (default is infinite wait)
WriteOperation op_block(sem, 100);
uart.Write("Hello", op_block);

// Asynchronous read with callback
ReadOperation op_cb(callback);
uart.Read(buffer, op_cb);
```

---

## WritePort::Stream Batch Write Interface

`WritePort::Stream` provides a chained batch-write capability similar to C++ streams, making it suitable for high-throughput, large-packet, or consecutive multi-block write scenarios. Its goal is to **lock the port resource once, write data in batches, and reduce queue pressure and fragmentation**.

### Key Features

- **Stream-style chained writing**: Supports multiple `<<` operations to append multiple segments into the write buffer.
- **Automatic Batch Submission**: Unsubmitted data is automatically committed upon destruction, and you can also call `Commit()` manually at any time.

### Example Usage

```cpp
WriteOperation op;
// Typical batch write using stream interface
{
    WritePort::Stream s(&uart_port, op);
    s << data1 << data2 << data3;
    // s.Commit(); // Optional, auto-committed on destruction
}
```

### Interface Specification

```cpp
class WritePort::Stream {
public:
    Stream(WritePort* port, WriteOperation op);
    ~Stream();
    Stream& operator<<(const ConstRawData& data);
    ErrorCode Commit();
};
```

Semantics highlights:

- `Stream(WritePort*, WriteOperation)`: tries to acquire the write lock and checks that the write-metadata queue has at least 1 free slot; if it cannot lock or the queue is full, the stream starts in an unlocked state.
- `operator<<`: if unlocked, it retries acquiring the write lock; if it still fails, this `<<` writes nothing. If locked and there is enough capacity (`size_ + data.size_ <= cap_`), it appends data into the write buffer; if capacity would be exceeded, no partial write is performed (the segment is ignored).
- `Commit()`: submits the currently accumulated data as a single write request and triggers the underlying write; then resets `size_` to 0. After committing, it refreshes available capacity based on the queue free slots, and may release the write lock when needed.
- `~Stream()`: if there is uncommitted data, it is committed automatically, then the write lock is released.

---

`ReadPort` and `WritePort` are the core interfaces of the LibXR I/O abstraction layer. They provide unified data buffering and completion feedback mechanisms, suitable for data stream scenarios such as UART, network, and file systems.
