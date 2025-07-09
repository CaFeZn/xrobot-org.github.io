---
id: adv-coding-uart-driver
title: 串口驱动设计
sidebar_position: 1
---

# 串口驱动设计

LibXR驱动设计根据接口类型，DMA支持情况，以及外设的特性，进行了不同的优化，以满足不同的需求。但是主要的设计目标是共同的：

- **简单**:接口简单，使用者不需要了解细节，灵活方便。
- **高效**:尽量使用无锁数据结构，减少系统调用开销。
- **兼容**:兼容多平台实现，多线程下保证安全，裸机下可用（甚至更快）。
- **极限**:充分利用中断和DMA等资源，以达到硬件理论极限性能。

## 基本驱动类型

以串口驱动为主，根据平台差异，驱动的具体实现分为以下几类：  
_以下所有驱动的接口都是一致的，以覆盖平台差异_

### 完整无锁数据结构+DMA读写

如STM32UART, CH32UART等。

- 使用环形 DMA + 双 Buffer，带宽可达理论上限 100%。
- 系统资源占用极低。
- 可安全用于中断上下文。

### 完整无锁数据结构+中断驱动

如STM32VirtualUART（基于ST官方USB库实现，USB虚拟串口当然也算串口）

- 使用无锁数据结构与收发双Buffer，能够接近理论上限的带宽。
- 在有收发队列和双buffer的前提下，即使多两次拷贝，也不慢于任何常见的USB协议栈。
- 拒绝“大 Buffer 死循环发包”的“耍流氓”做法，队列更接近实际场景。

### 使用内置队列的协议栈，禁用LibXR数据结构

如TinyUSBVirtualUART，ESP32UART等。

- 使用协议栈或者SDK内置的队列接口替换LibXR的无锁数据结构。
- LibXR不做多余拷贝，能够达到原始API的性能。
- 大部分无法在中断使用。

### 原厂设计的都很难用的驱动

如STM32VirtualUART（基于USBX实现，神奇的设计，不想吐槽），ESP32VirtualUART（底层使用ESP-IDF的RingBuffer，甚至还支持中断访问，但是就不开放给你用）。

- 一般会单独开一个线程运行原始驱动，使用线程间通信读写。
- 原始驱动都依赖RTOS，设计不考虑裸机/中断使用。
- 性能最差。

### Linux

只在用户态操作，不需要考虑中断，一般用Posix API，性能和资源不敏感。

## STM32UART 实现解析

此驱动即为在第三章“关于性能”中所使用的STM32UART，是LibXR的经典设计。CH32UART的实现与其几乎完全一致。

[STM32UART API文档](https://jiu-xiao.github.io/libxr/class_lib_x_r_1_1_s_t_m32_u_a_r_t.html)

调用关系：

![STM32UART 协作图](https://jiu-xiao.github.io/libxr/class_lib_x_r_1_1_s_t_m32_u_a_r_t__coll__graph.svg)

### 初始化阶段

初始化列表：

1. 构造时传入UART_HandleTypeDef作为操作串口的句柄。dma_buff_rx作为整块缓冲区，dma_buff_tx平分作为双缓冲区，tx_queue_size为发送队列大小。
2. 构造_read_port和_write_port，传入dma_buff_rx和dma_buff_tx，并指定发送队列大小。
3. _read_port和_write_port用来构造UART基类。
4. uart_handle->Instance转换为枚举得到ID，用来查表。

构造函数：

1. 检查ID是否合法。
2. uart_handle->Init.Mode分别判断读写是否开启，然后注册读写函数。
3. 为接收开始DMA，配置为环形，开启空闲中断，直接开始接收。

```cpp
STM32UART::STM32UART(UART_HandleTypeDef *uart_handle, RawData dma_buff_rx,
                     RawData dma_buff_tx, uint32_t tx_queue_size)
    : UART(&_read_port, &_write_port),
      _read_port(dma_buff_rx.size_),
      _write_port(tx_queue_size, dma_buff_tx.size_ / 2),
      dma_buff_rx_(dma_buff_rx),
      dma_buff_tx_(dma_buff_tx),
      uart_handle_(uart_handle),
      id_(STM32_UART_GetID(uart_handle_->Instance))
{
  ASSERT(id_ != STM32_UART_ID_ERROR);

  map[id_] = this;

  if ((uart_handle->Init.Mode & UART_MODE_TX) == UART_MODE_TX)
  {
    ASSERT(uart_handle_->hdmatx != NULL);
    _write_port = WriteFun;
  }

  if ((uart_handle->Init.Mode & UART_MODE_RX) == UART_MODE_RX)
  {
    ASSERT(uart_handle->hdmarx != NULL);

    uart_handle_->hdmarx->Init.Mode = DMA_CIRCULAR;
    HAL_DMA_Init(uart_handle_->hdmarx);

    __HAL_UART_ENABLE_IT(uart_handle, UART_IT_IDLE);

    HAL_UART_Receive_DMA(uart_handle, reinterpret_cast<uint8_t *>(dma_buff_rx_.addr_),
                         dma_buff_rx_.size_);
    _read_port = ReadFun;
  }
}
```

### 用户接收

为空函数。因为用户调用基类接口时，会先检查内置无锁队列，有数据时直接出队，无数据时才会调用此函数。但是状态更新需要在中断中处理，此处直接返回EMPTY。

```cpp
ErrorCode STM32UART::ReadFun(ReadPort &port)
{
  STM32UART *uart = CONTAINER_OF(&port, STM32UART, _read_port);
  UNUSED(uart);

  return ErrorCode::EMPTY;
}
```

### 用户发送

发送逻辑略有复杂，理解需要一些时间。

1. CONTAINER_OF拿到父类对象。
2. 双缓冲区至少一块为空时才继续逻辑。
3. 从操作队列中查看第一个WriteInfoBlock，获取读写数据信息和操作类型。
4. 根据uart_handle->gState判断串口是否忙，忙时使用pending缓冲区，空闲时使用active缓冲区。
5. 从操作队列中取出数据，拷贝到缓冲区。
6. 若为pending缓冲区，使能缓冲区之后再检查一次串口是否忙，并判断是否可以切换为active缓冲区。
7. 若为active缓冲区，更新发送dma缓冲区的Cache（根据平台自动开启），并开启DMA发送。
8. 更新操作状态为成功。

```cpp
ErrorCode STM32UART::WriteFun(WritePort &port)
{
  STM32UART *uart = CONTAINER_OF(&port, STM32UART, _write_port);
  if (!uart->dma_buff_tx_.HasPending())
  {
    WriteInfoBlock info;
    // 此处的数据可能被中断提前拿走，拿不到直接返回失败就好了，用户那已经得到中断更新的操作结果了。
    if (port.queue_info_->Peek(info) != ErrorCode::OK)
    {
      return ErrorCode::EMPTY;
    }

    uint8_t *buffer = nullptr;
    bool use_pending = false;

    if (uart->uart_handle_->gState == HAL_UART_STATE_READY)
    {
      buffer = reinterpret_cast<uint8_t *>(uart->dma_buff_tx_.ActiveBuffer());
    }
    else
    {
      buffer = reinterpret_cast<uint8_t *>(uart->dma_buff_tx_.PendingBuffer());
      use_pending = true;
    }

    // 写入数据到缓冲区
    if (port.queue_data_->PopBatch(reinterpret_cast<uint8_t *>(buffer),
                                   info.data.size_) != ErrorCode::OK)
    {
      ASSERT(false);
      return ErrorCode::EMPTY;
    }

    if (use_pending)
    {
      uart->dma_buff_tx_.SetPendingLength(info.data.size_);
      // EnablePending之后Switch之前，可能数据被发送完成中断直接拿走
      uart->dma_buff_tx_.EnablePending();

      /*
      分类讨论：
      gState == HAL_UART_STATE_READY && HasPending()：上一次发送在EnablePending之前结束，可以直接开始新的发送
      gState == HAL_UART_STATE_READY && !HasPending()：上一次发送在EnablePending之后结束，数据已经被中断拿走进行发送了
      gState != HAL_UART_STATE_READY：上一次发送未结束
      */
      if (uart->uart_handle_->gState == HAL_UART_STATE_READY &&
          uart->dma_buff_tx_.HasPending())
      {
        // 可以发送，切当前缓冲区为active
        uart->dma_buff_tx_.Switch();
      }
      else
      {
        // 1. 数据被中断拿走，中断已经更新完操作结果了
        // 2. 上一次发送未结束，直接返回，由上次发送的完成中断开启本次发送
        // 直接退出
        return ErrorCode::FAILED;
      }
    }

    // 对本次操作出队
    port.queue_info_->Pop(uart->write_info_active_);

#if __DCACHE_PRESENT
    SCB_CleanDCache_by_Addr(
        reinterpret_cast<uint32_t *>(uart->dma_buff_tx_.ActiveBuffer()), info.data.size_);
#endif

    // 开始发送
    auto ans = HAL_UART_Transmit_DMA(
        uart->uart_handle_, static_cast<uint8_t *>(uart->dma_buff_tx_.ActiveBuffer()),
        info.data.size_);

    // 失败直接更新操作结果，并返回错误
    if (ans != HAL_OK)
    {
      port.Finish(false, ErrorCode::FAILED, info, 0);
      return ErrorCode::FAILED;
    }
    else
    {
      // 成功直接返回OK，基类函数会选择效率最高的方式更新操作结果
      return ErrorCode::OK;
    }
  }

  return ErrorCode::FAILED;
}
```

### 接收中断逻辑

DMA在运行时全程开启。根据当前 DMA 写入位置自动计算回卷，推入无锁队列，并更新一次状态。当接收到数据大小满足时，完成正在进行的读取操作。
由于DMA从不关闭，只要缓冲区不满，永远不会丢失数据。

```cpp
static void STM32_UART_RX_ISR_Handler(UART_HandleTypeDef *uart_handle)
{
  auto uart = STM32UART::map[STM32_UART_GetID(uart_handle->Instance)];
  auto rx_buf = static_cast<uint8_t *>(uart->dma_buff_rx_.addr_);
  size_t dma_size = uart->dma_buff_rx_.size_;

  size_t curr_pos =
      dma_size - __HAL_DMA_GET_COUNTER(uart_handle->hdmarx);  // 当前 DMA 写入位置
  size_t last_pos = uart->last_rx_pos_;

#if __DCACHE_PRESENT
  SCB_InvalidateDCache_by_Addr(rx_buf, dma_size);
#endif

  if (curr_pos != last_pos)
  {
    if (curr_pos > last_pos)
    {
      // 线性接收区
      uart->read_port_->queue_data_->PushBatch(&rx_buf[last_pos], curr_pos - last_pos);
    }
    else
    {
      // 回卷区：last→end，再从0→curr
      uart->read_port_->queue_data_->PushBatch(&rx_buf[last_pos], dma_size - last_pos);
      uart->read_port_->queue_data_->PushBatch(&rx_buf[0], curr_pos);
    }

    uart->last_rx_pos_ = curr_pos;
    // 更新状态，完成读取
    uart->read_port_->ProcessPendingReads(true);
  }
}
```

对接HAL库的中断接口

```cpp
extern "C" void STM32_UART_ISR_Handler_IDLE(UART_HandleTypeDef *huart)
{
  if (__HAL_UART_GET_FLAG(huart, UART_FLAG_IDLE))
  {
    __HAL_UART_CLEAR_IDLEFLAG(huart);

    STM32_UART_RX_ISR_Handler(huart);
  }
}

extern "C" void HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart)
{
  STM32_UART_RX_ISR_Handler(huart);
}

extern "C" void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  STM32_UART_RX_ISR_Handler(huart);
}
```

代码生成工具会自动给stm32fxxx_it.c打patch，生成调用

```cpp
void USART3_IRQHandler(void)
{
  /* USER CODE BEGIN USART3_IRQn 0 */
  /* LibXR UART IDLE callback (Auto-generated) */
#ifdef HAL_UART_MODULE_ENABLED
  STM32_UART_ISR_Handler_IDLE(&huart3);
#endif

  /* USER CODE END USART3_IRQn 0 */
  HAL_UART_IRQHandler(&huart3);
  /* USER CODE BEGIN USART3_IRQn 1 */

  /* USER CODE END USART3_IRQn 1 */
}
```

### 发送完成中断逻辑

1. 无可用DMA缓冲区时，直接返回
2. 有可用DMA缓冲区时，切换到可用区，开启DMA传输，完成操作
3. 检查队列里面是否有下一个写操作，有的话放入另一个DMA缓冲区，等待传输完成

```cpp
void STM32_UART_ISR_Handler_TX_CPLT(stm32_uart_id_t id)
{  // NOLINT
  auto uart = STM32UART::map[id];

  size_t pending_len = uart->dma_buff_tx_.GetPendingLength();

  if (pending_len == 0)
  {
    return;
  }

  uart->dma_buff_tx_.Switch();

#if __DCACHE_PRESENT
  SCB_CleanDCache_by_Addr(reinterpret_cast<uint32_t *>(uart->dma_buff_tx_.ActiveBuffer()),
                          pending_len);
#endif

  // 发送之前连无锁队列相关API都没有被调用，只有切缓冲区标志位->拿数据地址和长度
  // 最短的时间内开启下次传输
  auto ans = HAL_UART_Transmit_DMA(
      uart->uart_handle_, static_cast<uint8_t *>(uart->dma_buff_tx_.ActiveBuffer()),
      pending_len);

  ASSERT(ans == HAL_OK);

  // write_info_active_删除，此处变成局部变量也可行，两种写法无区别。
  WriteInfoBlock &current_info = uart->write_info_active_;

  // 此处才操作无锁队列，更新结果
  if (uart->write_port_->queue_info_->Pop(current_info) != ErrorCode::OK)
  {
    ASSERT(false);
    return;
  }

  uart->write_port_->Finish(true, ans == HAL_OK ? ErrorCode::OK : ErrorCode::BUSY,
                            current_info, current_info.data.size_);

  WriteInfoBlock next_info;

  if (uart->write_port_->queue_info_->Peek(next_info) != ErrorCode::OK)
  {
    return;
  }

  if (uart->write_port_->queue_data_->PopBatch(
          reinterpret_cast<uint8_t *>(uart->dma_buff_tx_.PendingBuffer()),
          next_info.data.size_) != ErrorCode::OK)
  {
    ASSERT(false);
    return;
  }

  uart->dma_buff_tx_.SetPendingLength(next_info.data.size_);

  uart->dma_buff_tx_.EnablePending();
}

extern "C" void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
  STM32_UART_ISR_Handler_TX_CPLT(STM32_UART_GetID(huart->Instance));
}
```

### 错误处理

停止当前操作，更新操作结果（FAILED），重置状态以便继续收发。

```cpp
extern "C" __attribute__((used)) void HAL_UART_ErrorCallback(UART_HandleTypeDef *huart)
{
  HAL_UART_Abort_IT(huart);
}

extern "C" void HAL_UART_AbortCpltCallback(UART_HandleTypeDef *huart)
{
  auto uart = STM32UART::map[STM32_UART_GetID(huart->Instance)];
  HAL_UART_Receive_DMA(huart, huart->pRxBuffPtr, uart->dma_buff_rx_.size_);
  uart->last_rx_pos_ = 0;
  WriteInfoBlock info;
  if (uart->write_port_->queue_info_->Peek(info) == ErrorCode::OK)
  {
    uart->write_port_->Finish(true, ErrorCode::FAILED, info, 0);
  }
}

extern "C" void HAL_UART_AbortTransmitCpltCallback(UART_HandleTypeDef *huart)
{
  auto uart = STM32UART::map[STM32_UART_GetID(huart->Instance)];
  WriteInfoBlock info;
  if (uart->write_port_->queue_info_->Peek(info) == ErrorCode::OK)
  {
    uart->write_port_->Finish(true, ErrorCode::FAILED, info, 0);
  }
}

extern "C" void HAL_UART_AbortReceiveCpltCallback(UART_HandleTypeDef *huart)
{
  HAL_UART_Receive_DMA(
      huart, huart->pRxBuffPtr,
      STM32UART::map[STM32_UART_GetID(huart->Instance)]->dma_buff_rx_.size_);
}
```

## STM32VirtualUART 实现解析

STM32官方的USB库支持函数注册，但是F1的USB库太老，有一些行为不一致，

其他MCU：

```cpp
typedef struct _USBD_CDC_Itf
{
  int8_t (* Init)(void);
  int8_t (* DeInit)(void);
  int8_t (* Control)(uint8_t cmd, uint8_t *pbuf, uint16_t length);
  int8_t (* Receive)(uint8_t *Buf, uint32_t *Len);
  int8_t (* TransmitCplt)(uint8_t *Buf, uint32_t *Len, uint8_t epnum);
} USBD_CDC_ItfTypeDef;
```

STM32F1:

```cpp
typedef struct _USBD_CDC_Itf
{
  int8_t (* Init)(void);
  int8_t (* DeInit)(void);
  int8_t (* Control)(uint8_t cmd, uint8_t *pbuf, uint16_t length);
  int8_t (* Receive)(uint8_t *Buf, uint32_t *Len);
} USBD_CDC_ItfTypeDef;
```

STM32F1缺失发送完成回调。我在代码生成的时候会对stm32fxxx_it.c打patch，以保持在stm32f1上的行为一致。后续的所有解析都是基于H7平台的。

```cpp
void USB_HP_CAN1_TX_IRQHandler(void)
{
  /* USER CODE BEGIN USB_HP_CAN1_TX_IRQn 0 */
  /* LibXR USB Tx Cplt callback (Auto-generated, For STM32F1) */
#if defined(STM32F1) && defined(HAL_PCD_MODULE_ENABLED)
  STM32_USB_ISR_Handler_F1();
#endif
  /* USER CODE END USB_HP_CAN1_TX_IRQn 0 */
  HAL_PCD_IRQHandler(&hpcd_USB_FS);
  /* USER CODE BEGIN USB_HP_CAN1_TX_IRQn 1 */
  /* LibXR USB Tx Cplt callback (Auto-generated, For STM32F1) */
#if defined(STM32F1) && defined(HAL_PCD_MODULE_ENABLED)
  STM32_USB_ISR_Handler_F1();
#endif
  /* USER CODE END USB_HP_CAN1_TX_IRQn 1 */
}
```

### 初始化

1. STM32VirtualUART与STM32UART基本相似，但是tx_buffer和rx_buffer都是双缓冲区，并且缓冲区默认使用CubeMX生成的UserRxBufferFS和UserTxBufferFS。
2. usbd_cdc_itf使用了模板元编程，判断结构体内TransmitCplt（F1没有）这个成员是否存在来构造不同的回调接口。

```cpp
STM32VirtualUART::STM32VirtualUART(USBD_HandleTypeDef &usb_handle, uint8_t *tx_buffer,
                                   uint8_t *rx_buffer, uint32_t tx_queue_size)
    : UART(&_read_port, &_write_port),
      usb_handle_(&usb_handle),
      tx_buffer_(RawData(tx_buffer, APP_TX_DATA_SIZE)),
      rx_buffer_(RawData(rx_buffer, APP_RX_DATA_SIZE)),
      _write_port(tx_queue_size, APP_TX_DATA_SIZE),
      _read_port(APP_RX_DATA_SIZE)
{
  map[0] = this;

  static USBD_CDC_ItfTypeDef usbd_cdc_itf = Apply<USBD_CDC_ItfTypeDef>();

  USBD_CDC_RegisterInterface(usb_handle_, &usbd_cdc_itf);

  _write_port = WriteFun;
  _read_port = ReadFun;

  USBD_CDC_ReceivePacket(usb_handle_);
}
```

### 用户发送

也与STM32UART基本相似，但是多了一步根据p_data_class判断USB是否连接的步骤。

```cpp
ErrorCode STM32VirtualUART::WriteFun(WritePort &port)
{
  STM32VirtualUART *uart = CONTAINER_OF(&port, STM32VirtualUART, _write_port);
  auto p_data_class =
      reinterpret_cast<USBD_CDC_HandleTypeDef *>(uart->usb_handle_->pClassData);

  WriteInfoBlock info;

  if (p_data_class == nullptr)
  {
    port.queue_info_->Pop(info);
    port.queue_data_->PopBatch(uart->tx_buffer_.PendingBuffer(), info.data.size_);
    port.Finish(false, ErrorCode::INIT_ERR, info, 0);
    return ErrorCode::INIT_ERR;
  }

  if (uart->tx_buffer_.HasPending())
  {
    return ErrorCode::FULL;
  }

  if (port.queue_info_->Peek(info) != ErrorCode::OK)
  {
    return ErrorCode::EMPTY;
  }

  if (port.queue_data_->PopBatch(uart->tx_buffer_.PendingBuffer(), info.data.size_) !=
      ErrorCode::OK)
  {
    ASSERT(false);
    return ErrorCode::EMPTY;
  }

  uart->tx_buffer_.EnablePending();

  if (p_data_class->TxState == 0)
  {
    uart->tx_buffer_.Switch();
    port.queue_info_->Pop(uart->write_info_active_);

    USBD_CDC_SetTxBuffer(uart->usb_handle_, uart->tx_buffer_.ActiveBuffer(),
                         info.data.size_);
#if __DCACHE_PRESENT
    SCB_CleanDCache_by_Addr(reinterpret_cast<uint32_t *>(uart->tx_buffer_.ActiveBuffer()),
                            info.data.size_);
#endif

    port.write_size_ = info.data.size_;

    auto ans = USBD_CDC_TransmitPacket(uart->usb_handle_);

    info.op.UpdateStatus(true, ans == USBD_OK ? ErrorCode::OK : ErrorCode::BUSY);

    return ErrorCode::FAILED;
  }

  return ErrorCode::FAILED;
}
```

### 用户接收

同STM32UART。

```cpp
ErrorCode STM32VirtualUART::ReadFun(ReadPort &port)
{
  UNUSED(port);
  return ErrorCode::EMPTY;
}
```

### 中断逻辑

1. init、deinit、control接口只做抽象。
2. 接收中断：
   - 切换缓冲区。
   - 重新开始接收
   - 将接收到的数据推入无锁队列
   - 更新正在进行的接收操作
3. 发送中断同STM32UART

```cpp
int8_t libxr_stm32_virtual_uart_init(void)
{
  STM32VirtualUART *uart = STM32VirtualUART::map[0];
  USBD_CDC_SetTxBuffer(STM32VirtualUART::map[0]->usb_handle_,
                       uart->tx_buffer_.ActiveBuffer(), 0);
  USBD_CDC_SetRxBuffer(STM32VirtualUART::map[0]->usb_handle_,
                       uart->rx_buffer_.ActiveBuffer());
  return (USBD_OK);
}

int8_t libxr_stm32_virtual_uart_deinit(void) { return (USBD_OK); }

int8_t libxr_stm32_virtual_uart_control(uint8_t cmd, uint8_t *pbuf, uint16_t len)
{
  UNUSED(cmd);
  UNUSED(pbuf);
  UNUSED(len);
  return (USBD_OK);
}

int8_t libxr_stm32_virtual_uart_receive(uint8_t *pbuf, uint32_t *Len)
{
  STM32VirtualUART *uart = STM32VirtualUART::map[0];

  uint8_t *buffer = nullptr;

  if (pbuf == uart->rx_buffer_.ActiveBuffer())
  {
    buffer = uart->rx_buffer_.PendingBuffer();
  }
  else
  {
    buffer = uart->rx_buffer_.ActiveBuffer();
  }

  USBD_CDC_SetRxBuffer(STM32VirtualUART::map[0]->usb_handle_, buffer);

  USBD_CDC_ReceivePacket(STM32VirtualUART::map[0]->usb_handle_);

#if __DCACHE_PRESENT
  SCB_InvalidateDCache_by_Addr(pbuf, *Len);
#endif

  uart->read_port_->queue_data_->PushBatch(pbuf, *Len);
  uart->read_port_->ProcessPendingReads(true);

  return (USBD_OK);
}

int8_t libxr_stm32_virtual_uart_transmit(uint8_t *pbuf, uint32_t *Len, uint8_t epnum)
{
  UNUSED(epnum);
  UNUSED(pbuf);
  UNUSED(Len);

  STM32VirtualUART *uart = STM32VirtualUART::map[0];

  WriteInfoBlock &current_info = uart->write_info_active_;

  if (!uart->tx_buffer_.HasPending())
  {
    return USBD_OK;
  }

  if (uart->write_port_->queue_info_->Pop(current_info) != ErrorCode::OK)
  {
    ASSERT(false);
    return USBD_OK;
  }

  uart->tx_buffer_.Switch();

  USBD_CDC_SetTxBuffer(uart->usb_handle_, uart->tx_buffer_.ActiveBuffer(),
                       current_info.data.size_);
#if __DCACHE_PRESENT
  SCB_CleanDCache_by_Addr(reinterpret_cast<uint32_t *>(uart->tx_buffer_.ActiveBuffer()),
                          *Len);
#endif

  uart->write_port_->write_size_ = current_info.data.size_;

  auto ans = USBD_CDC_TransmitPacket(uart->usb_handle_);

  current_info.op.UpdateStatus(true, ans == USBD_OK ? ErrorCode::OK : ErrorCode::BUSY);

  WriteInfoBlock next_info;

  if (uart->write_port_->queue_info_->Peek(next_info) != ErrorCode::OK)
  {
    return USBD_OK;
  }

  if (uart->write_port_->queue_data_->PopBatch(uart->tx_buffer_.PendingBuffer(),
                                               next_info.data.size_) != ErrorCode::OK)
  {
    ASSERT(false);
    return USBD_OK;
  }

  uart->tx_buffer_.EnablePending();

  return (USBD_OK);
}
```

## TinyUSBVirtualUART 实现解析

这种自带队列的协议栈，需要自己派生ReadPort和WritePort，调用内部的队列API。唯一需要解释的是ProcessPendingReads的作用。

首先ReadPort基类的读取流程是：

1. 判断队列中数据是否足够。队列中数据足够->直接出队，完成接收。
2. 队列中数据不足->调用对应类注册的ReadFun，等待完成操作/后续被触发。

所以当接收频率很高时，有极小概率在 1 2 之间收到数据并触发中断/回调。虽然数据不会丢失，但是此次接收并不会“观察”到中断推送的数据，而中断/回调也并不知道正在接收。即使队列中数据足够，也会等到下次触发中断/回调的时候完成读取，影响实时性。

这是BusyState的定义。

```cpp
enum class BusyState : uint32_t
{
  IDLE = 0,            // 无正在进行的读操作
  PENDING = 1,         // 有一个正在进行的读操作
  EVENT = UINT32_MAX   // 无正在进行的读操作，但是触发了中断
};
```

所以触发中断时如果未发现正在进行的读操作，就`busy_.store(BusyState::EVENT, std::memory_order_release)`。对其所有可能的情况进行分类讨论：

- 读取流程1之前写入了BusyState::EVENT，会直接覆写这个变量为BusyState::IDLE，并检查队列数据是否足够。完全无影响。
- 读取流程2之后写入了BusyState::EVENT，说明读取操作早已经完成。（完成读取操作时也会覆写这个变量为BusyState::IDLE）
- 1 2 之间写入了BusyState::EVENT，在流程2使用CAS操作写入PENDING的时候会失败。然后再次从流程1开始，检查队列数据是否足够。

这样就能够解决这个问题。在上面两种类型的驱动中，LibXR已经进行了处理。但是此处需要用户自己处理。

### 读写端口派生

将队列大小设置为0，可以关闭LibXR内部的无锁队列。写操作队列长度为1就好，写入TinyUSB内部FIFO即为成功，FIFO满的时候直接失败。

```cpp
class TinyUSBUARTReadPort : public ReadPort
{
 public:
  TinyUSBUARTReadPort(TinyUSBVirtualUART *uart) : ReadPort(0), uart_(uart) {}

  size_t EmptySize() {
    // TinyUSB FIFO最大容量 - 已有数据
    return CFG_TUD_CDC_RX_BUFSIZE - tud_cdc_available();
  }

  size_t Size() {
    return tud_cdc_available();
  }

  void ProcessPendingReads(bool in_isr = true) {
    BusyState curr = busy_.load(std::memory_order_relaxed);

    if (curr == BusyState::PENDING)
    {
      if (Size() >= info_.data.size_)
      {
        int len = tud_cdc_read(static_cast<uint8_t *>(info_.data.addr_), info_.data.size_);
        busy_.store(BusyState::IDLE, std::memory_order_release);

        if (len == static_cast<int>(info_.data.size_))
        {
          Finish(in_isr, ErrorCode::OK, info_, info_.data.size_);
        }
        else
        {
          Finish(in_isr, ErrorCode::EMPTY, info_, len);
        }
      }
    }
    else if (curr == BusyState::IDLE)
    {
      busy_.store(BusyState::EVENT, std::memory_order_release);
    }
  }

  void Reset() { read_size_ = 0; }

  using ReadPort::operator=;

 private:
  TinyUSBVirtualUART *uart_;
};

// Write端口
class TinyUSBUARTWritePort : public WritePort
{
 public:
  TinyUSBUARTWritePort(TinyUSBVirtualUART *uart) : WritePort(1, 0), uart_(uart) {}

  size_t EmptySize() {
    return tud_cdc_write_available();
  }

  size_t Size() {
    return CFG_TUD_CDC_TX_BUFSIZE - tud_cdc_write_available();
  }

  void Reset() { write_size_ = 0; }

  using WritePort::operator=;

 private:
  TinyUSBVirtualUART *uart_;
};
```

### 初始化

此处的_read_port和_write_port即为TinyUSBUARTReadPort和TinyUSBUARTWritePort类的对象。

```cpp
TinyUSBVirtualUART::TinyUSBVirtualUART()
    : UART(&_read_port, &_write_port), _read_port(this), _write_port(this)
{
  self = this;
  _read_port = ReadFun;
  _write_port = WriteFun;
  tusb_init();
}
```

同时配置tusb为裸机模式，tud_task在中断中调用，这样就能够不使用独立的线程/定时任务（提高响应速度，节省资源），并在中断中进行读写操作了。

```cpp
void USBFS_IRQHandler(void)
{
  tud_int_handler(0);
  tud_task_ext(0, true);
}
```

### 用户写入

直接推到TinyUSB的内置队列，入队即为写入成功。

```cpp
ErrorCode TinyUSBVirtualUART::WriteFun(WritePort &port)
{
  WriteInfoBlock info;
  if (port.queue_info_->Pop(info) != ErrorCode::OK) return ErrorCode::EMPTY;

  if (!tud_cdc_connected())
  {
    port.Finish(false, ErrorCode::FAILED, info, 0);
    return ErrorCode::INIT_ERR;
  }

  size_t space = tud_cdc_write_available();
  if (space < info.data.size_) return ErrorCode::FULL;

  size_t written =
      tud_cdc_write(static_cast<const uint8_t *>(info.data.addr_), info.data.size_);
  tud_cdc_write_flush();

  if (written == info.data.size_)
  {
    port.Finish(false, ErrorCode::OK, info, written);
    return ErrorCode::OK;
  }
  else
  {
    port.Finish(false, ErrorCode::FAILED, info, written);
    return ErrorCode::FAILED;
  }
}
```

### 用户读取

同样，直接读取TinyUSB的内置队列。

```cpp
ErrorCode TinyUSBVirtualUART::ReadFun(ReadPort &port)
{
  if (!tud_cdc_connected())
  {
    port.Finish(false, ErrorCode::FAILED, port.info_, 0);
    return ErrorCode::INIT_ERR;
  }

  if (tud_cdc_available() >= port.info_.data.size_)
  {
    int len = tud_cdc_read(static_cast<uint8_t *>(port.info_.data.addr_),
                           port.info_.data.size_);
    port.read_size_ = len;
    return ErrorCode::OK;
  }
  return ErrorCode::EMPTY;
}
```

### 中断逻辑

在tinyusb的回调中更新正在进行的读操作。

```cpp
extern "C" void tud_cdc_rx_cb(uint8_t itf)
{
  UNUSED(itf);
  if (TinyUSBVirtualUART::self)
  {
    auto &port = TinyUSBVirtualUART::self->_read_port;
    size_t avail = tud_cdc_available();
    if (avail > 0)
    {
      port.ProcessPendingReads(true);
    }
  }
}
```

## 其他难搞的驱动

以ESP32VirtualUART为例。

### 读写接口

写使用信号量通知写线程，读操作还是靠内部的无锁队列。

```cpp
  static ErrorCode WriteFun(WritePort &port)
  {
    ESP32VirtualUART *uart = CONTAINER_OF(&port, ESP32VirtualUART, _write_port);
    uart->write_sem_.Post();

    return ErrorCode::FAILED;
  }

  static ErrorCode ReadFun(ReadPort &port)
  {
    UNUSED(port);

    return ErrorCode::EMPTY;
  }
```

### 读写线程

读线程调用SDK阻塞读取数据，有任何数据时直接推送到无锁队列并更新正在进行的写操作。
写线程等待信号量唤醒，从无锁队列中取数据，然后使用SDK阻塞写入数据，写入完成后更新正在进行的写操作。

```cpp
  void TxTask(ESP32VirtualUART *uart)
  {
    WriteInfoBlock info;

    while (true)
    {
      if (uart->write_sem_.Wait() != ErrorCode::OK)
      {
        continue;
      }
      if (uart->write_port_->queue_info_->Pop(info) != ErrorCode::OK)
      {
        continue;
      }

      if (uart->write_port_->queue_data_->PopBatch(uart->tx_buffer_, info.data.size_) !=
          ErrorCode::OK)
      {
        uart->write_port_->Finish(false, ErrorCode::FAILED, info, info.data.size_);
        continue;
      }

      int sent =
          usb_serial_jtag_write_bytes(uart->tx_buffer_, info.data.size_, portMAX_DELAY);
      if (sent == info.data.size_)
      {
        uart->write_port_->Finish(false, ErrorCode::OK, info, sent);
        continue;
      }
      else
      {
        uart->write_port_->Finish(false, ErrorCode::FAILED, info, sent);
        continue;
      }
    }
  }

  void RxTask(ESP32VirtualUART *uart)
  {
    ReadInfoBlock block;

    while (true)
    {
      auto avail = usb_serial_jtag_read_ready();
      int len = 0;
      if (!avail)
      {
        len = usb_serial_jtag_read_bytes(uart->rx_buffer_, 1, portMAX_DELAY);
      }
      else
      {
        len = usb_serial_jtag_read_bytes(uart->rx_buffer_, BUFFER_SIZE, 0);
      }
      if (len > 0)
      {
        uart->read_port_->queue_data_->PushBatch(uart->rx_buffer_, len);
        uart->read_port_->ProcessPendingReads(false);
      }
    }
  }
```

## 总结

LibXR串口驱动核心在于无锁并发和极限性能，通过环形DMA、双缓冲和原子操作保证了高速吞吐时数据不中断、不丢失。同时接口设计简单合理，能够实现对常见所有平台外设的兼容。
