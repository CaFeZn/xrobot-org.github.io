---
id: database
title: 闪存数据库
sidebar_position: 5
---

# Database 闪存数据库

LibXR 提供了两种轻量级的嵌入式键值数据库实现：`DatabaseRawSequential` 和 `DatabaseRaw<MinWriteSize>`。
它们均继承自抽象接口类 `Database`，用于嵌入式 Flash 等顺序写入存储介质，具备主备冗余、断电保护、类型安全封装，适配不同的存储对齐约束。

---

## 主要功能

- 支持主/备块数据冗余与校验，断电后可自动恢复；
- 提供统一接口 `Database` 与模板封装 `Database::Key<T>`，支持类型安全读写；
- 两种实现模式：
  - `DatabaseRawSequential`：顺序写入，适用于不支持逆序写入的 Flash；
  - `DatabaseRaw<MinWriteSize>`：面向最小写入单元受限的 Flash 后端，通过模板参数约束最小写入单元大小，并在构造时接收底层 `Flash` 与回收阈值；
- 键值更新后会由数据库实现自动保存；`Restore()` 用于清空数据库并回到初始状态。

---

## 使用示例

### 创建数据库对象

```cpp
LinuxBinaryFileFlash<2048> flash("/tmp/flash.bin", 512, 8);
DatabaseRawSequential db(flash);
```

或使用 `DatabaseRaw<MinWriteSize>`：

```cpp
LinuxBinaryFileFlash<2048> flash2("/tmp/flash2.bin", 512, 16);
DatabaseRaw<16> db(flash2, 128);
```

### 定义类型安全的键

```cpp
int value = 42;
Database::Key<int> key(db, "my_key", value);

// 写入新值
key = 123;

// 读取回变量
key.Load();
printf("value = %d\n", static_cast<int>(key));
```

---

## 类型安全封装：Key

模板类 `Database::Key<T>` 提供类型安全的键值封装，构造时会尝试从数据库中加载键值，若不存在则添加新键。

```cpp
struct Config { uint32_t baudrate; uint8_t mode; };
Database::Key<Config> cfg(db, "uart_cfg", {9600, 1});

// 写入配置
cfg = {115200, 0};

// 加载配置
cfg.Load();
```

- 支持所有 **可平铺内存的 POD 类型**（如结构体、数组、基本类型）；
- 赋值操作 `key = value` 会自动更新数据库；
- 可通过 `key.Load()` 显式从数据库刷新内容。

---

## 方法一览（基类接口）

以下更适合作为用户侧直接使用的接口：

| 方法/操作                       | 功能描述                                                     |
|----------------------------------|----------------------------------------------------------------|
| `DatabaseRawSequential::Restore()` | 清空顺序写数据库并重新初始化                                 |
| `DatabaseRaw<MinWriteSize>::Restore()` | 清空 raw 数据库并重新初始化                              |
| `Key<T>::Set(const T&)`          | 设置键值并写入数据库                                           |
| `Key<T>::Load()`                 | 从数据库加载键值至变量                                         |
| `Key<T>::operator=(const T&)`    | 设置键值（等效于 `Set()`）                                     |
| `Key<T>::operator T()`           | 类型转换操作，返回当前变量值（不自动加载）                   |

---

## 工作机制概述

尽管不同实现的底层机制有所区别，但统一遵循如下设计原则：

- 使用主块和备块交替写入，确保写入过程可恢复；
- 所有键值存储以原始名值对序列化，并带有校验位；
- `Init()` 内部自动判断有效块并尝试恢复数据；
- `Restore()` 可主动清空主备数据并初始化空数据库；
- 每个派生类自动处理页对齐、可用空间等底层逻辑，用户无需关心。

---

## 注意事项

- 请优先使用 `Database::Key<T>` 类型封装进行读写；
- 写入仅在调用 `key = val` 或 `key.Set(val)` 时发生；
- 对所有键值数据类型要求为 POD 且可拷贝存储；
- 若存储已满或写入失败，`Set()` 会返回对应错误码；
- 若要显式清空数据库，可调用具体实现类的 `Restore()`。

---

## 应用场景

- 嵌入式设备参数存储；
- 状态断点续存；
- 多模块配置持久化；
- 无动态内存环境下的安全键值存储；

---

## 示例测试

详见 [`test_database.cpp`]，展示了键值读写、结构体支持、掉电恢复等场景的完整用例。
