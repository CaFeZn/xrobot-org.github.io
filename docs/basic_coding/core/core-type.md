---
id: core-rawdata
title: 原始数据与类型标识
sidebar_position: 4
---

# 原始数据与类型标识

本模块提供了原始数据封装类 `RawData`、`ConstRawData` 以及无 RTTI 的类型标识工具 `TypeID`，适用于嵌入式环境中的数据描述与跨模块数据传递。

---

## RawData

```cpp
class RawData;
```

通用数据封装类，存储指针和字节大小：

### 构造方式

- `RawData(void* addr, size_t size)`：直接指定地址与大小。
- `RawData()`：默认构造，空数据。
- `RawData(T&)`：从**可写对象**构造，指向其地址。
- `RawData(char*)`：从 C 字符串构造（不含结尾 `\0`）。
- `RawData(char (&str)[N])`：从可写字符数组构造，最多裁掉一个尾随 `\0`。
- `RawData(std::string&)`：从**可写** `std::string` 构造。

### 字段

- `void* addr_`: 数据指针
- `size_t size_`: 数据大小

---

## ConstRawData

```cpp
class ConstRawData;
```

只读数据封装类，与 `RawData` 类似但地址不可修改：

### 构造方式

- 支持从任意对象、`RawData`、`char* / const char*`、`std::string`、`std::string_view`、字符数组等构造。
- 与 `RawData` 不同，`ConstRawData` 明确以 `const void*` 暴露地址，适合只读场景。

补充说明：

- 字符数组构造当前只会裁掉**一个尾随 `\0`**，其余字节保持原样；
- `char* / const char*` 构造会以 `std::strlen(...)` 作为长度，因此要求文本本身是 NUL 结尾字符串。

### 字段

- `const void* addr_`: 只读数据指针
- `size_t size_`: 数据大小

---

## TypeID

```cpp
class TypeID;
```

轻量级类型标识工具，避免使用 RTTI 与 `typeid`：

### 方法

```cpp
template <typename T>
static TypeID::ID GetID();
```

每种类型返回一个进程内唯一的静态地址（`const void*`）：

```cpp
auto id1 = LibXR::TypeID::GetID<int>();
auto id2 = LibXR::TypeID::GetID<std::string>();
```

用于类型注册、分派、类型区分等无需运行时类型信息（RTTI）的场景。

---

## 应用场景

- 用于通用接口、数据缓存、IPC 传输时传递裸数据
- 在无需 RTTI 的环境中唯一标识某个类型（如嵌入式注册表、插件系统）
- 配合 LibXR::Topic 等组件进行结构体封装传递
