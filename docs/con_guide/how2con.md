---
id: con-guide-how2con
title: 如何参与贡献
sidebar_position: 1
---

# 如何参与贡献

贡献主要通过 `Issue` 和 `Pull Request` 进行。局部修复、文档勘误、示例修正通常可以直接提 `PR`；公共接口、运行语义、并发行为、驱动热路径和大范围重构，先开 `Issue` 说清楚目标和边界。

## `Issue`

`Issue` 至少写清楚这几件事：

- 现象或目标
- 影响范围
- 复现条件或使用场景
- 预期结果

缺陷类问题不要只写“这里有 bug”；重构类问题不要只写“这里想改一下”。评审者需要先判断这是局部修复、语义调整，还是结构变更。

## `Pull Request`

`PR` 只处理一个主题。正文直接写四项即可：

- 改了什么
- 为什么改
- 怎么验证
- 哪些部分还没验证

小修复不需要长篇说明，但也不要只留一个标题。驱动、并发、性能相关改动，正文里要能看出影响路径。

```text
## What
- fix uart BLOCK timeout wakeup path

## Why
- late completion may post an expired waiter

## Verify
- build linux test
- run related regression

## Not Verified
- no board-side verification on CH32
```

## 讨论边界

以下改动先讨论再动手：

- 公共接口变更
- 已有语义调整
- 跨平台公共层改动
- 驱动热路径重写
- 大范围重构

以下改动通常可以直接提 `PR`：

- 明确的 bug fix
- 文档补充或纠错
- 示例代码修正
- 局部测试补充
- 不改变语义的整理类修改

## 验证

代码改动至少要保证能编译；驱动、并发、性能相关改动补对应验证；文档改动至少检查链接、目录和预览。没有验证的部分可以保留，但要明确写出。
