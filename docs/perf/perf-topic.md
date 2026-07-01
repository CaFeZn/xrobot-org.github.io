---
id: perf-topic
title: 消息系统性能测试
sidebar_position: 3
---

# 消息系统性能测试

这一页的作用是给出消息系统性能基准的入口，而不是脱离测试条件直接下结论。

当前可公开参考的基准仓库在这里：

- [Jiu-xiao/FuckingRosLatency](https://github.com/Jiu-xiao/FuckingRosLatency)

阅读这类结果时，至少要同时看清：

- 测试是在什么系统和调度条件下跑的；
- 测的是进程内 `Topic`、Linux 共享内存路径，还是别的链路；
- payload 大小、订阅方式、发布频率和统计口径分别是什么。

如果你只想知道当前主线有哪些相关能力，先回到：

- [Topic](../basic_coding/middleware/message/topic.md)
- [共享内存 Topic（Linux）](../basic_coding/middleware/message/linux-shared-topic.md)
- [Memory FastCopy / FastSet / FastCmp](../basic_coding/core/core-mem.md)

如果你要写新的性能结论，建议直接附上对应代码、输入规模和统计方法，不要只引用一句“亚微秒”或“快于 `std::memcpy`”这样的脱上下文描述。
