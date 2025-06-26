---
id: stm32-code-gen-cache
title: 高速缓存
sidebar_position: 12
---

# 高速缓存 (Cache)

在 STM32 H7/F7 等带 Cache 的系列中，**LibXR** 框架已自动适配 Cache 特性，自动进行 Cache 同步，保证数据一致性。用户仅需在 CubeMX 中开启 I-Cache 和 D-Cache，即可获得高性能，无需手动配置 MPU。

---

## Cache 配置基础

- 参考 `ST AN4839 应用笔记`：**MPU 关闭时，SRAM 区域默认为 WBWA（Write-Back, Write-Allocate）模式。**
- 开启 MPU 后，Cache 策略可以自定义，此处暂不讨论。

---

## DMA 缓冲区内存分区推荐

以 STM32H750 为例，其内部有多个 RAM 区域：**AXI RAM、SRAM1/2/3/4、ITCMRAM、DTCMRAM**。每种内存与 Cache 和 DMA 的关系如下：

- ✅：**无需关心 Cache 一致性**（TCM，CPU直连，DMA无法访问）
- 🔄：**需要 Cache 同步**（Cacheable，DMA/CPU 可访问，LibXR 已自动处理）
- ❌：**DMA 无法访问**

|      | AXI RAM | SRAM1 | SRAM2 | SRAM3 | SRAM4 | ITCMRAM | DTCMRAM |
| ---- | ------- | ----- | ----- | ----- | ----- | ------- | ------- |
| CPU  | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ✅       | ✅       |
| DMA1 | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ❌       | ❌       |
| DMA2 | 🔄       | 🔄     | 🔄     | 🔄     | 🔄     | ❌       | ❌       |
| BDMA | ❌       | ❌     | ❌     | ❌     | 🔄     | ❌       | ❌       |

**说明：**
- AXI RAM、SRAM1~4：适合做大容量缓冲区，但 DMA 读写时**需要 Cache 同步**（LibXR 自动处理）。
- ITCMRAM、DTCMRAM：CPU 独享，高速、低延迟，**不参与 Cache，不适合 DMA Buffer**（DMA 通常无法访问）。
- SRAM4：STM32H7 上唯一支持 BDMA 的内存区，适合特殊外设用作缓冲。

---

## 链接脚本分区示例

在 `STM32H7` 的 `.ld` 文件中增加如下 section，可以让特定变量放到对应物理内存区域：

```ld
.ram_d3 (NOLOAD) : 
{
  . = ALIGN(4);
  *(.ram_d3)
  *(.ram_d3*)
  . = ALIGN(4);
} >RAM_D3

.axi_ram (NOLOAD) :
{
  . = ALIGN(4);
  *(.axi_ram)
  *(.axi_ram*)
  . = ALIGN(4);
} >RAM
```

---

## LibXR 缓冲区分配配置示例

在 LibXR 的 `libxr_config.yaml` 或你的项目配置中，推荐为每个 DMA 外设**显式指定缓冲区分区**，如下：

```yaml
SPI:
  spi4:
    tx_buffer_size: 32
    rx_buffer_size: 32
    dma_section: '.axi_ram'
    dma_enable_min_size: 3
I2C:
  i2c1:
    buffer_size: 32
    dma_section: '.axi_ram'
    dma_enable_min_size: 3
USART:
  lpuart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    dma_section: '.ram_d3'
    tx_queue_size: 5
  usart1:
    tx_buffer_size: 128
    rx_buffer_size: 128
    dma_section: '.axi_ram'
    tx_queue_size: 5
ADC:
  adc3:
    buffer_size: 128
    dma_section: '.ram_d3'
    vref: 3.3
```

---

## 生成结果举例

通过 `xr_gen_code_stm32 -i ./.config.yaml -o ./User/app_main.cpp` 自动生成：

```cpp
static uint16_t adc3_buf[64] __attribute__((section(".ram_d3")));
static uint8_t spi4_tx_buf[32] __attribute__((section(".axi_ram")));
static uint8_t spi4_rx_buf[32] __attribute__((section(".axi_ram")));
static uint8_t lpuart1_tx_buf[128] __attribute__((section(".ram_d3")));
static uint8_t lpuart1_rx_buf[128] __attribute__((section(".ram_d3")));
static uint8_t usart1_tx_buf[128] __attribute__((section(".axi_ram")));
static uint8_t usart1_rx_buf[128] __attribute__((section(".axi_ram")));
static uint8_t i2c1_buf[32] __attribute__((section(".axi_ram")));
```

## 使用

与无Cache时一致，无需特别处理。
