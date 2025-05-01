---
id: stm32-code-gen-uart
title: UART & Terminal
sidebar_position: 10
---

# UART & Terminal

LibXR supports two types of UART interfaces: hardware UART and USB CDC. Both can be used for serial debugging and terminal interaction.

For hardware UART, enable UART interrupts and DMA. For USB CDC, enable the corresponding interrupts and use the official STM32 USB library.

## UART Code Example

```cpp
// Hardware UART
STM32UART usart1(&huart1, usart1_rx_buf, usart1_tx_buf, 5, 5);

// USB CDC
STM32VirtualUART uart_cdc(hUsbDeviceFS, UserTxBufferFS, UserRxBufferFS, 5, 5);
```

## Terminal Code Example

```cpp
// Redirect standard input/output
STDIO::read_ = &usart1.read_port_;
STDIO::write_ = &usart1.write_port_;

// Create virtual file system
RamFS ramfs("XRobot");

// Create terminal
Terminal<32, 32, 5, 5> terminal(ramfs);

// Launch terminal task
auto terminal_task = Timer::CreateTask(terminal.TaskFun, &terminal, 10);
Timer::Add(terminal_task);
Timer::Start(terminal_task);
```

## Configuration File

Note: The `buffer_size` for USB must be configured inside STM32CubeMX using the official USB library.

```yaml
# Specify the UART source used for terminal; empty string disables terminal code generation
terminal_source: usb

# Hardware UART configuration
USART:
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    tx_queue_size: 5
    rx_queue_size: 5

# USB CDC configuration
USB:
  tx_queue_size: 12
  rx_queue_size: 12
```

You can modify this file directly. To apply updated settings, run either of the following commands:  
`xr_cubemx_cfg -d .`  
or  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
