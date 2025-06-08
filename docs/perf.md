---
id: perf
title: 关于性能
sidebar_position: 3
---

# 关于性能

对于本框架来说，有一个问题经常会被问到：**"LibXR对底层驱动封装之后，性能是否会很差？"**

这个问题的答案是：**完全不必担心**。虽然相比与直接调用厂家SDK(例如hal库，ESP-IDF)提供的API来自行管理DMA等资源，性能会有一定的损失，但是这种损失是很小的，可以忽略不计。下面会附上一些性能测试结果，大家可以自行分析。

## 测试环境

串口驱动是整个LibXR里面最复杂的部分，性能测试的环境如下：

* STM32F103，Cortex-M3 @ 72Mhz，无FPU和Cache
* 使用杜邦线将USART1的TX RX连接起来，数据位为8，停止位为1，无流控，无奇偶校验
* 开启一个频率50khz的定时器中断，用于FreeRTOS的占用率统计
* 收到数据后对首尾进行检查，出现任何错误都会中断测试，并输出错误信息

## 测试代码

```cpp
  LibXR::Semaphore sem_r, sem_w;
  LibXR::ReadOperation op_r(sem_r);
  LibXR::WriteOperation op_w(sem_w);
  static uint8_t read_buffer[256], write_buffer[256];
  uint32_t count = 0;

  void (*fun)(uint32_t *) = [](uint32_t *count) {
    XR_LOG_INFO("\r\ncount: %d, speed: %d BAUD", *count,
                *count * 10 * sizeof(write_buffer));
    *count = 0;
    static uint8_t cpu_info[400];

    memset(cpu_info, 0, 400);

    vTaskList((char *)&cpu_info);

    XR_LOG_DEBUG("\r\n---------------------------------------------\r\n");
    XR_LOG_DEBUG("\r\n任务名      任务状态 优先级   剩余栈 任务序号\r\n");
    XR_LOG_DEBUG("\r\n%s", cpu_info);
    XR_LOG_DEBUG("\r\n---------------------------------------------\r\n");

    memset(cpu_info, 0, 400);

    vTaskGetRunTimeStats((char *)&cpu_info);

    XR_LOG_DEBUG("\r\n任务名       运行计数         利用率\r\n");
    XR_LOG_DEBUG("\r\n%s", cpu_info);
    XR_LOG_DEBUG("\r\n---------------------------------------------\r\n\n");
  };
  auto print_task = LibXR::Timer::CreateTask(fun, &count, 1000);
  LibXR::Timer::Add(print_task);
  LibXR::Timer::Start(print_task);

  for (uint32_t i = 0; i < sizeof(write_buffer); i++) {
    write_buffer[i] = i;
  }

  usart1.SetConfig({2000000, LibXR::UART::Parity::NO_PARITY, 8, 1});
  while (true) {
    write_buffer[0]++;
    write_buffer[sizeof(write_buffer) - 1]--;
    usart1.Write(write_buffer, op_w);
    usart1.Read(read_buffer, op_r);
    ASSERT(read_buffer[sizeof(read_buffer) - 1] ==
           write_buffer[sizeof(write_buffer) - 1]);
    ASSERT(read_buffer[0] == write_buffer[0]);
    count++;
  }
```

## 测试结果

### 同步方式

同步模式需要等待数据传输完成，因此距离理论最大波特率相差较大。

```bash
# 无优化，256字节每包，同步方式收发，2M波特率
每秒包数： 480, 实际波特率： 1228800 BAUD
任务名            运行计数        利用率
libxr_timer_task 70824           5%
defaultTask      343292          28%
IDLE             786968          65%
terminal         6               <1%
Tmr Svc          1               <1%

# -Og优化，256字节每包，同步方式收发，2M波特率
每秒包数： 552, 实际波特率： 1413120 BAUD
任务名            运行计数        利用率
libxr_timer_task 19505           2%
defaultTask      140176          21%
IDLE             493635          75%
terminal         3               <1%
Tmr Svc          0               <1%

# -O3优化，256字节每包，同步方式收发，2M波特率
每秒包数： 560, 实际波特率： 1433600 BAUD
任务名            运行计数        利用率
libxr_timer_task 15535           2%
defaultTask      128254          19%
IDLE             499330          77%
terminal         3               <1%
Tmr Svc          1               <1%
```

### 异步方式

异步方式无需等待数据传输完成，因此波特率可以达到理论最大值。

```bash
# 无优化，256字节每包，异步方式收发，2M波特率
每秒包数： 770, 实际波特率： 1971200 BAUD
任务名            运行计数        利用率
libxr_timer_task 32071           7%
defaultTask      160159          38%
IDLE             223565          53%
terminal         6               <1%
Tmr Svc          1               <1%

# -Og优化，256字节每包，异步方式收发，2M波特率
每秒包数： 779, 实际波特率： 1994240 BAUD
任务名            运行计数        利用率
libxr_timer_task 161892          4%
defaultTask      399267          9%
IDLE             3480600         86%
terminal         3               <1%
Tmr Svc          1               <1%

# -O3优化，256字节每包，异步方式收发，2M波特率
每秒包数： 779, 实际波特率： 1994240 BAUD
任务名            运行计数        利用率
libxr_timer_task 22077           3%
defaultTask      58714           8%
IDLE             604531          88%
terminal         3               <1%
Tmr Svc          0               <1%
```

### 其他情况

受限于硬件性能，实际波特率可能会比理论最大值略低。

```bash
# -O3优化，64字节每包，异步方式收发，4M波特率
每秒包数： 5824, 实际波特率： 3727360 BAUD
任务名            运行计数        利用率
libxr_timer_task 22170           3%
defaultTask      497262          85%
IDLE             58956           10%
terminal         3               <1%
Tmr Svc          1               <1%

# -O3优化，512字节每包，异步方式收发，4M波特率
每秒包数： 780, 实际波特率： 3993600 BAUD
任务名            运行计数        利用率
libxr_timer_task 24692           5%
defaultTask      103896          23%
IDLE             321381          71%
terminal         3               <1%
Tmr Svc          1               <1%

# -O3优化，16字节每包，异步方式收发，1M波特率
每秒包数： 5145, 实际波特率： 823200 BAUD
任务名            运行计数        利用率
libxr_timer_task 12758           2%
defaultTask      124461          23%
IDLE             389558          73%
terminal         3               <1%
Tmr Svc          1               <1%
```

## 总结

在 STM32F103 上，2Mbps 波特率下异步模式可达 **1.99 M**带宽，接近理论极限，CPU 空闲率高达 **88%**。即便使用同步模式，也能达到 **1.43 M**带宽。**LibXR 对底层驱动的封装几乎不影响性能**。
