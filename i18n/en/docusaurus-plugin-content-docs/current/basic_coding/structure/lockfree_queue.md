---
id: lockfree_queue
title: LockFreeQueue (historical compatibility note)
sidebar_position: 4
---

# LockFreeQueue (historical compatibility note)

Older LibXR docs described `LockFreeQueue` as the general public lock-free queue. That is no longer the shape of the current `libxr master` public queue API.

The current mainline exposes:

- `LibXR::Queue<T>`
- `LibXR::SPSCQueue<T>`
- `LibXR::MPMCQueue<T>`

So if you are writing new code, do not treat this page as a current API reference.

## How to map old code

### 1. Single producer / single consumer

If the old queue usage is really a single-producer / single-consumer channel, migrate it to `SPSCQueue<T>`.

### 2. Multiple producers or consumers

If the queue is genuinely shared by multiple producers or consumers, migrate it to `MPMCQueue<T>`.

### 3. No real concurrency requirement

If it is only a local FIFO, switch to `Queue<T>`.

## Why keep this page

This page is kept only so that:

- old doc links and historical references still resolve;
- readers can map `LockFreeQueue` mentions in old modules or old notes to the current queue family.

Treat it as a compatibility navigation page, not as a current API guide.
