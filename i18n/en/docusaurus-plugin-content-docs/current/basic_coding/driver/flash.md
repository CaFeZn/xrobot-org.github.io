---
id: flash
title: Flash Interface
sidebar_position: 8
---

# Flash (Flash Interface)

`LibXR::Flash` provides a cross-platform abstract interface for accessing flash memory, supporting block erase and write operations. It is suitable for non-volatile storage devices such as NOR/NAND Flash, EEPROM, and NVS.

## Interface Definition

```cpp
class Flash {
public:
  Flash(size_t min_erase_size, size_t min_write_size, RawData flash_area);

  // Erase a specified region (starting offset and size)
  virtual ErrorCode Erase(size_t offset, size_t size) = 0;

  // Write data to a specified offset address
  virtual ErrorCode Write(size_t offset, ConstRawData data) = 0;

  size_t min_erase_size_;   // Minimum erasable block size (in bytes)
  size_t min_write_size_;   // Minimum writable block size (in bytes)
  RawData flash_area_;      // Mapped flash memory region
};
```

## Usage Notes

- All writes must be aligned to `min_write_size_`, and erases to `min_erase_size_`;  
- `flash_area_` points to the actual memory region or flash-mapped address used for storage;  
- This interface can be used as a foundation for implementing parameter storage, file systems, log management, and more.
