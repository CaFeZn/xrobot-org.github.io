---
id: stm32-code-gen-uart
title: UART and Terminal
sidebar_position: 10
---

# UART and Terminal

LibXR supports two types of UARTs: **Hardware UART** and **USB CDC**. Both can be used for serial debugging and terminal interaction.

- **Hardware UART** requires interrupt and DMA enabled;
- **USB CDC** requires interrupt enabled, and the appropriate USB support depending on the OS (e.g., FreeRTOS or ThreadX).

## UART Code Examples

```cpp
// Hardware UART
STM32UART usart1(&huart1, usart1_rx_buf, usart1_tx_buf, 5);

// USB CDC (FreeRTOS or bare-metal)
STM32VirtualUART uart_cdc(hUsbDeviceFS, UserTxBufferFS, UserRxBufferFS, 5);

// USB CDC (ThreadX + USBX)
STM32VirtualUART uart_cdc(&hpcd_USB_FS, 2048, 2, 2048, 2, 12, 256);
```

> Note: On **ThreadX**, USBX replaces the official ST USB library. The constructor parameters are different and require a USB PCD handle (e.g., `&hpcd_USB_FS`).

## Terminal Code Examples

```cpp
// If using hardware UART
STDIO::read_ = usart1.read_port_;
STDIO::write_ = usart1.write_port_;

// If using USB CDC
STDIO::read_ = uart_cdc.read_port_;
STDIO::write_ = uart_cdc.write_port_;

// Create a virtual file system
RamFS ramfs("XRobot");

// Create the terminal
Terminal<32, 32, 5, 5> terminal(ramfs);

// Method 1: Run as a task (default)
auto terminal_task = Timer::CreateTask(terminal.TaskFun, &terminal, 10);
Timer::Add(terminal_task);
Timer::Start(terminal_task);

// Method 2: Run as a thread (independent thread)
LibXR::Thread terminal_thread;
terminal_thread.Create(&terminal, terminal.ThreadFun, "terminal", 512,
                       LibXR::Thread::Priority::MEDIUM);
```

## Configuration File Explanation

You can control UART and terminal behavior through the configuration file:

```yaml
# Select the default UART source for terminal binding (usb or usart1, etc.)
# Leave empty to disable terminal
terminal_source: usb

# Terminal-related settings (optional)
Terminal:
  read_buff_size: 32      # Terminal read buffer size
  max_line_size: 32       # Maximum line size
  max_arg_number: 5       # Maximum argument number
  max_history_number: 5   # Maximum history number
  run_as_thread: true       # Run as a thread
  thread_stack_depth: 1024  # Thread stack depth (only effective under thread mode)
  thread_priority: 3       # Thread priority (only effective under thread mode)

# Hardware UART configuration
USART:
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    dma_section: ''
    tx_queue_size: 5

# USB CDC configuration (effective under FreeRTOS)
USB:
  tx_queue_size: 12
```

> The `UserTxBufferFS` and `UserRxBufferFS` buffers are only used when the **official ST USB library** (under FreeRTOS) is used. These are not required in ThreadX + USBX mode.

---

## Code Generation Command

After modifying `.config.yaml`, use one of the following commands to regenerate the code:

```bash
# Regenerate the entire project
xr_cubemx_cfg -d .
```

Or:

```bash
# Regenerate only app_main.cpp
xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp
```
