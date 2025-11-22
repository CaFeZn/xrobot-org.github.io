---
id: perf-topic
title: Messaging System Performance Tests
sidebar_position: 3
---

# Messaging System Performance Tests

LibXR can achieve sub-microsecond communication latency on a non-RT-patched Linux system. Its built-in FastCopy also delivers noticeably better performance than `std::memcpy` when transferring larger data payloads (such as images).  
For detailed test data and code, please refer to [this repository](https://github.com/Jiu-xiao/FuckingRosLatency/blob/master/README_en.md).
