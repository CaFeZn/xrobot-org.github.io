---
id: proj-man-gen-main
title: 生成主函数
sidebar_position: 2
---

XRobot 提供了自动主函数生成工具 `gen_xrobot_main.py`，可根据每个模块头文件中的 MANIFEST 信息，自动提取构造参数并生成统一入口函数 `XRobotMain`，用于快速搭建完整的嵌入式应用框架。

## 基本用法

### 无配置文件

会创建一个模板yaml文件，并在当前目录下生成函数入口文件。模板文件会为当前所有模块创建一个实例，并填入默认参数。

```bash
$ xrobot_gen_main
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```

User/xrobot.yaml如下所示，可以直接修改此文件并重新生成代码：

```yaml
global_settings:
  monitor_sleep_ms: 1000
modules:
- name: BlinkLED
  constructor_args:
    blink_cycle: 250
```

生成的xrobot_main.hpp如下所示:

```cpp
#include "app_framework.hpp"
#include "libxr.hpp"

// Module headers
#include "BlinkLED.hpp"

template <typename HardwareContainer>
static void XRobotMain(HardwareContainer &hw) {
  using namespace LibXR;
  ApplicationManager appmgr;

  // Auto-generated module instantiations
  static BlinkLED<HardwareContainer> blinkled(hw, appmgr, 250);

  while (true) {
    appmgr.MonitorAll();
    Thread::Sleep(1000);
  }
}
```

### 存在配置文件

会直接读取配置文件，并生成函数入口文件。

```bash
$ xrobot_gen_main --config User/xrobot.yaml
[INFO] Using existing configuration file: User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```
