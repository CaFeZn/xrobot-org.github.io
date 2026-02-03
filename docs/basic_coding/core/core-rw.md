---
id: core-rw
title: IO 读写抽象
sidebar_position: 8
---

# IO 读写抽象

本模块定义了通用的 `ReadPort` 与 `WritePort` 接口类，用于跨平台封装异步、阻塞、轮询等多种 I/O 行为，并通过 `Operation` 模型绑定完成反馈机制。适配不同底层驱动时，只需实现对应的读写函数并赋值给端口对象，即可获得完整的异步 I/O 能力。

`ReadPort`、`WritePort` 和 `WritePort::Stream` 本身由原子操作与无锁数据结构实现，可以做到整个读写过程不进行任何系统调用，同时保证线程安全。下文的锁都只是逻辑抽象，不涉及到实际的互斥锁操作。

> 注意：`ReadPort` / `WritePort` 的默认构造会在内部创建无锁队列与缓存（构造期一次性分配/初始化），用于承载数据与写入元信息。

## 核心类型

### ReadPort / WritePort

`ReadPort` 和 `WritePort` 封装了读写操作的调用流程、缓存管理与同步机制。每次调用都会携带一个 `Operation` 实例，明确指定完成后的反馈方式（回调、阻塞、轮询或忽略）。

### ReadOperation / WriteOperation

```cpp
typedef Operation<ErrorCode> ReadOperation;
typedef Operation<ErrorCode> WriteOperation;
```

用于表示带有完成响应行为的异步 I/O 操作。可通过构造函数传入回调、信号量或轮询状态变量，详见 core-op 页面。

## ReadPort 接口

### 初始化

```cpp
ReadPort(size_t buffer_size = 128);
```

构造函数创建接收缓冲区（无锁队列），默认大小为 128 字节。

### 设置读取函数

```cpp
ReadPort &operator=(ReadFun fun);
```

设置读取函数指针，通常由底层驱动初始化阶段绑定。

### 发起读取请求

```cpp
ErrorCode operator()(RawData data, ReadOperation &op, bool in_isr = false);
```

请求读取 `data.size_` 字节的数据，根据 `op` 的行为等待或回调。

- 若当前已有挂起读请求（内部 BusyState 为 PENDING），会直接返回 `ErrorCode::BUSY`。
- 当 `data.size_ == 0` 时，读取语义为“等待有任意数据可读即可返回成功”（阻塞模式下会等待）。

### 状态检查

```cpp
size_t Size();
size_t EmptySize();
bool Readable();
```

用于判断缓冲区状态和是否可读（是否已绑定 `ReadFun`）。

### 挂起数据处理

```cpp
void ProcessPendingReads(bool in_isr);
```

主动检查并完成之前挂起的读操作，一般在数据到达、驱动将数据写入软件队列后调用。若满足 `info_.data.size_`（或 size==0 的“任意可读”语义）则会出队并完成对应 `ReadOperation`。

### 重置状态

```cpp
void Reset();
```

清空缓存与状态。

## WritePort 接口

### 初始化

```cpp
WritePort(size_t queue_size = 3, size_t buffer_size = 128);
```

构造函数创建写入队列（元信息队列）和数据缓存队列，支持多条写入请求排队。

### 设置写入函数

```cpp
WritePort &operator=(WriteFun fun);
```

设置写入函数指针，通常由底层驱动初始化阶段绑定。

### 发起写入请求

```cpp
ErrorCode operator()(ConstRawData data, WriteOperation &op, bool in_isr = false);
```

将数据加入写入队列，并根据 `op` 的行为等待或回调。

- `WritePort` 内部使用一个原子锁状态（`lock_`）保证同一时刻只有一个写入提交者；若端口已被占用，直接返回 `ErrorCode::BUSY`。
- 当 `data.size_ == 0` 时，写入会直接返回成功（阻塞模式不会等待）。

### 状态检查

```cpp
size_t Size();
size_t EmptySize();
bool Writable();
```

判断缓存空间与是否可写（是否已绑定 `WriteFun`）。

### 重置状态

```cpp
void Reset();
```

清空写入队列与状态。

## STDIO 接口

LibXR 提供了一个全局 `STDIO` 接口，可绑定 `ReadPort` / `WritePort` 实例并使用 `Printf(...)` 接口输出调试信息。

```cpp
LibXR::STDIO::write_ = &uart.write_port_;
LibXR::STDIO::Printf("Hello, %d", 123);
```

实现上，`Printf` 在启用 `LIBXR_PRINTF_BUFFER_SIZE` 时会使用内部互斥（仅用于格式化与串行化输出），并根据是否配置 `STDIO::write_stream_` 决定走普通写入或流式批量写入路径。

## 用例示例

对于数据大小为 0 的情况，Write 会直接返回成功，Read 会等待有任何数据可读再完成。

```cpp
// 阻塞写入串口，超时为 100ms （默认永远等待）
WriteOperation op_block(sem, 100);
uart.Write("Hello", op_block);

// 异步读取并回调处理
ReadOperation op_cb(callback);
uart.Read(buffer, op_cb);
```

---

## WritePort::Stream 批量写入接口

`WritePort::Stream` 提供了类似 C++ 标准流的链式批量写入能力，适合高吞吐、大包或连续多块数据写入场景。其目标是 **一次性锁定端口资源、批量写入数据、降低队列压力和碎片化**。

### 主要特性

- **流式链式写入**：支持多次 `<<` 操作，将多段数据批量追加到写缓存中。
- **自动批量提交**：析构时会自动提交未提交的数据，也可随时调用 `Commit()` 手动提交。

### 示例用法

```cpp
WriteOperation op;
// 典型的流式批量写入
{
    WritePort::Stream s(&uart_port, op);
    s << data1 << data2 << data3;
    // s.Commit(); // 可选，析构时自动提交
}
```

### 接口说明

```cpp
class WritePort::Stream {
public:
    Stream(WritePort* port, WriteOperation op);
    ~Stream();
    Stream& operator<<(const ConstRawData& data);
    ErrorCode Commit();
};
```

语义要点：

- `Stream(WritePort*, WriteOperation)`：构造时尝试获取写锁，并检查写入元信息队列是否至少还剩 1 个空位；若未获取到锁或队列空间不足，则该 Stream 处于未锁定状态。
- `operator<<`：若处于未锁定状态，会再次尝试获取写锁；未成功则本次 `<<` 不会写入数据。若已锁定且剩余容量允许（`size_ + data.size_ <= cap_`），则把数据追加进写缓存；超出容量时不会进行部分写入（直接忽略该段追加）。
- `Commit()`：把当前累积的数据作为一条写入提交到队列并触发底层写入；提交后 `size_` 清零。提交后会根据队列空位情况更新可用容量，必要时释放写锁。
- `~Stream()`：析构时若有未提交数据会自动提交，随后释放写锁。

---

`ReadPort` 与 `WritePort` 是 LibXR IO 抽象层的核心接口，提供统一的数据缓冲与完成反馈机制，适用于串口、网络、文件系统等多种数据流场景。
