---
id: stm32-code-gen-uart
title: 串口与终端
sidebar_position: 10
---

# 串口与终端

LibXR支持两种串口：硬件串口和USB CDC。都可以用于串口调试和终端。

硬件串口需要开启串口中断和DMA，USB CDC也需要开启相关中断，并启用官方USB库。

## 串口代码示例

```cpp
// 硬件串口
STM32UART usart1(&huart1, usart1_rx_buf, usart1_tx_buf, 5, 5);

// USB CDC
STM32VirtualUART uart_cdc(hUsbDeviceFS, UserTxBufferFS, UserRxBufferFS, 5, 5);
```

## 终端代码示例

```cpp
// 重定向标准输入输出
STDIO::read_ = &usart1.read_port_;
STDIO::write_ = &usart1.write_port_;

// 创建虚拟文件系统
RamFS ramfs("XRobot");

// 创建终端
Terminal<32, 32, 5, 5> terminal(ramfs);

// 启动终端任务
auto terminal_task = Timer::CreateTask(terminal.TaskFun, &terminal, 10);
Timer::Add(terminal_task);
Timer::Start(terminal_task);
```

## 配置文件

USB的buffer_size需要在STM32CubeMX的官方USB库中修改

```yaml
# 指定终端使用的串口，''表示不生成终端相关代码
terminal_source: usb

# 硬件串口配置
USART:
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    tx_queue_size: 5
    rx_queue_size: 5

# USB CDC配置
USB:
  tx_queue_size: 12
  rx_queue_size: 12
```

可直接修改该文件。如需应用更新配置，请执行以下任一命令以重新生成代码：  
`xr_cubemx_cfg -d .`  
或  
`xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp`
