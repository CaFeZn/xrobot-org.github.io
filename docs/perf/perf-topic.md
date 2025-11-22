---
id: perf-topic
title: 消息系统性能测试
sidebar_position: 3
---

# 消息系统性能测试

LibXR在没有RT补丁的Linux环境下能够做到亚微秒级别的通信延迟，同时内置的FastCopy在较大数据量（例如图片）的传输中能够表现出明显优于std::memcpy的性能。具体测试数据与代码请参考[此仓库](https://github.com/Jiu-xiao/FuckingRosLatency)。
