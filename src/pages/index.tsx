import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';
import axios from 'axios';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  const [commits, setCommits] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const repos = {
      XRobot: 'xrobot-org/XRobot',
      LibXR: 'Jiu-xiao/libxr',
      CodeGen: 'Jiu-xiao/LibXR_CppCodeGenerator',
    };

    const fetchCommits = async () => {
      const newCommits: { [key: string]: string } = {};
      await Promise.all(
        Object.entries(repos).map(async ([name, repo]) => {
          try {
            const res = await axios.get(
              `https://api.github.com/repos/${repo}/commits/master`
            );
            newCommits[name] = res.data.sha.substring(0, 7);
          } catch (err) {
            newCommits[name] = 'Error';
          }
        })
      );
      setCommits(newCommits);
    };

    fetchCommits();
  }, []);

  return (
    <Layout
      title={translate({ message: '首页', id: 'homepage.title' })}
      description={translate({
        message: 'XRobot 项目的文档首页',
        id: 'homepage.description',
      })}
    >
      <main>
        <section className="hero hero--primary">
          <div className="container">
            <h1 className="hero__title">
              <Translate id="homepage.heroTitle">欢迎来到 XRobot</Translate>
            </h1>
            <p className="hero__subtitle">
              <Translate id="homepage.heroSubtitle">
                面向机器人/嵌入式开发者的文档和教程平台
              </Translate>
            </p>
            <div className="buttons">
              <Link
                className="button button--secondary button--lg"
                to="/intro"
              >
                <Translate id="homepage.getStarted">开始阅读</Translate>
              </Link>
            </div>
          </div>
        </section>
        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature1.title">文档支持</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature1.content">
                    通过模块化方式组织各类项目内容，从环境配置、入门到进阶应用，方便维护与查阅。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature2.title">完整生态</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature2.content">
                    开发环境支持Windows/Linux，提供Docker镜像来支持项目的模块化设计与自动化工作流。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature3.title">功能强大</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature3.content">
                    从对各种外设和不同RTOS的兼容，到坐标系旋转和运动学解算等多种算法组件，XRobot就像开发过程中的瑞士军刀。
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature4.title">开源协作</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature4.content">
                    欢迎贡献者参与内容补充与修正，一起构建更好的XRobot。
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container margin-top--lg">
          <h2>
            <Translate id="homepage.versionTitle">仓库版本信息</Translate>
          </h2>
          <ul>
            <li>
              XRobot: <code>{commits.XRobot || 'Loading...'}</code>
            </li>
            <li>
              libxr: <code>{commits.LibXR || 'Loading...'}</code>
            </li>
            <li>
              LibXR_CppCodeGenerator: <code>{commits.CodeGen || 'Loading...'}</code>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}
