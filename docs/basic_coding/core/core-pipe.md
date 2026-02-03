---
id: core-pipe
title: Pipe 单向管道
sidebar_position: 12
---

# Pipe 单向管道

`Pipe` 将一个 `WritePort` 与一个 `ReadPort` 通过**同一条无锁字节队列**连接成**单向**数据通道：写端写入的字节可被读端直接读取，无需端口间的中间拷贝（仅有一次写入到共享队列的拷贝）。该类适用于在线程/任务/ISR 与任务之间进行高效的数据转发与环回测试。

---

## 特性概览

- **零额外拷贝**：写端写入 → 直接进入共享队列 → 读端从同一队列取出。
- **ISR 友好**：读端推进通过 `ProcessPendingReads(in_isr)`，可在 ISR 或任务上下文中触发。
- **语义与 `ReadPort`/`WritePort` 一致**：阻塞/回调/轮询等完成方式统一由 `Operation` 控制。

---

## 公共接口

```cpp
class Pipe {
public:
  // 使用给定共享数据队列容量（字节）构造
  Pipe(size_t buffer_size);

  // 非拷贝/非赋值
  Pipe(const Pipe&) = delete;
  Pipe& operator=(const Pipe&) = delete;
  ~Pipe();

  // 端口访问
  ReadPort&  GetReadPort();
  WritePort& GetWritePort();
};
```

- `buffer_size`：共享队列总容量（字节），用于承载写入的数据。创建后不可更改。
- `Pipe` 不直接暴露 `Size()/Reset()` 等方法——请通过 `GetReadPort()` / `GetWritePort()` 使用对应端口接口。

---

## 使用方式

把 `Pipe` 当作“自带回环驱动”的内存管道使用：写端写入会触发 `WriteFun`，进而推进读端处理挂起读取。

```cpp
LibXR::Pipe pipe(256);

auto& r = pipe.GetReadPort();
auto& w = pipe.GetWritePort();

// 典型：先发起读（可能进入 PENDING），再写入推进
uint8_t buf[16];
LibXR::ReadOperation rop(status_or_cb_or_sem);
LibXR::WriteOperation wop(status_or_cb_or_sem);

r({buf, sizeof(buf)}, rop);           // 可能挂起
w({some_data, some_len}, wop);        // 写入后会推进 r.ProcessPendingReads(...)
```

> 备注：`Pipe` 的读侧是“被动推进”的：需要写侧触发（或外部主动调用 `ProcessPendingReads`）才能完成挂起读请求；这一点与 `ReadPort` 的模型保持一致。

