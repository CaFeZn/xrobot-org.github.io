---
id: core-op
title: Operation 操作模型
sidebar_position: 9
---

# Operation 操作模型

本模块定义通用的 `Operation<T>` 模板类，用于描述具有完成反馈机制的异步操作。支持回调（Callback）、阻塞（Block）、轮询（Polling）三种模式，适用于嵌入式 I/O 操作中的统一完成处理。

其中 `ReadOperation` / `WriteOperation` 是对 `Operation<ErrorCode>` 的别名，用于 I/O 完成时回传 `ErrorCode`。

## 操作模式

### OperationType

```cpp
enum class OperationType : uint8_t {
  CALLBACK,  // 使用回调函数处理完成事件
  BLOCK,     // 使用信号量阻塞等待
  POLLING,   // 轮询状态变量
  NONE       // 不处理完成
};
```

### POLLING 状态枚举

```cpp
enum class OperationPollingStatus : uint8_t {
  READY,
  RUNNING,
  DONE,
  ERROR
};
```

## 构造方式

```cpp
// 默认构造：类型为 NONE
Operation();

// 构造阻塞操作
Operation(Semaphore &sem, uint32_t timeout = UINT32_MAX);

// 构造回调操作（T 为回调参数类型）
Operation(Callback<T> &cb);

// 构造轮询操作
Operation(OperationPollingStatus &status);
```

另外，`Operation` 支持从另一个 `Operation` 实例初始化（复制/移动语义等价于赋值）。

## 状态更新

```cpp
template <typename Status>
void UpdateStatus(bool in_isr, Status&& status);

void MarkAsRunning();
```

- `UpdateStatus(...)` 会根据操作类型触发回调、解除阻塞或更新轮询状态：
  - CALLBACK：调用 `cb.Run(in_isr, status)`，其中 `status` 作为 `T` 类型的完成状态传递给回调。
  - BLOCK：调用信号量的 `PostFromCallback(in_isr)` 解除阻塞等待（完成状态本身不参与阻塞唤醒语义）。
  - POLLING：更新轮询状态变量 `OperationPollingStatus`：当 `status` 表示成功时置为 `DONE`，否则置为 `ERROR`。该规则对任意 `T` 一致；约定以 “0” 表示成功（例如 `ErrorCode::OK == 0` 或其它状态类型的 0 值）。
- `MarkAsRunning()` 在 POLLING 模式下设置状态为 `RUNNING`。
- 当 `in_isr == true` 且操作类型为 `BLOCK` 会主动断言失败。
- 这两个函数通常由驱动/端口在合适的时机调用；用户侧只需选择合适的 `OperationType` 并传入即可。


## 示例用法

### 阻塞等待写入完成

```cpp
Semaphore sem;
WriteOperation op_block(sem, 100);
write_port(data, op_block);
```

### 回调方式读取完成反馈

```cpp
auto cb = Callback<ErrorCode>::Create([](bool in_isr, int context, ErrorCode ec) {
  // 回调处理逻辑
}, 123);  // 绑定 context 为 123

ReadOperation op_cb(cb);
read_port(buffer, op_cb);
```

### 轮询方式查询完成状态

```cpp
auto status = LibXR::ReadOperation::OperationPollingStatus::READY;
ReadOperation op_poll(status);
read_port(buffer, op_poll);

// 后续通过 status 查询是否完成
if (status == LibXR::ReadOperation::OperationPollingStatus::DONE) {
  // 成功完成
} else if (status == LibXR::ReadOperation::OperationPollingStatus::ERROR) {
  // 完成但发生错误
}
```

---

`Operation` 是 LibXR I/O 操作的基础机制，适用于串口、网络、定时器等模块，统一管理完成行为，确保线程与中断上下文均安全。
