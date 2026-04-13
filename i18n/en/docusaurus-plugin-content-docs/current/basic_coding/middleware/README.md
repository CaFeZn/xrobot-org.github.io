---
id: middleware-coding
title: Middleware
sidebar_position: 3
---

# Middleware

This module summarizes the middleware components in LibXR used for system services, communication management, and terminal interaction.

## Features

- **Unified Abstraction**: Provides core middleware functions such as event handling, logging, topic publishing, and virtual terminals.
- **Multiple Operation Models**: Supports synchronous, asynchronous, queued, and callback-based modes for different scenarios.
- **High Performance**: Heavily utilizes lock-free lists and queues internally to ensure concurrent performance.
- **Embedded Adaptation**: Supports flash minimum write unit constraints and key-value storage on memory-constrained devices.

## Contents

- [Application Framework](./app-framework.md)
- [Logger System](./logger.md)
- [Event System](./event.md)
- [Message System](/docs/basic_coding/middleware/message)
- [Database Key-Value Storage](./database.md)
- [RamFS In-Memory File System](./ramfs.md)
- [Terminal Command Interface](./terminal.md)

For detailed API descriptions, see the individual pages.
