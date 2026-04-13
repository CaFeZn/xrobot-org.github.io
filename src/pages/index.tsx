import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, { translate } from '@docusaurus/Translate';
import commitInfo from '../data/commitInfo.json';
import './Home.css';

const agentQuickDeployFilename = 'xrobot-agent-quick-deploy.md';

const agentQuickDeployPrompt = ["# XRobot Agent 快速部署提示词","","你现在负责在当前工程里完成 XRobot 的快速部署，并把 workspace 初始化到可以继续开发的状态。","","## 任务目标","- 检查 Python、pipx / pip、xrobot 是否可用","- 如果 xrobot 未安装，优先使用 pipx 安装；不具备 pipx 时再退回 pip","- 在项目根目录运行 xrobot_setup","- 如果首次生成了 Modules/modules.yaml 或 Modules/sources.yaml，提示我补全配置后再继续第二次执行","- 成功后确认 Modules/ 和 User/ 下的关键生成结果","","## 推荐执行顺序","1. 检查环境：python --version / pipx --version / xrobot_setup --help","2. 安装 XRobot CLI（如缺失）","3. 在项目根目录执行 xrobot_setup","4. 汇总生成文件、拉取到的模块、以及下一步建议阅读入口","","## 重点检查项","- Modules/modules.yaml","- Modules/sources.yaml","- Modules/CMakeLists.txt","- User/xrobot.yaml","- User/xrobot_main.hpp","","## 约束","- 不要修改无关文件","- 优先使用官方命令，不要自创目录结构","- 所有失败都给出可以直接执行的下一步","- Windows 使用 PowerShell，Linux 使用 bash","","## 核心命令","    xrobot_setup"].join('\n');

type AgentPromptStatus = 'idle' | 'copied' | 'downloaded' | 'copy-failed';

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}


function VersionCard(): JSX.Element {
  return (
    <div className="homeVersionCard homeMetaCard">
      <div className="homePanelEyebrow">
        <Translate id="homepage.versionCard.eyebrow">Documentation Baseline</Translate>
      </div>
      <div className="homeVersionList">
        <div className="homeVersionItem">
          <span>XRobot</span>
          <code>{commitInfo.XRobot || 'N/A'}</code>
        </div>
        <div className="homeVersionItem">
          <span>LibXR</span>
          <code>{commitInfo.LibXR || 'N/A'}</code>
        </div>
        <div className="homeVersionItem">
          <span>CodeGen</span>
          <code>{commitInfo.CodeGen || 'N/A'}</code>
        </div>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const [isAgentPromptOpen, setIsAgentPromptOpen] = React.useState(false);
  const [agentPromptStatus, setAgentPromptStatus] = React.useState<AgentPromptStatus>('idle');

  React.useEffect(() => {
    if (!isAgentPromptOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAgentPromptOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isAgentPromptOpen]);

  const handleAgentPromptOpen = () => {
    setAgentPromptStatus('idle');
    setIsAgentPromptOpen(true);
  };

  const handleAgentPromptClose = () => {
    setIsAgentPromptOpen(false);
  };

  const handleAgentPromptDownload = () => {
    const blob = new Blob([agentQuickDeployPrompt], {type: 'text/markdown;charset=utf-8'});
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = agentQuickDeployFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setAgentPromptStatus('downloaded');
  };

  const handleAgentPromptCopy = async () => {
    try {
      await copyTextToClipboard(agentQuickDeployPrompt);
      setAgentPromptStatus('copied');
    } catch (error) {
      setAgentPromptStatus('copy-failed');
    }
  };

  return (
    <Layout
      title={translate({ message: '首页', id: 'homepage.title' })}
      description={translate({
        message: 'XRobot 与 LibXR 的开发文档。',
        id: 'homepage.description',
      })}
    >
      <main className="homePage">
        <div className="homeBackdrop" />

        <section className="homeHero">
          <div className="container homeHeroColumns">
            <div className="homeHeroColumn homeHeroColumnMain">
              <div className="homeHeroCopy">
                <div className="homeEyebrow">XRobot / LibXR / XRUSB</div>

                <h1 className="homeTitle">
                  <Translate id="homepage.hero.title">XRobot / LibXR</Translate>
                </h1>

                <p className="homeLead">
                  <Translate id="homepage.hero.lead">
                    面向机器人开发、设备接口与工程自动化的模块化框架。XRobot 负责包管理、项目组织和代码生成，LibXR 提供核心语义、驱动抽象与 XRUSB。
                  </Translate>
                </p>

                <div className="homeActionRow">
                  <Link className="button button--lg homeButton homeButtonPrimary" to="/docs/intro">
                    <Translate id="homepage.hero.cta.read">开始阅读</Translate>
                  </Link>
                  <Link className="button button--lg homeButton homeButtonSecondary" to="/docs/concept">
                    <Translate id="homepage.hero.cta.concept">理解设计思想</Translate>
                  </Link>
                  <Link className="button button--lg homeButton homeButtonGhost" to="/docs/proj_man">
                    <Translate id="homepage.hero.cta.xrobot">查看 XRobot</Translate>
                  </Link>
                </div>

                <div className="homeHeroFlowRail" aria-label="Abstract Module Workflow shortcuts">
                  <Link className="homeHeroFlowStep homeHeroFlowStepAbstract" to="/docs/basic_coding/driver">
                    <span className="homeHeroFlowStepKicker">Abstract</span>
                    <strong>平台抽象</strong>
                    <div className="homeHeroFlowMini homeHeroFlowMiniAbstract">
                      <div className="homeHeroFlowMiniRow homeHeroFlowMiniRowFour">
                        <span className="homeHeroFlowMiniChip">STM32</span>
                        <span className="homeHeroFlowMiniChip">ESP32</span>
                        <span className="homeHeroFlowMiniChip">Linux</span>
                        <span className="homeHeroFlowMiniChip">...</span>
                      </div>
                      <div className="homeHeroFlowMiniMerge" />
                      <span className="homeHeroFlowMiniCore">XR API</span>
                    </div>
                  </Link>

                  <Link className="homeHeroFlowStep homeHeroFlowStepModule" to="/docs/basic_coding/middleware">
                    <span className="homeHeroFlowStepKicker">Module</span>
                    <strong>模块编排</strong>
                    <div className="homeHeroFlowMini homeHeroFlowMiniModule">
                      <span className="homeHeroFlowMiniPill homeHeroFlowMiniPillTop">Feature</span>
                      <div className="homeHeroFlowMiniBridge" />
                      <div className="homeHeroFlowMiniRow homeHeroFlowMiniRowTwo">
                        <span className="homeHeroFlowMiniPill">Driver</span>
                        <span className="homeHeroFlowMiniPill">Middleware</span>
                      </div>
                    </div>
                  </Link>

                  <Link className="homeHeroFlowStep homeHeroFlowStepWorkflow" to="/docs/proj_man">
                    <span className="homeHeroFlowStepKicker">Workflow</span>
                    <strong>工程工作流</strong>
                    <div className="homeHeroFlowMini homeHeroFlowMiniWorkflow">
                      <div className="homeHeroWorkflowGrid">
                        <span className="homeHeroFlowMiniCmd">CodeGen</span>
                        <span className="homeHeroWorkflowArrowInline">→</span>
                        <span className="homeHeroFlowMiniCmd">Build</span>
                        <span className="homeHeroWorkflowDrop">↓</span>
                        <span className="homeHeroFlowMiniCmd">CI/CD</span>
                        <span className="homeHeroWorkflowArrowInline">→</span>
                        <span className="homeHeroFlowMiniDemo">Deploy</span>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="homeGuideGrid homeGuideGridInline">
                  <Link className="homeGuideCard" to="https://xrobot-org.github.io/XRobot-Onboarding/">
                    <span className="homeGuideTag">Guide</span>
                    <h3>
                      <Translate id="homepage.guide.onboarding.title">新手任务引导</Translate>
                    </h3>
                    <p>
                      <Translate id="homepage.guide.onboarding.desc">
                        按平台选择合适的起步路径，逐步了解 XR 的设计理念与基础写法。
                      </Translate>
                    </p>
                  </Link>

                  <button type="button" className="homeGuideCard homeGuideCardButton" onClick={handleAgentPromptOpen}>
                    <span className="homeGuideTag">Agent</span>
                    <h3>
                      <Translate id="homepage.guide.agent.title">Agent 快速部署</Translate>
                    </h3>
                    <p>
                      <Translate id="homepage.guide.agent.desc">
                        打开一份可直接交给 AI 助手的部署提示词，并支持下载成 Markdown 或一键复制。
                      </Translate>
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="homeHeroColumn homeHeroColumnSide">
              <div className="homeHeroPanel">
                <div className="homePanelSurface">
                  <div className="homePanelHeader">
                    <div className="homePanelTitleBlock">
                      <div className="homePanelEyebrow">
                        <Translate id="homepage.panel.eyebrow">Document Entry Map</Translate>
                      </div>
                      <h2>
                        <Translate id="homepage.panel.title">从当前任务直接进入文档</Translate>
                      </h2>
                    </div>
                    <div className="homePanelState">
                      <span className="homePanelDot" />
                      docs live
                    </div>
                  </div>

                  <div className="homeRouteGrid">
                    <Link className="homeRouteCard" to="/docs/proj_man">
                      <span className="homeRouteTag">XRobot</span>
                      <strong>
                        <Translate id="homepage.route.xrobot.title">工程与工作流</Translate>
                      </strong>
                      <p>
                        <Translate id="homepage.route.xrobot.desc">
                          包管理、项目管理、代码生成和日常开发流程。
                        </Translate>
                      </p>
                    </Link>

                    <Link className="homeRouteCard" to="/docs/basic_coding/core">
                      <span className="homeRouteTag">Core</span>
                      <strong>
                        <Translate id="homepage.route.core.title">核心语义</Translate>
                      </strong>
                      <p>
                        <Translate id="homepage.route.core.desc">
                          回调、事件、消息、时间、内存与基础抽象。
                        </Translate>
                      </p>
                    </Link>

                    <Link className="homeRouteCard" to="/docs/basic_coding/driver">
                      <span className="homeRouteTag">Drivers</span>
                      <strong>
                        <Translate id="homepage.route.driver.title">驱动与 XRUSB</Translate>
                      </strong>
                      <p>
                        <Translate id="homepage.route.driver.desc">
                          外设抽象、平台实现，以及属于驱动层的 XRUSB。
                        </Translate>
                      </p>
                    </Link>

                    <Link className="homeRouteCard" to="/docs/env_setup">
                      <span className="homeRouteTag">Start</span>
                      <strong>
                        <Translate id="homepage.route.start.title">环境与上手</Translate>
                      </strong>
                      <p>
                        <Translate id="homepage.route.start.desc">
                          平台选择、环境配置和第一个 Demo。
                        </Translate>
                      </p>
                    </Link>
                  </div>
                </div>
              </div>

              <VersionCard />
            </div>
          </div>
        </section>

        <section className="homeSection">
          <div className="container">
            <div className="homeSectionHead">
              <div className="homeSectionEyebrow">
                <Translate id="homepage.quick.eyebrow">Quick Paths</Translate>
              </div>
              <h2>
                <Translate id="homepage.quick.title">按常见场景进入</Translate>
              </h2>
              <p>
                <Translate id="homepage.quick.desc">
                  这里回答的不是“文档分几类”，而是“你现在手上要解决什么问题”。
                </Translate>
              </p>
            </div>

            <div className="homePathGrid">
              <Link className="homePathCard" to="/docs/intro">
                <span className="homePathIndex">01</span>
                <h3>
                  <Translate id="homepage.path.intro.title">我第一次接触 LibXR / XRobot</Translate>
                </h3>
                <p>
                  <Translate id="homepage.path.intro.desc">
                    先看整体概念、目录结构和最小使用路径，再决定往哪一层深入。
                  </Translate>
                </p>
              </Link>

              <Link className="homePathCard" to="/docs/basic_coding/driver">
                <span className="homePathIndex">02</span>
                <h3>
                  <Translate id="homepage.path.core.title">我要移植到新硬件平台</Translate>
                </h3>
                <p>
                  <Translate id="homepage.path.core.desc">
                    从驱动抽象、平台实现和基础外设能力开始，先把板级承载层看清楚。
                  </Translate>
                </p>
              </Link>

              <Link className="homePathCard" to="/docs/xrusb">
                <span className="homePathIndex">03</span>
                <h3>
                  <Translate id="homepage.path.driver.title">我要处理设备侧接口与链路</Translate>
                </h3>
                <p>
                  <Translate id="homepage.path.driver.desc">
                    从设备接口、协议栈和链路实现开始，查看设备通信、识别与更新相关内容。
                  </Translate>
                </p>
              </Link>

              <Link className="homePathCard" to="/docs/proj_man/proj-man-setup">
                <span className="homePathIndex">04</span>
                <h3>
                  <Translate id="homepage.path.usb.title">我要把工程快速跑起来</Translate>
                </h3>
                <p>
                  <Translate id="homepage.path.usb.desc">
                    从 xrobot_setup、模块拉取和主函数生成开始，先把工程入口搭起来。
                  </Translate>
                </p>
              </Link>
            </div>

          </div>
        </section>

        <section className="homeSection homeSectionContrast">
          <div className="container homeRecentGrid">
            <div className="homeSectionHead homeSectionHeadCompact">
              <div className="homeSectionEyebrow">
                <Translate id="homepage.recent.eyebrow">Recent Direction</Translate>
              </div>
              <h2>
                <Translate id="homepage.recent.title">近期开发动态</Translate>
              </h2>
              <p>
                <Translate id="homepage.recent.desc">
                  这里展示最近已经启动或正在推进的方向，方便你判断哪些能力正在扩展中。
                </Translate>
              </p>
            </div>

            <div className="homeRecentList">
              <div className="homeRecentItem">
                <span className="homeRecentTag">Platform</span>
                <h3>
                  <Translate id="homepage.recent.core.title">MSPM0 / HPM5301 支持正在推进</Translate>
                </h3>
                <p>
                  <Translate id="homepage.recent.core.desc">
                    新平台适配已经启动，后续会逐步补齐 GPIO、UART、PWM 等基础驱动能力。
                  </Translate>
                </p>
              </div>

              <div className="homeRecentItem">
                <span className="homeRecentTag">XRUSB</span>
                <h3>
                  <Translate id="homepage.recent.linux.title">XRUSB 设备协议栈继续扩展</Translate>
                </h3>
                <p>
                  <Translate id="homepage.recent.linux.desc">
                    现有设备侧协议栈能力继续完善，更多设备通信与链路支持正在补齐。
                  </Translate>
                </p>
              </div>

              <div className="homeRecentItem">
                <span className="homeRecentTag">Debug</span>
                <h3>
                  <Translate id="homepage.recent.usb.title">SWD 适配扩展，DapLink 正在推进 JTAG</Translate>
                </h3>
                <p>
                  <Translate id="homepage.recent.usb.desc">
                    推挽 / 开漏两套 SWD 实现正在适配更多硬件，同时 DapLink 侧也在继续推进 JTAG 支持。
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="homeSection">
          <div className="container">
            <div className="homeSectionHead">
              <div className="homeSectionEyebrow">
                <Translate id="homepage.focus.eyebrow">Focus Areas</Translate>
              </div>
              <h2>
                <Translate id="homepage.focus.title">先判断你现在在解决哪一类问题</Translate>
              </h2>
              <p>
                <Translate id="homepage.focus.desc">
                  大多数问题都落在这三类：理解机制、接硬件、跑工程。
                </Translate>
              </p>
            </div>

            <div className="homeFocusGrid">
              <div className="homeFocusCard">
                <span className="homeFocusTag">Semantics</span>
                <h3>
                  <Translate id="homepage.focus.core.title">当你在搞清系统怎么工作</Translate>
                </h3>
                <p>
                  <Translate id="homepage.focus.core.desc">
                    先看 callback、event、message 和中间件关系，把系统内部怎么运转先看明白。
                  </Translate>
                </p>
                <div className="homeMiniLinks">
                  <Link to="/docs/basic_coding/core">Core</Link>
                  <Link to="/docs/basic_coding/middleware">Middleware</Link>
                  <Link to="/docs/basic_coding/system">System</Link>
                </div>
              </div>

              <div className="homeFocusCard">
                <span className="homeFocusTag">Platform</span>
                <h3>
                  <Translate id="homepage.focus.driver.title">当你在接硬件和做移植</Translate>
                </h3>
                <p>
                  <Translate id="homepage.focus.driver.desc">
                    先看驱动、平台实现、XRUSB 和调试链路，搞清板子、外设和接口怎么接进来。
                  </Translate>
                </p>
                <div className="homeMiniLinks">
                  <Link to="/docs/basic_coding/driver">Driver</Link>
                  <Link to="/docs/xrusb">XRUSB</Link>
                  <Link to="/docs/debug">Debug</Link>
                </div>
              </div>

              <div className="homeFocusCard">
                <span className="homeFocusTag">Workflow</span>
                <h3>
                  <Translate id="homepage.focus.project.title">当你在把工程跑起来</Translate>
                </h3>
                <p>
                  <Translate id="homepage.focus.project.desc">
                    先看 xrobot_setup、模块管理和代码生成，把工程入口、依赖和生成链路先搭起来。
                  </Translate>
                </p>
                <div className="homeMiniLinks">
                  <Link to="/docs/proj_man/proj-man-setup">Setup</Link>
                  <Link to="/docs/proj_man">Project</Link>
                  <Link to="/docs/code_gen">Code Gen</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isAgentPromptOpen ? (
          <div className="homeAgentModalBackdrop" role="presentation" onClick={handleAgentPromptClose}>
            <div
              className="homeAgentModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-agent-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="homeAgentModalHeader">
                <div>
                  <div className="homePanelEyebrow">Agent Prompt</div>
                  <h2 id="home-agent-modal-title">Agent 快速部署</h2>
                </div>
                <button
                  type="button"
                  className="homeAgentModalClose"
                  onClick={handleAgentPromptClose}
                  aria-label="关闭 Agent 提示词弹框"
                >
                  ×
                </button>
              </div>
              <p className="homeAgentModalLead">
                这里提供一份可直接交给 AI 助手的快速部署提示词。你可以把它下载成 Markdown，或者直接复制后贴进对话。
              </p>
              <div className="homeAgentModalMeta">
                <span>文件名</span>
                <code>{agentQuickDeployFilename}</code>
              </div>
              <pre className="homeAgentModalPreview">{agentQuickDeployPrompt}</pre>
              <div className="homeAgentModalActions">
                <button type="button" className="homeAgentModalAction is-primary" onClick={handleAgentPromptDownload}>
                  下载提示词 .md
                </button>
                <button type="button" className="homeAgentModalAction" onClick={() => void handleAgentPromptCopy()}>
                  直接复制
                </button>
              </div>
              <p className="homeAgentModalStatus" aria-live="polite">
                {agentPromptStatus === 'copied'
                  ? '已复制到剪贴板。'
                  : agentPromptStatus === 'downloaded'
                    ? 'Markdown 文件已开始下载。'
                    : agentPromptStatus === 'copy-failed'
                      ? '复制失败，请改用下载。'
                      : '提示词用于初始化 XRobot workspace 和主函数生成链路。'}
              </p>
            </div>
          </div>
        ) : null}

        <section className="homeSection homeSectionFoot">
          <div className="container homeFootGrid">
            <div className="homeFootCopy">
              <div className="homeSectionEyebrow">
                <Translate id="homepage.foot.eyebrow">Project</Translate>
              </div>
              <h2>
                <Translate id="homepage.foot.title">项目背景与社区入口</Translate>
              </h2>
              <p>
                <Translate id="homepage.foot.desc">
                  这里放项目起源、参与方式和开发者社区入口，适合在深入技术内容前先了解项目本身。
                </Translate>
              </p>
            </div>

            <div className="homeFootPanel">
              <Link className="homeFootStat" to="/docs/about">
                <span>About</span>
                <strong>项目起源</strong>
              </Link>
              <Link className="homeFootStat" to="/docs/con_guide">
                <span>Contribute</span>
                <strong>贡献指南</strong>
              </Link>
              <Link className="homeFootStat" to="https://github.com/xrobot-org">
                <span>Community</span>
                <strong>开发者与仓库</strong>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
