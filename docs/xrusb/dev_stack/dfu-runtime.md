---
id: xrusb-dev-stack-dfu-runtime
title: DFU Runtime
sidebar_position: 6
---

# DFU Runtime 设备协议栈

`LibXR::USB::DfuRuntimeClass` 用于应用固件运行阶段的 Runtime DFU 接口。

它只处理运行态 `DETACH` 请求，本身不负责 `DNLOAD / UPLOAD`。主机请求升级后，设备在设定超时到期时跳转到板级 bootloader。

---

## 1. 类与构造方式

### 1.1 `LibXR::USB::DfuRuntimeClass`

构造函数：

```cpp
using JumpCallback = void (*)(void*);

LibXR::USB::DfuRuntimeClass dfu_rt(
    jump_to_bootloader,
    jump_ctx,
    50,
    "XRUSB DFU RT");
```

参数说明：

- `jump_to_bootloader`：超时后执行的板级跳转回调
- `jump_ctx`：回调上下文
- `detach_timeout_ms`：默认 `DETACH` 超时
- `interface_string`：接口字符串，默认是 `"XRUSB DFU RT"`

如果传入了 `webusb_landing_page_url` 和 `webusb_vendor_code`，还会额外发布 WebUSB BOS capability。

---

## 2. 接口与描述符

`DfuRuntimeClass` 只贡献 **1 个接口**，不使用 IAD，也不申请额外数据端点。

- `GetInterfaceCount() = 1`
- `HasIAD() = false`
- `bInterfaceClass = 0xFE`
- `bInterfaceSubClass = 0x01`
- `bInterfaceProtocol = 0x01`

Runtime DFU Functional Descriptor 的关键字段：

- `bmAttributes`
  - 有 `jump_to_bootloader` 回调时带 `WillDetach`
  - 没有回调时为 `0`
- `wDetachTimeOut`
  - 来自构造参数，或后续 `DETACH` 请求中的 `wValue`
- `wTransferSize = 0`
- `bcdDFUVersion = 0x0110`

---

## 3. 请求处理

Runtime DFU 主要处理以下类请求：

| 请求 | 行为 |
| ---- | ---- |
| `DETACH` | 仅在 `APP_IDLE` 状态下接受，记录超时并进入 `APP_DETACH` |
| `GETSTATUS` | 返回当前状态与剩余超时时间 |
| `GETSTATE` | 返回当前 DFU 状态 |

说明：

- `DETACH` 不会立即跳转
- `DETACH` 的真正动作是“记下 deadline，等待外部调用 `Process()`”
- 没有 `jump_to_bootloader` 回调时，`DETACH` 会返回不支持

---

## 4. 运行方式

Runtime DFU 需要外部周期调用 `Process()`：

```cpp
dfu_rt.Process();
```

`Process()` 只做一件事：

- 当 `detach_pending_` 置位且超时到期时，调用 `jump_to_bootloader(jump_ctx)`

因此这条路径可以放在：

- 主循环
- 周期任务
- 定时调度入口

不要求专门后台线程，但**必须有人周期调用 `Process()`**。否则主机即使发出了 `DETACH`，设备也不会真正跳到 bootloader。

---

## 5. 使用示例

```cpp
#include "dfu/dfu_runtime.hpp"

static void JumpToBootloader(void*)
{
  BoardJumpToBootloader();
}

LibXR::USB::DfuRuntimeClass dfu_rt(JumpToBootloader, nullptr, 50);

// USB class list: {{&dfu_rt}}
// usb_dev.Init();
// usb_dev.Start();

for (;;)
{
  dfu_rt.Process();
}
```

---

## 6. 与 DFU Bootloader 的关系

- Runtime DFU：应用态暴露 `DETACH` 接口，并在超时后跳转
- DFU Bootloader：bootloader 态处理 `DNLOAD / UPLOAD / manifest`

如果工程没有独立 bootloader，这一类通常不需要单独使用。
