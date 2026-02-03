---
id: core-callback
title: 通用回调
sidebar_position: 3
---

# 通用回调

本模块提供轻量级、可嵌入中断的通用回调系统，包括 `Callback` 和 `CallbackBlock` 两个模板类，广泛用于异步通知、事件处理、错误回调等场景。

## CallbackBlock

```cpp
template <typename ArgType, typename... Args>
class CallbackBlock;
```

用于封装一个具体的回调函数及其第一个绑定参数，并提供重入保护（reentrancy guard），可在 ISR 或任务上下文触发：

- `FunctionType`: 回调函数签名为 `void(bool in_isr, ArgType arg, Args... args)`。
- `Call(bool in_isr, Args... args)`: 触发回调执行，并透传额外参数。

构造时即完成函数与绑定参数的绑定。支持移动构造与移动赋值，禁用拷贝。

### 重入保护语义

重入保护用于抑制回调链形成环时的栈递归增长（例如 A → B → C → A，使同一回调在其执行期间被间接再次触发）。

当同一 `CallbackBlock` 处于执行状态时再次触发：

- 不会形成新的嵌套调用栈帧（不递归调用）；
- 仅保留一次“待执行请求”（保存一份参数快照；后续重入会覆盖旧的待执行参数）；
- 当前执行结束后在同一调用点以循环方式补跑（trampoline 扁平化），直到没有待执行请求为止，从而避免无限嵌套。

> 备注：为缓存待执行参数，内部对 `Args...` 以 `std::decay_t` 形式按值保存一份可复制的参数快照。

## Callback

```cpp
template <typename... Args>
class Callback;
```

对 `CallbackBlock` 的进一步封装，提供统一接口、类型擦除和创建工厂方法。

### 创建回调

```cpp
LibXR::Callback<Args...> cb = LibXR::Callback<Args...>::Create(fun, bound_arg);
```

- `fun`: 回调函数，格式为 `void(bool, BoundArgType, Args...)`，并且需要**可转换为函数指针**（例如普通函数、静态成员函数、无捕获 lambda 等）。
- `bound_arg`: 回调函数的第一个绑定参数

> 注意：当前 `Create` 的实现会 `new CallbackBlock<BoundArgType, Args...>`，因此**包含动态内存分配**；同时 `Callback` 本身不管理释放。

### 执行回调

```cpp
cb.Run(in_isr, arg1, arg2, ...);
```

可传递附加参数，`in_isr` 指示调用上下文；若回调为空，`Run` 为安全的空操作（no-op）。

### 其他接口与语义

- `Empty()`: 判断回调是否为空（内部 `cb_block_ == nullptr`）
- 支持默认构造、拷贝构造、移动构造与赋值
  - 拷贝为浅拷贝：多个 `Callback` 实例会共享同一回调块指针与调用入口。

## 使用示例

```cpp
void OnEvent(bool in_isr, int context, const char* msg) {
  printf("ISR=%d context=%d msg=%s\n", in_isr, context, msg);
}

auto cb = LibXR::Callback<const char*>::Create(OnEvent, 42);
cb.Run(false, "Hello");
```

输出：

```bash
ISR=0 context=42 msg=Hello
```

## 设计特点

- **重入保护**：回调重入时不递归，缓存一次待执行请求并在当前调用点补跑（trampoline 扁平化）
- **支持 ISR 上下文**：接口显式携带 `in_isr`，可在中断中安全调用
- **类型安全封装**：利用模板与类型推导实现参数绑定与调用
- **轻量可嵌入**：结构简单，适用于 IO、定时器、事件发布等模块的回调传递

---

该模块是 LibXR 异步机制与回调接口的基础组件，适用于 IO、定时器、事件发布等模块的回调传递。
