---
id: perf
title: About Performance
sidebar_position: 3
---

# About Performance

A frequently asked question about this framework is:  
**"Will performance degrade significantly after LibXR wraps the low-level drivers?"**

The answer is: **there’s no need to worry at all.**  
Although there is a slight performance loss compared to manually managing DMA and other resources via direct use of vendor SDKs (e.g., HAL, ESP-IDF), the loss is minimal and negligible. Below are some performance test results for your own analysis.

## Test Environment

The UART driver is one of the most complex parts of LibXR. The performance test setup is as follows:

- STM32F103, Cortex-M3 @ 72 MHz, without FPU or cache  
- TX and RX of USART1 connected via Dupont wires  
- 8 data bits, 1 stop bit, no flow control, no parity  
- A 50 kHz timer interrupt is used for FreeRTOS CPU usage statistics  
- The received data is checked at both the start and end; any error aborts the test and prints a message  

## Test Code

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
  static uint8_t cpu_info[1000];

  memset(cpu_info, 0, 400);
  vTaskList((char *)&cpu_info);

  XR_LOG_DEBUG("\r\n---------------------------------------------\r\n");
  XR_LOG_DEBUG("\r\nTask Name    State  Prio  Stack Left  Task Num\r\n");
  XR_LOG_DEBUG("\r\n%s", cpu_info);
  XR_LOG_DEBUG("\r\n---------------------------------------------\r\n");

  memset(cpu_info, 0, 400);
  vTaskGetRunTimeStats((char *)&cpu_info);

  XR_LOG_DEBUG("\r\nTask Name    Run Count    CPU Usage\r\n");
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
  ASSERT(read_buffer[sizeof(read_buffer) - 1] == write_buffer[sizeof(write_buffer) - 1]);
  ASSERT(read_buffer[0] == write_buffer[0]);
  count++;
}
```

## Test Results

### Synchronous Mode

Synchronous mode waits for data transfer completion, so the actual throughput is lower than the theoretical baud rate.

```bash
# No optimization, 256 bytes per packet, sync transfer, 2M baud
Packets/sec: 480, Actual baud rate: 1228800 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 70824        5%
defaultTask      343292       28%
IDLE             786968       65%
terminal         6            <1%
Tmr Svc          1            <1%

# -Og optimization, 256 bytes per packet, sync transfer, 2M baud
Packets/sec: 552, Actual baud rate: 1413120 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 19505        2%
defaultTask      140176       21%
IDLE             493635       75%
terminal         3            <1%
Tmr Svc          0            <1%

# -O3 optimization, 256 bytes per packet, sync transfer, 2M baud
Packets/sec: 560, Actual baud rate: 1433600 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 15535        2%
defaultTask      128254       19%
IDLE             499330       77%
terminal         3            <1%
Tmr Svc          1            <1%
```

### Asynchronous Mode

Asynchronous mode doesn't wait for data transfer completion, so it can reach near-theoretical max throughput.

```bash
# No optimization, 256 bytes per packet, async transfer, 2M baud
Packets/sec: 770, Actual baud rate: 1971200 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 32071        7%
defaultTask      160159       38%
IDLE             223565       53%
terminal         6            <1%
Tmr Svc          1            <1%

# -Og optimization, 256 bytes per packet, async transfer, 2M baud
Packets/sec: 779, Actual baud rate: 1994240 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 161892       4%
defaultTask      399267       9%
IDLE             3480600      86%
terminal         3            <1%
Tmr Svc          1            <1%

# -O3 optimization, 256 bytes per packet, async transfer, 2M baud
Packets/sec: 779, Actual baud rate: 1994240 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 22077        3%
defaultTask      58714        8%
IDLE             604531       88%
terminal         3            <1%
Tmr Svc          0            <1%
```

### Other Cases

Due to hardware limits, actual baud rate may fall slightly below theoretical maximum.

```bash
# -O3 optimization, 64 bytes per packet, async transfer, 4M baud
Packets/sec: 5824, Actual baud rate: 3727360 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 22170        3%
defaultTask      497262       85%
IDLE             58956        10%
terminal         3            <1%
Tmr Svc          1            <1%

# -O3 optimization, 512 bytes per packet, async transfer, 4M baud
Packets/sec: 780, Actual baud rate: 3993600 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 24692        5%
defaultTask      103896       23%
IDLE             321381       71%
terminal         3            <1%
Tmr Svc          1            <1%

# -O3 optimization, 16 bytes per packet, async transfer, 1M baud
Packets/sec: 5145, Actual baud rate: 823200 BAUD
Task Name        Run Count    CPU Usage
libxr_timer_task 12758        2%
defaultTask      124461       23%
IDLE             389558       73%
terminal         3            <1%
Tmr Svc          1            <1%
```

## Summary

On STM32F103, the asynchronous mode achieves up to **1.99 Mbps** bandwidth at **2 Mbps baud rate**, very close to the theoretical limit, with **88% CPU idle time**. Even in synchronous mode, it still achieves **1.43 Mbps**.  
**LibXR’s driver abstraction introduces virtually no noticeable performance loss.**
