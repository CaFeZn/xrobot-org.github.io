---
id: adv-coding-middleware-topic-design
title: Topic Design
sidebar_position: 1
---

# Topic Design

For the basic usage, see the `Topic`, `SyncSubscriber`, `ASyncSubscriber`, and `QueuedSubscriber`
pages in the message system section. This page explains why the mechanism is split into these roles.

## What `Topic` is solving

`Topic` is not trying to be a message bus that carries everything. Its goal is to unify the most
common in-process handoff patterns with as little overhead as possible: publishers write data,
subscribers consume it in different ways, the latest value may be cached when needed, and
multi-publisher protection can be enabled when needed. It does not pull in Linux shared memory,
process-to-process synchronization, or complex durable queue semantics because those are outside the
boundary of this lightweight path.

## The role of `Block`

At the source level, `Block` is the central structure inside `Topic`. It stores the current data
view, the maximum length, the subscriber lists, and the state used to coordinate concurrent access.
By default it optimizes the single-publisher path: if `multi_publisher` is not explicitly enabled,
it only uses a lightweight atomic `busy` state for serialization. Only when multi-publisher mode is
enabled does it fall back to `Mutex`. That boundary matters, because it shows `Topic` is designed
for the common single-publisher case first instead of dragging every publish through a heavier
synchronization primitive.

## Why cache is optional

Cache follows the same idea. `Topic` does not force itself to hold a separate stable copy. Cache can
be enabled when needed. Without cache, the publish path only exposes the current data view through
`Block`. With cache enabled, `Topic` keeps a stable internal copy. If the upper layer needs "the
latest stable value", cache is turned on explicitly. If it only needs a one-time handoff, there is
no reason to pay the copy cost by default.

## Why subscribers are split by type

The subscriber types are split into synchronous, asynchronous, queued, and callback variants because
they represent four genuinely different consumption semantics. `SyncSubscriber` means "wake me when
new data arrives". `ASyncSubscriber` is closer to "I will fetch the latest result later".
`QueuedSubscriber` means "enqueue every publish". Callback subscription means "invoke me immediately
at publish time". If all of that were collapsed into one subscriber interface, the result would
either degenerate into the most conservative common subset or push too many branches into runtime.

## Why it is not a strict message queue

From a concurrency point of view, `Topic` is better read as a framework that dispatches published
data into different consumption forms rather than as a strict message queue. The synchronous path
uses `Semaphore`, the asynchronous path uses small state blocks, the queue path uses
`LockFreeQueue`, and callback subscribers are linked through `LockFreeList`. That makes it a good
fit for in-process module handoff, log fan-out, or state broadcast. If the requirement is shared
large payloads across processes, explicit queue-full policy, or zero-copy shared slots, then the
right move is to switch to `LinuxSharedTopic<T>` instead of pushing system-level semantics back into
`Topic`.

## `WaitTopic` and domain

Another point that is easy to miss is `WaitTopic` and domain. `Topic` is not named on a single
global flat plane. It can be organized by domain, and `WaitTopic` is not about "get the object
immediately". It means waiting for a topic to appear in the matching domain. This solves module
organization when initialization order is not completely fixed. It is lightweight in-process
discovery and binding, not a service registry and not a cross-process directory.

## Positioning

In one sentence, `Topic` is an in-process publish-subscribe path with relatively low semantic
burden and multiple consumption forms. It is best at letting modules exchange data without exposing
too much of each other's lifecycle. It is not trying to solve every message-system problem at once.
