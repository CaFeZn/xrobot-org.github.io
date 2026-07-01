---
id: core-string
title: 定长字符串
sidebar_position: 5
---

# 定长字符串

当前主线中的字符串相关接口主要分为两类：

- `LibXR::String<N>`：固定容量、值语义的定长字符串；
- `LibXR::RuntimeStringView<...>`：运行期构造、长期保留的 NUL 结尾字符串视图。

前者适合固定容量的小字符串值对象，后者适合“模块名 / topic 名 / 运行期格式化结果”这类需要长期保留但不想每次重新分配和拼接的文本。

## 特性概览

- **固定长度**：最大长度通过模板参数 `MaxLength` 指定，底层使用 `std::array<char, MaxLength+1>` 存储，并始终以 `\0` 结尾。
- **安全操作**：大部分接口使用边界检查和断言，确保不会越界访问。
- **兼容 C 风格字符串**：支持从 `const char*`、指定长度的字符串构造，并支持 `Raw()` 获取底层字符串。
- **字符串追加与查找**：支持 `+=` 追加和 `Find()` 查找子串。
- **完整的比较操作符支持**：支持 `==, !=, <, >, <=, >=` 运算符。

## 使用示例

```cpp
LibXR::String<32> s1("hello");
s1 += " world";
int idx = s1.Find("lo");  // 返回 3
auto sub = s1.Substr<5>(6);  // 从下标 6 开始截取 5 个字符的子串
```

```cpp
LibXR::RuntimeStringView<"camera_{}", unsigned int> name;
name.Reformat(7U);
// name.View() == "camera_7"
```

## 接口说明

### 构造函数

- `String()`：构造空字符串。
- `String(const char* str)`：从 C 风格字符串构造。
- `String(const char* str, size_t len)`：从指定长度的字符串构造。

### 基本方法

- `const char* Raw() const`：获取底层 C 风格字符串。
- `size_t Length() const`：获取字符串当前长度。
- `void Clear()`：清空字符串。
- `int Find(const char* str) const`：查找子串位置，不存在返回 -1。
- `template <unsigned int SubStrLength> String<SubStrLength> Substr(size_t pos) const`：从指定位置提取子串。

### 操作符

- `+=`：追加 C 字符串。
- `[]`：索引访问字符（带边界断言）。
- 比较操作符：`==, !=, <, >, <=, >=` 均支持跨不同长度模板的 `String<N>`。

## `RuntimeStringView`

`RuntimeStringView<Source, Args...>` 是当前主线里另一条公开字符串能力，定义在 `libxr_string.hpp` 中。

它的核心用途不是做“小字符串值对象”，而是：

- 保留一段运行期生成的、以 `\0` 结尾的文本；
- 后续可通过 `View()` / `CStr()` 反复读取；
- 对格式化路径只在第一次重写前按编译期上界分配容量，之后复用同一块存储。

### 两类构造路径

1. **纯文本拷贝 / 拼接路径**

```cpp
LibXR::RuntimeStringView<> topic_name("camera/front");
LibXR::RuntimeStringView<> path("/dev/", "ttyUSB0");
```

这一条路径只接受文本类输入；如果要拼数字，不应直接靠构造函数拼接。

2. **格式化重写路径**

```cpp
LibXR::RuntimeStringView<"camera_{}", unsigned int> name;
name.Reformat(7U);

LibXR::RuntimeStringView<"frame_%03u", unsigned int> frame;
frame.Reprintf(5U);
```

- `Reformat(...)` 使用 brace 风格格式；
- `Reprintf(...)` 使用 printf 风格格式；
- 当前实现会严格检查刷新调用的参数类型是否与模板参数 `Args...` 一致。

### 当前主线语义边界

- `RuntimeStringView` 的格式化参数当前只接受可静态界定容量的值类型；运行期字符串参数会被拒绝，文本拼接应改走 `RuntimeStringView<>` 的普通构造路径。
- 当前实现的对象析构时**不会释放已分配存储**；它的设计目标是“一次分配后长期复用”的保留字符串视图，而不是短生命周期自动回收容器。
- `Status()` 返回最近一次构造或重写状态；失败后会把可见字符串清成空串。

### 常用访问接口

- `std::string_view View() const`
- `const char* CStr() const`
- `size_t Size() const`
- `bool Empty() const`
- `ErrorCode Status() const`

如果你需要的是确定容量、值语义、自动随对象释放的短字符串，优先使用 `String<N>`；如果你需要的是一次构造后长期保留、重复重写的运行期名字或格式化结果，使用 `RuntimeStringView` 更贴近当前主线设计。
