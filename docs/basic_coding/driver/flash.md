---
id: flash
title: 闪存接口
sidebar_position: 8
---

# Flash（闪存接口）

`LibXR::Flash` 提供跨平台的抽象闪存访问接口，用于块擦除与写入操作，适配 NOR/NAND Flash、EEPROM、NVS 等非易失性存储设备。

## 接口定义

```cpp
class Flash {
public:
  Flash(size_t min_erase_size, size_t min_write_size, RawData flash_area);

  // 擦除指定区域（起始偏移与长度）
  virtual ErrorCode Erase(size_t offset, size_t size) = 0;

  // 写入数据到指定偏移地址
  virtual ErrorCode Write(size_t offset, ConstRawData data) = 0;

  size_t min_erase_size_;   // 最小可擦除块大小（字节）
  size_t min_write_size_;   // 最小可写入块大小（字节）
  RawData flash_area_;      // 映射的闪存内存区域
};
```

## 使用说明

- 所有写入必须对齐 `min_write_size_`，擦除对齐 `min_erase_size_`；
- `flash_area_` 指向实际用于存储的内存区域或 Flash 映射地址；
- 上层可基于该接口实现参数存储、文件系统、日志管理等功能。
