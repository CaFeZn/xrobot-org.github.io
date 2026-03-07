---
id: env-setup-hpm
title: HPM 环境配置
sidebar_position: 6
---

# HPM 环境配置

本文目前只覆盖 HPM 开发环境的基础配置，不包含 LibXR 自动代码生成部分。

先楫官方的快速入门手册配置比较麻烦且并无新建工程的操作，因此本文以这篇文章为基础进行介绍
[[HPM杂谈]你想要了解的先楫hpm_sdk开发都在这里系列 (二)](https://www.hpmicro.com/service-support/technical-articles/212)

> 在阅读上述文章前，你需要先了解一点：当前仓库名为 `sdk_env`，其中已包含 `hpm_sdk`。另外，由于其中包含需要配置环境变量的内容，建议将其存放在固定且不易移动的位置。本文示例统一使用 `C:/HPM/sdk_env`。


根据网络状况选择 `gitee` 或 `github` 源进行克隆。

```sh
 # gitee
 git clone https://gitee.com/hpmicro/sdk_env.git C:/HPM/sdk_env
 # github
 git clone https://github.com/hpmicro/sdk_env.git C:/HPM/sdk_env
```

若终端可上网但 `git clone github` 失败，可先为命令行配置代理（示例端口 `7897`）：

```powershell
git config --global http.proxy  http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
```

此处以`hpm5301evklite`开发板为例，其余配置均保持默认

# 新建工程

自行创建一个`CMakeLists.txt`内容如下

```cmake
# Copyright (c) 2021 HPMicro
# SPDX-License-Identifier: BSD-3-Clause

cmake_minimum_required(VERSION 3.13)

find_package(hpm-sdk REQUIRED HINTS $ENV{HPM_SDK_BASE})

project(user_app)

sdk_app_inc(inc)
sdk_app_src(src/main.cpp)

```

加入`src/main.cpp`(为了方便融入LibXR，此处直接使用了main.cpp)，内容如下：
```cpp
#include <stdio.h>
#include "board.h"

int main(void)
{
    board_init();

    while(1) {
        ;
    }
    return 0;
}

```


>前提：已经设置好环境变量了。若使用 `sdk_env\hpm_sdk\env.cmd` 设置系统环境变量后又移动了 `sdk_env`，直接重新运行该脚本可能无法自动修复旧路径，需要手动到系统环境变量中改为最新路径。
>
> **强烈建议一次配置完毕之后不要移动路径，重新配置系统变量非常麻烦**

示例工程文件结构如下（已统一为 `build` 目录）
![alt text](/static/img/hpm_template_dir.png)

> linkers可忽略，在gui配置时可配置为本地ld文件，若不配置则使用默认ld文件，此处为了高级开发保留了该目录，这些文件可从`sdk_env\user_template\user_app`获取

然后运行`sdk_env\start_gui.exe`

按照下图配置（路径与输出目录已更新）
![alt text](/static/img/hpm_example_setup.png)

其中框出的区域是刚刚新建工程的路径。为了方便 VSCode 配置，我们将`生成文件夹`设置为`build`而非默认的长字符串，路径统一为 `C:/HPM/sdk_env`。

然后点击`本地化SDK`

## VSCode 环境配置

安装以下插件（或者直接创建`.vscode`文件夹，新建`extensions.json`，将下面内容粘贴，然后在扩展处安装工作区推荐插件）
```json
{
    "recommendations": [
        "llvm-vs-code-extensions.vscode-clangd",
        "ms-vscode.cmake-tools",
        "josetr.cmake-language-support-vscode",
        "hpmicro.hpm-pinmux-tool",
    ]
}
```

按下面步骤配置

![alt text](/static/img/hpm-setup-1.png)

找到 `sdk_env` 的路径（`C:/HPM/sdk_env`），然后选择文件夹

![alt text](/static/img/hpm-setup-2.png)

此时就可以找到`GCC 13.2.0 riscv32-unknown-elf`，选择后即可使用CMake插件进行管理

现在按`F7`即可完成编译

![alt text](/static/img/hpm-setup-3.png)

