---
id: perf
title: About Performance
sidebar_position: 3
---

# About Performance

One common question often asked about this framework is: **"Will LibXR's abstraction over low-level drivers cause significant performance loss?"**

The answer is: **there's absolutely no need to worry**. While using LibXR instead of vendor SDKs (e.g., HAL, ESP-IDF) and managing DMA directly may result in slight overhead, this loss is minimal and can be safely ignored. The following sections include test results for your own analysis.

## Test Environment

The UART driver is one of the most complex parts of LibXR. The testing environment is as follows:

* STM32F103, Cortex-M3 @ 72MHz, no FPU or Cache
* TX and RX of USART1 are connected via jumper wires; 8 data bits, 1 stop bit, no flow control or parity
* A 50kHz timer interrupt is used for FreeRTOS CPU load statistics
* After receiving each data packet, a CRC8 check is performed, and the number of successful sends, failed sends, and CRC failures is counted every second

## Test Code

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
    LibXR::STDIO::Printf("Task Name       State   Prio    Stack   Num\r\n");
    LibXR::STDIO::Printf("%s\r\n", cpu_info);
    LibXR::STDIO::Printf("---------------------------------------------\r\n");

    memset(cpu_info, 0, 400);

    vTaskGetRunTimeStats((char *)&cpu_info);

    LibXR::STDIO::Printf("Task Name       Run Count       CPU Usage\r\n");
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

## Test Results

### No optimization, 32-byte packets, 2M baud, with CRC

```bash
read count: 5818, write count: 5819, error count: 0
speed: 1861760 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
read_thread     R       3       462     5
write_thread    R       3       458     6
IDLE            R       0       110     2
defaultTask     B       24      822     1
Tmr Svc         B       2       228     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 15310           3%
write_thread    141520          34%
read_thread     112818          27%
IDLE            137269          33%
defaultTask     67              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### No optimization, 512-byte packets, 2M baud, with CRC

```bash
read count: 389, write count: 389, error count: 0
speed: 1991680 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
IDLE            R       0       110     2
defaultTask     B       24      822     1
write_thread    B       3       460     6
Tmr Svc         B       2       228     3
read_thread     B       3       464     5

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 20044           3%
read_thread     28131           4%
write_thread    52271           8%
IDLE            490639          82%
defaultTask     68              <1%
Tmr Svc         0               <1%

---------------------------------------------
```

### O3 optimization, 32-byte packets, 2M baud, with CRC

```bash
read count: 5818, write count: 5817, error count: 0
speed: 1861760 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
write_thread    R       3       458     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 17612           3%
read_thread     123076          25%
write_thread    176136          36%
IDLE            165183          34%
defaultTask     66              <1%
Tmr Svc         0               <1%

---------------------------------------------
```

### O3 optimization, 512-byte packets, 2M baud, with CRC

```bash
read count: 389, write count: 388, error count: 0
speed: 1991680 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
write_thread    R       3       460     6
read_thread     R       3       468     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 14161           3%
read_thread     19070           4%
write_thread    36588           8%
IDLE            350612          83%
defaultTask     92              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

Because CRC verification consumes a lot of CPU resources, subsequent tests will be performed without CRC verification.

### O3 optimization, 32-byte packets, 2M baud, no CRC

```bash
read count: 5818, write count: 5818, error count: 0
speed: 1861760 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
write_thread    R       3       458     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 19798           3%
read_thread     122126          23%
write_thread    165716          32%
IDLE            208417          40%
defaultTask     90              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### O3 optimization, 512-byte packets, 2M baud, no CRC

```bash
read count: 389, write count: 389, error count: 0
speed: 1991680 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
IDLE            R       0       109     2
defaultTask     B       24      824     1
write_thread    B       3       458     6
Tmr Svc         B       2       229     3
read_thread     B       3       462     5

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 9337            3%
read_thread     5015            1%
write_thread    27477           9%
IDLE            239340          85%
defaultTask     67              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

Attach the following other cases

### O3 optimization, 8-byte packets, 1M baud, with CRC

```bash
read count: 10953, write count: 10955, error count: 0
speed: 876240 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
write_thread    R       3       456     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 23254           3%
read_thread     265087          37%
write_thread    317509          45%
IDLE            91760           13%
defaultTask     90              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

### O3 optimization, 512-byte packets, 4M baud, with CRC

```bash
read count: 776, write count: 776, error count: 0
speed: 3973120 BAUD
---------------------------------------------
Task Name       State   Prio    Stack   Num
libxr_timer_tas X       20      366     4
write_thread    R       3       456     6
read_thread     R       3       462     5
IDLE            R       0       109     2
defaultTask     B       24      824     1
Tmr Svc         B       2       229     3

---------------------------------------------
Task Name       Run Count       CPU Usage
libxr_timer_tas 19266           4%
read_thread     116507          28%
write_thread    106901          26%
IDLE            159196          39%
defaultTask     92              <1%
Tmr Svc         1               <1%

---------------------------------------------
```

## Summary

After abstracting low-level UART drivers, LibXR introduces **minimal performance overhead**. On the STM32F103 (72MHz, no FPU or Cache), it achieves up to **~4 Mbps** real throughput with **0 errors**, even under multithreaded FreeRTOS conditions. This demonstrates that the framework maintains **high efficiency and reliability**, even on resource-constrained MCUs—suitable for real-time and high-bandwidth embedded applications.
