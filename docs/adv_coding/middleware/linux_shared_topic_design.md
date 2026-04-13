---
id: adv-coding-middleware-linux-shared-topic-design
title: LinuxSharedTopic 设计
sidebar_position: 2
---

# LinuxSharedTopic 设计

基础用法见基础消息系统里的“共享内存 Topic（Linux）”页面。下面直接讨论它与普通 `Topic` 的边界，以及现在这套实现的取舍。

## 1. 为什么不是直接改 `Topic`

`LinuxSharedTopic<T>` 解决的是 Linux / Webots 主机进程间通信、大 payload 共享、零拷贝读取以及多订阅者队列策略；原始 `Topic` 更像是进程内发布订阅，语义偏 MCU 和轻量系统，用缓存、回调、同步/异步订阅者去组织数据流。这两条路径的约束根本不同，所以共享内存语义没有继续塞回 `Topic` 本体，而是单独做成 `LibXR::LinuxSharedTopic<T>`。这样 `Topic` 仍然保持轻量，Linux 主机 IPC 也可以沿着共享内存模型单独演化。

## 2. 数据面和控制面分离

`LinuxSharedTopic<T>` 的核心结构不是一条简单队列，而是两层：

1. payload slot
   - 真实数据驻留在共享内存槽位里
2. descriptor queue
   - 发布时只把“哪个 slot 可读”投递给订阅者

这样做的直接结果是：

- payload 本体不需要在 publisher 和 subscriber 之间重复拷贝
- 每个订阅者只需要消费描述符
- 同一个 slot 可以被多个订阅者同时持有，直到最后一个释放

这也是它能做到零拷贝的前提。

---

## 3. 为什么 hot path 用 `atomic + futex`

这条实现的关键约束是：

- hot path 不走 mutex
- publish / consume 侧尽量只做原子状态推进
- 等待路径再用 futex 睡眠

这意味着它追求的不是“完全无等待”，而是尽量把 mutex 从 publish/consume 热路径里拿掉，把真正的等待压缩到 futex 睡眠那一层。

## 4. 为什么用 refcount reclaim，而不是覆盖写

共享内存队列最危险的问题之一是：

- publisher 想继续写
- 但某个 subscriber 还没把旧数据读完

这里选的是：

- refcounted slot reclamation
- slot 用尽时对 publisher 施加 backpressure

而不是：

- overwrite-in-use

这样选的代价是：

- 高压下 publisher 可能因为 slot 耗尽而失败

好处是：

- 不会在 subscriber 仍持有数据时把 payload 直接覆盖掉

这是一条很明确的安全优先边界。

---

## 5. 三种订阅策略在取舍什么

这里的订阅模式有：

- `BROADCAST_FULL`
- `BROADCAST_DROP_OLD`
- `BALANCE_RR`

它们不是“功能不同而已”，而是在取舍不同目标。

### `BROADCAST_FULL`

目标：

- 保留所有投递内容

代价：

- 某个慢订阅者满队列时，会直接把 publish 成功率拉低

### `BROADCAST_DROP_OLD`

目标：

- 尽量保住 publisher 吞吐
- 让慢订阅者始终更偏向读到新数据

代价：

- 订阅者会丢旧样本

### `BALANCE_RR`

目标：

- 多个 worker 间均衡分发

代价：

- 同一条消息不会广播给每个 worker

所以它本质上不是广播模式，而是共享负载模式。

---

## 6. `FULL` 和 `DROP_OLD` 的实际差异

这不是纯概念取舍。在慢订阅者过载场景下，实际行为是：

- `DROP_OLD` 能保住 publisher throughput
- 同时显著降低 delivered sample latency
- `FULL` 会保住队列内容完整性
- 但 publish 成功率会明显下降，延迟也会抬高

也就是说：

- 如果你要“所有样本都不能丢”，选 `FULL`
- 如果你要“尽量快地拿到新数据”，选 `DROP_OLD`

这和控制场景里 freshness-first 的取舍是一致的。

---

## 7. `BALANCE_RR` 不是“随便轮询一下”

`BALANCE_RR` 不是在广播路径上随手加个游标，而是独立的 balanced subscriber group。

其行为边界包括：

- 一个 publish 最多只投给一个 balanced subscriber
- full member 会被跳过，只要组内还有别的成员能接
- 如果 balanced group 存在，但没有任何 member 能接，则整个 publish 失败

所以它的语义更接近：

- “一组 worker 共享消费同一 topic”

而不是：

- “广播之后顺便轮流处理”

---

## 8. 为什么需要 stale subscriber / publisher takeover

共享内存 IPC 最容易留下的垃圾不是日志，而是：

- 死掉的 subscriber 还占着 slot
- 死掉的 publisher 留下旧 segment

这套实现已经把这两件事都考虑进来了：

- dead subscriber recycle
- stale publisher takeover

subscriber 侧会跟踪 owner identity；
publisher 侧会在 create-side reopen 时尝试回收死进程遗留的 segment。

这一步如果没有，Linux IPC 系统跑久了之后一定会出现“逻辑上没人用了，但共享状态还卡着”的问题。

---

## 9. `latency_avg` 为什么经常不值得直接看

关于性能解读，当前最重要的一条结论是：

- standard-case `latency_avg` 很容易受 scheduler 和启动 backlog 污染

也就是说，如果 publisher 一开始就灌数据，而 subscriber 尚未完全进入稳态等待，那么：

- `avg latency` 里会混入一段队列堆积时间

这不等于纯粹的单次投递延迟。

因此更有意义的区分通常是：

- saturated-throughput queueing latency
- single-outstanding one-way latency

前者描述系统满载时的排队表现，后者才更接近“消息本身从 publish 到被 wait 成功拿到”的真实单次路径。

---

## 10. 适合它，不适合它

适合 `LinuxSharedTopic<T>` 的场景：

- Linux 主机多进程共享大 payload
- 订阅者策略明确，需要 `FULL / DROP_OLD / RR`
- 希望避免用户态额外 payload 拷贝

不适合它的场景：

- MCU 侧 ISR 驱动路径
- 进程内轻量 publish/subscribe
- payload 不是 trivially copyable

从定位上看，它不是普通 `Topic` 的升级版，而是主机 IPC 的专门实现。
