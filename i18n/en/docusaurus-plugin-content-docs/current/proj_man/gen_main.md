
---

id: proj-man-gen-main
title: Generate Main Function
sidebar_position: 2
---

XRobot provides an automatic main function generator `gen_xrobot_main.py`. It extracts constructor arguments from the `MANIFEST` block in each module header file and generates a unified `XRobotMain` entry point, helping you quickly build a complete embedded application framework.

## Basic Usage

### Without Configuration File

It will create a template YAML file and generate the main entry file in the current directory. The template includes one instance for each module with default arguments.

```bash
$ xrobot_gen_main
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```

The generated `User/xrobot.yaml` looks like this and can be modified directly to regenerate code:

```yaml
global_settings:
  monitor_sleep_ms: 1000
modules:
- name: BlinkLED
  constructor_args:
    blink_cycle: 250
```

The generated `xrobot_main.hpp` looks like:

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

### With Configuration File

It will directly read the specified configuration file and generate the main entry function.

```bash
$ xrobot_gen_main --config User/xrobot.yaml
[INFO] Using existing configuration file: User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp
```
