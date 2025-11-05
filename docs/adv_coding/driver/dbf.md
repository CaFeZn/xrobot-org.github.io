---
id: adv-coding-drv-dbf
title: 双缓冲区
sidebar_position: 1
---

# 双缓冲区

双缓冲区主要用于通信外设，同一时间只会有一块缓冲区在进行收发，而另一块则进行拷贝或写入。双缓提供的预写/后读机制能够极大提高接口的吞吐能力，甚至能够逼近接口的理论最大带宽。

LibXR的双缓冲机制主要有两种：

1. 用于低速接口的驱动内置的双缓冲，主要存在于串口驱动。数据读写都需要通过fifo，会有两次拷贝
2. 用于高速接口的双缓冲，主要用于USB和SPI，用户可直接访问底层缓冲区，发送时无需拷贝

## 基本原理

以串口为例（实际接收可能会使用环形DMA，此处不讨论）

```mermaid
stateDiagram-v2
  [*] --> RUN

  state RUN {
    %% ================= TX(发送) =================
    [*] --> TX_Awrite_Bsend
    state "TX: A写入 / B发送" as TX_Awrite_Bsend
    state "TX: B写入 / A发送" as TX_Bwrite_Asend

    TX_Awrite_Bsend --> TX_Bwrite_Asend: 发送完成（切到A发送，B空闲→写入）
    TX_Bwrite_Asend --> TX_Awrite_Bsend: 发送完成（切到B发送，A空闲→写入）

    --
    %% ================= RX(接收/读) =================
    [*] --> RX_Arecv_Bread
    state "RX: A接收 / B供应用读" as RX_Arecv_Bread
    state "RX: B接收 / A供应用读" as RX_Brecv_Aread

    RX_Arecv_Bread --> RX_Brecv_Aread: A满/空闲中断（交付A给应用，切B为接收）
    RX_Brecv_Aread --> RX_Arecv_Bread: B满/空闲中断（交付B给应用，切A为接收）
  }
```
