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
* 收到数据后对整包进行CRC8校验，每秒统计发送成功、发送失败和校验失败的次数

## 测试代码

```cpp
  STDIO::write_ = uart_cdc.write_port_;
  static uint8_t read_buffer[8], write_buffer[8];
  static uint32_t count_read = 0, count_write = 0, count_error = 0;

  for (uint32_t i = 0; i < sizeof(write_buffer); i++) {
    write_buffer[i] = i;
  }

  usart1.SetConfig({2000000, LibXR::UART::Parity::NO_PARITY, 8, 1});

  void (*fun)(void *) = [](void *) {
    LibXR::STDIO::Printf("read count: %d, write count: %d, error count: %d\r\n",
                         count_read, count_write, count_error);
    LibXR::STDIO::Printf("speed: %d BAUD\r\n",
                         count_read * 10 * sizeof(write_buffer));
    count_read = 0;
    count_write = 0;
    static uint8_t cpu_info[1000];

    memset(cpu_info, 0, 400);

    vTaskList((char *)&cpu_info);

    LibXR::STDIO::Printf("---------------------------------------------\r\n");
    LibXR::STDIO::Printf("任务名          任务状态 优先级  剩余栈   任务序号\r\n");
    LibXR::STDIO::Printf("%s\r\n", cpu_info);
    LibXR::STDIO::Printf("---------------------------------------------\r\n");

    memset(cpu_info, 0, 400);

    vTaskGetRunTimeStats((char *)&cpu_info);

    LibXR::STDIO::Printf("任务名           运行计数        利用率\r\n");
    LibXR::STDIO::Printf("%s\r\n", cpu_info);
    LibXR::STDIO::Printf("---------------------------------------------\r\n\n");
  };

  auto print_task =
      LibXR::Timer::CreateTask(fun, reinterpret_cast<void *>(0), 1000);
  LibXR::Timer::Add(print_task);
  LibXR::Timer::Start(print_task);

  void (*thread_read)(void *) = [](void *) {
    LibXR::Semaphore sem(0);
    LibXR::ReadOperation op(sem);
    while (true) {
      usart1.Read(read_buffer, op);
      if (LibXR::CRC8::Verify(read_buffer, sizeof(read_buffer))) {
        count_read++;
      } else {
        count_error++;
      }
    }
  };

  void (*thread_write)(void *) = [](void *) {
    LibXR::Semaphore sem(2);
    LibXR::WriteOperation op(sem);

    while (true) {
      write_buffer[0]++;
      write_buffer[sizeof(write_buffer) - 1] = LibXR::CRC8::Calculate(
          write_buffer, sizeof(write_buffer) - sizeof(uint8_t));

      usart1.Write(write_buffer, op);
      count_write++;
    }
  };

  LibXR::Thread read_thread, write_thread;

  read_thread.Create(reinterpret_cast<void *>(0), thread_read, "read_thread",
                     2048, static_cast<LibXR::Thread::Priority>(3));

  write_thread.Create(reinterpret_cast<void *>(0), thread_write, "write_thread",
                      2048, static_cast<LibXR::Thread::Priority>(3));

  while (true) {
    LibXR::Thread::Sleep(UINT32_MAX);
  }
```

## 测试结果

### 无优化，32字节每包，波特率2M，有校验

```bash
read count: 5818, write count: 5819, error count: 0
speed: 1861760 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
read_thread     R       3       462     5
write_thread    R       3       458     6
IDLE            R       0       110     2
defaultTask     B       24      822     1
Tmr Svc         B       2       228     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 15310           3%
write_thread    141520          34%
read_thread     112818          27%
IDLE            137269          33%
defaultTask     67              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### 无优化，512字节每包，波特率2M，有校验

```bash
read count: 389, write count: 389, error count: 0
speed: 1991680 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
IDLE            R       0       110     2
defaultTask     B       24      822     1
write_thread    B       3       460     6
Tmr Svc         B       2       228     3
read_thread     B       3       464     5

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 20044           3%
read_thread     28131           4%
write_thread    52271           8%
IDLE            490639          82%
defaultTask     68              <1%
Tmr Svc         0               <1%

---------------------------------------------
```

### O3优化，32字节每包，波特率2M，有校验

```bash
read count: 5818, write count: 5817, error count: 0
speed: 1861760 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
write_thread    R       3       458     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 17612           3%
read_thread     123076          25%
write_thread    176136          36%
IDLE            165183          34%
defaultTask     66              <1%
Tmr Svc         0               <1%

---------------------------------------------
```

### O3优化，512字节每包，波特率2M，有校验

```bash
read count: 389, write count: 388, error count: 0
speed: 1991680 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
write_thread    R       3       460     6
read_thread     R       3       468     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 14161           3%
read_thread     19070           4%
write_thread    36588           8%
IDLE            350612          83%
defaultTask     92              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

由于CRC校验消耗了大量CPU资源，后续测试将在无CRC校验的情况下进行。

### O3优化，32字节每包，波特率2M，无校验

```bash
read count: 5818, write count: 5818, error count: 0
speed: 1861760 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
write_thread    R       3       458     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 19798           3%
read_thread     122126          23%
write_thread    165716          32%
IDLE            208417          40%
defaultTask     90              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### O3优化，512字节每包，波特率2M，无校验

```bash
read count: 389, write count: 389, error count: 0
speed: 1991680 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
IDLE            R       0       109     2
defaultTask     B       24      824     1
write_thread    B       3       458     6
Tmr Svc         B       2       229     3
read_thread     B       3       462     5

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 9337            3%
read_thread     5015            1%
write_thread    27477           9%
IDLE            239340          85%
defaultTask     67              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

另外附上一些其他情况

### O3优化，8字节每包，波特率1M，有校验

```bash
read count: 10953, write count: 10955, error count: 0
speed: 876240 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
write_thread    R       3       456     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 23254           3%
read_thread     265087          37%
write_thread    317509          45%
IDLE            91760           13%
defaultTask     90              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### O3优化，512字节每包，波特率4M，有校验

```bash
read count: 776, write count: 776, error count: 0
speed: 3973120 BAUD
---------------------------------------------
任务名          任务状态 优先级  剩余栈   任务序号
libxr_timer_tas X       20      366     4
write_thread    R       3       456     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
任务名           运行计数        利用率
libxr_timer_tas 19266           4%
read_thread     116507          28%
write_thread    106901          26%
IDLE            159196          39%
defaultTask     92              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

## 总结

LibXR 框架在对底层串口驱动进行封装后，在绝大多数情况下不会造成明显的性能损失。在在 STM32F103（72MHz）平台实测中，2~4 Mbps 波特率下数据收发稳定无误，最高实际吞吐接近物理上限，说明即便在低性能平台也具备高效性能表现，完全可用于对实时性与带宽有要求的应用。
