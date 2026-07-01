---
id: core-rawdata
title: Raw Data and Type Identification
sidebar_position: 4
---

# Raw Data and Type Identification

This module provides the `RawData` and `ConstRawData` classes for encapsulating raw data, along with the `TypeID` utility for type identification without relying on RTTI. These tools are useful for data description and cross-module data transfer in embedded environments.

---

## RawData

```cpp
class RawData;
```

A generic data wrapper that stores a pointer and size in bytes.

### Constructors

- `RawData(void* addr, size_t size)` – Specify address and size directly.
- `RawData()` – Default constructor for empty data.
- `RawData(T&)` – Construct from a **writable** object, referencing its address.
- `RawData(char*)` – Construct from a C-style string (excluding the trailing `\0`).
- `RawData(char (&str)[N])` – Construct from a writable char array, trimming at most one trailing `\0`.
- `RawData(std::string&)` – Construct from a **writable** `std::string`.

### Fields

- `void* addr_` – Data pointer  
- `size_t size_` – Size in bytes

---

## ConstRawData

```cpp
class ConstRawData;
```

Read-only data wrapper, similar to `RawData` but with an immutable address:

### Constructors

- Supports construction from arbitrary objects, `RawData`, `char* / const char*`, `std::string`, `std::string_view`, and char arrays.
- Ensures `addr_` is of type `const void*`, suitable for read-only views.

Additional notes:

- Char-array construction currently trims **at most one trailing `\0`**, not every zero byte in the array.
- `char* / const char*` construction uses `std::strlen(...)`, so it expects a NUL-terminated string.

### Fields

- `const void* addr_` – Read-only data pointer  
- `size_t size_` – Size in bytes

---

## TypeID

```cpp
class TypeID;
```

A lightweight type identification tool to avoid RTTI and `typeid`.

### Method

```cpp
template <typename T>
static TypeID::ID GetID();
```

Returns one process-local static address (`const void*`) for each type:

```cpp
auto id1 = LibXR::TypeID::GetID<int>();
auto id2 = LibXR::TypeID::GetID<std::string>();
```

Useful for type registration, dispatching, or distinguishing types without runtime type information.

---

## Use Cases

- Passing raw data via generic interfaces, data buffers, or IPC mechanisms
- Uniquely identifying types in RTTI-less environments (e.g., embedded registries, plugin systems)
- Wrapping and passing structs via components like `LibXR::Topic`
