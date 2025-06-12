---
id: core-rw
title: IO 读写抽象
sidebar_position: 8
---

# IO 读写抽象

本模块定义了通用的 `ReadPort` 与 `WritePort` 接口类，用于跨平台封装异步、阻塞、轮询等多种 I/O 行为，并通过 `Operation` 模型绑定完成反馈机制。适配不同底层驱动时，只需实现对应的读写函数并赋值给端口对象，即可获得完整的异步 I/O 能力。

## 核心类型

### ReadPort / WritePort

`ReadPort` 和 `WritePort` 封装了读写操作的调用流程、缓存管理与同步机制。每次调用都会携带一个 `Operation` 实例，明确指定完成后的反馈方式（回调、阻塞、轮询或忽略）。

### ReadOperation / WriteOperation

```cpp
typedef Operation<ErrorCode> ReadOperation;
typedef Operation<ErrorCode> WriteOperation;
```

用于表示带有完成响应行为的异步 I/O 操作。可通过构造函数传入回调、信号量或轮询状态变量，详见 [`core-operation`](./core-op.md) 页面。

## ReadPort 接口

### 初始化

```cpp
ReadPort(size_t buffer_size = 128);
```

构造函数分配接收缓冲区，默认大小为 128 字节。

### 设置读取函数

```cpp
ReadPort &operator=(ReadFun fun);
```

设置读取函数指针，通常由底层驱动调用，用户无需关心。

### 发起读取请求

```cpp
ErrorCode operator()(RawData data, ReadOperation &op);
```

请求读取 `data.size_` 字节的数据，根据 `op` 的行为等待或回调。

### 状态检查

```cpp
size_t Size();
size_t EmptySize();
bool Readable();
```

用于判断缓冲区状态和是否可读。

### 挂起数据处理

```cpp
void ProcessPendingReads(bool in_isr);
```

主动检查并完成之前挂起的读操作，一般在数据到达后由驱动自行调用。

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

构造函数分配写入队列和缓存，支持多条写入请求排队。

### 设置写入函数

```cpp
WritePort &operator=(WriteFun fun);
```

设置写入函数指针，通常由底层驱动调用，用户无需关心。

### 发起写入请求

```cpp
ErrorCode operator()(ConstRawData data, WriteOperation &op);
```

将数据加入写入队列，并根据 `op` 的行为等待或回调。

### 状态检查

```cpp
size_t Size();
size_t EmptySize();
bool Writable();
```

判断缓存空间与是否可写。

### 重置状态

```cpp
void Reset();
```

清空写入队列与状态。

## STDIO 接口

LibXR 提供了一个全局 `STDIO` 接口，可绑定 `ReadPort` / `WritePort` 实例并使用 `Printf(...)` 接口输出调试信息。

```cpp
LibXR::STDIO::write_ = uart_cdc.write_port_;
LibXR::STDIO::Printf("Hello, %d", 123);
```

## 用例示例

对于数据大小为0的情况，Write会直接返回成功，Read会等待有任何数据可读再返回（阻塞模式下）。

```cpp
// 阻塞写入串口，超时为 100ms （默认永远等待）
WriteOperation op_block(sem, 100);
uart.Write("Hello", op_block);

// 异步读取并回调处理
ReadOperation op_cb(callback);
uart.Read(buffer, op_cb);
```

---

`ReadPort` 与 `WritePort` 是 LibXR IO 抽象层的核心接口，提供统一的数据缓冲与完成反馈机制，适用于串口、网络、文件系统等多种数据流场景。
