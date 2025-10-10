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
- **ISR 友好**：可配置 `in_isr` 标志，使推进读端的过程遵循中断上下文限制。
- **语义与 `ReadPort`/`WritePort` 一致**：阻塞/回调/轮询等完成方式统一由 `Operation` 控制。

---

## 公共接口

```cpp
class Pipe {
public:
  // 使用给定共享数据队列容量（字节）构造；in_isr = true 表示回调可能在中断上下文执行
  Pipe(size_t buffer_size, bool in_isr = false);

  // 非拷贝/非赋值
  Pipe(const Pipe&) = delete;
  Pipe& operator=(const Pipe&) = delete;
  ~Pipe() = default;

  // 端口访问
  ReadPort&  GetReadPort();
  WritePort& GetWritePort();
};
```

- `buffer_size`：共享队列总容量（字节），用于承载写入的数据。创建后不可更改。
- `in_isr`：指示 `WriteFun` 推进读端时是否按 ISR 语义处理（例如避免阻塞/仅做必要推进）。

> `Pipe` 不直接暴露 Size/Reset 等方法——请通过 `GetReadPort()` / `GetWritePort()` 使用对应端口接口。
