---
id: stm32-code-gen-uart
title: 串口与终端
sidebar_position: 10
---

# 串口与终端

LibXR 支持两种串口类型：**硬件串口** 和 **USB CDC**。它们均可用于串口调试与终端交互。

- **硬件串口** 需启用中断与 DMA；
- **USB CDC** 需启用中断，并根据所用系统（如 FreeRTOS 或 ThreadX）启用对应 USB 支持。

## 串口代码示例

```cpp
// 硬件串口
STM32UART usart1(&huart1, usart1_rx_buf, usart1_tx_buf, 5);

// USB CDC（FreeRTOS 或裸机下）
STM32VirtualUART uart_cdc(hUsbDeviceFS, UserTxBufferFS, UserRxBufferFS, 5);

// USB CDC（ThreadX + USBX）
STM32VirtualUART uart_cdc(&hpcd_USB_FS, 2048, 2, 2048, 2, 12, 256);
```

> 注意：在 **ThreadX 系统** 中，使用 USBX 替代 ST 官方 USB 库，构造函数参数也不同，使用 USB PCD 句柄（如 `&hpcd_USB_FS`）初始化。

## 终端代码示例

```cpp
// 如果使用硬件串口
STDIO::read_ = usart1.read_port_;
STDIO::write_ = usart1.write_port_;

// 如果使用 USB CDC
STDIO::read_ = uart_cdc.read_port_;
STDIO::write_ = uart_cdc.write_port_;

// 创建虚拟文件系统
RamFS ramfs("XRobot");

// 创建终端
Terminal<32, 32, 5, 5> terminal(ramfs);

// 方式一：作为任务运行（默认）
auto terminal_task = Timer::CreateTask(terminal.TaskFun, &terminal, 10);
Timer::Add(terminal_task);
Timer::Start(terminal_task);

// 方式二：作为线程运行（独立线程）
LibXR::Thread terminal_thread;
terminal_thread.Create(&terminal, terminal.ThreadFun, "terminal", 512,
                       LibXR::Thread::Priority::MEDIUM);
```

## 配置文件说明

可通过配置文件控制串口与终端行为：

```yaml
# 选择默认终端绑定的串口（usb 或 usart1 等），留空表示不启用终端
terminal_source: usb

# 终端相关配置（可选）
Terminal:
  READ_BUFF_SIZE: 32      # 终端读取缓冲区大小
  MAX_LINE_SIZE: 32       # 每行最大字符数
  MAX_ARG_NUMBER: 5       # 每行最大参数个数
  MAX_HISTORY_NUMBER: 5   # 历史命令个数
  RunAsThread: true       # 是否作为线程运行
  ThreadStackDepth: 1024  # 线程栈深度（仅在线程下有效）
  ThreadPriority: 3       # 线程优先级（仅在线程下有效）

# 硬件串口配置
USART:
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    tx_queue_size: 5

# USB CDC 配置（FreeRTOS 下有效）
USB:
  tx_queue_size: 12
```

> USB 的 `UserTxBufferFS` 与 `UserRxBufferFS` 缓冲区仅在使用 **官方 USB 库**（FreeRTOS）时有效。ThreadX + USBX 模式不需要配置这些缓冲。

---

## 生成代码命令

修改 `.config.yaml` 后，可使用以下任一命令重新生成代码：

```bash
# 重新生成整个工程
xr_cubemx_cfg -d .
```

或：

```bash
# 只重新生成app_main.cpp
xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp
```
