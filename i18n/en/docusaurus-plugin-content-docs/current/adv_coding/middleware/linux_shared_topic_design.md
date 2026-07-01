---
id: adv-coding-middleware-linux-shared-topic-design
title: LinuxSharedTopic Design
sidebar_position: 2
---

# LinuxSharedTopic Design

For the basic API, see the "Shared-Memory Topic (Linux)" page in the basic message-system section.
This page focuses on the boundary between `LinuxSharedTopic<T>` and ordinary `Topic`, and on the
tradeoffs behind the current implementation.

## 1. Why it is not folded back into `Topic`

`LinuxSharedTopic<T>` solves Linux / Webots inter-process communication, large-payload sharing,
zero-copy reads, and per-subscriber queue policy. The original `Topic` is closer to in-process
publish-subscribe with MCU-oriented semantics: exact-typed dispatch, callbacks, synchronous or
asynchronous subscribers, and lightweight queues. Those two paths operate under different
constraints, so shared-memory semantics were not pushed back into `Topic`. Keeping them separate
lets `Topic` stay light while Linux IPC evolves along its own model.

## 2. Separating data plane and control plane

`LinuxSharedTopic<T>` is not built around one simple queue. It uses two layers:

1. payload slot
   - the real data lives in shared-memory slots
2. descriptor queue
   - publish only pushes "which slot is readable" to each subscriber

The direct consequences are:

- the payload itself is not copied again between publisher and subscriber
- each subscriber only consumes descriptors
- the same slot can be held by multiple subscribers until the last reference is released

That is the basis for zero-copy behavior.

## 3. Why the hot path uses `atomic + futex`

The key constraints of the implementation are:

- no mutex on the hot path
- publish and consume side should advance state mostly with atomics
- only the waiting path should sleep with futex

So the target is not "absolutely no waiting". It is "take mutex out of the publish/consume hot path
and compress real waiting into futex sleep".

## 4. Why slot reclaim is refcount-based instead of overwrite

One of the most dangerous problems in a shared-memory queue is:

- publisher wants to keep writing
- but a subscriber is still reading the old payload

The chosen model is:

- refcounted slot reclamation
- backpressure on publisher when slots are exhausted

instead of:

- overwrite while in use

The cost is:

- under high pressure, publisher may fail because slots are exhausted

The upside is:

- payload will not be overwritten while a subscriber still holds it

That is an explicit safety-first boundary.

## 5. What the three subscription policies trade off

The subscription modes are:

- `BROADCAST_FULL`
- `BROADCAST_DROP_OLD`
- `BALANCE_RR`

They are not merely "different features". They optimize for different goals.

### `BROADCAST_FULL`

Goal:

- preserve every published item

Cost:

- one slow subscriber with a full queue reduces overall publish success

### `BROADCAST_DROP_OLD`

Goal:

- preserve publisher throughput as much as possible
- let slow subscribers bias toward newer data

Cost:

- old samples are dropped

### `BALANCE_RR`

Goal:

- distribute load across multiple workers

Cost:

- the same message is not broadcast to every worker

So it is really a shared-load mode, not a broadcast mode.

## 6. The practical difference between `FULL` and `DROP_OLD`

This is not only a conceptual distinction. Under a slow-subscriber overload:

- with `FULL`, the slow subscriber's full queue directly turns into publisher backpressure
- with `DROP_OLD`, the slow subscriber loses history but keeps tracking newer data

The choice is really about whether the system values complete delivery more than freshness and
throughput.

## 7. Positioning

`LinuxSharedTopic<T>` is the right tool when the requirement is inter-process communication, large
shared payloads, and zero-copy read-side behavior. Ordinary `Topic` remains the in-process,
lightweight publish-subscribe path. The two are related by topic semantics, but they are not the
same transport model.
