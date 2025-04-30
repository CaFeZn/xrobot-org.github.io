import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={translate({ message: '首页', id: 'homepage.title' })}
      description={translate({ message: 'XRobot 项目的文档首页', id: 'homepage.description' })}
    >
      <main>
        <section className="hero hero--primary">
          <div className="container">
            <h1 className="hero__title">
              <Translate id="homepage.heroTitle">欢迎来到 XRobot</Translate>
            </h1>
            <p className="hero__subtitle">
              <Translate id="homepage.heroSubtitle">面向机器人开发者的文档和教程平台</Translate>
            </p>
            <div className="buttons">
              <Link
                className="button button--secondary button--lg"
                to="/intro">
                <Translate id="homepage.getStarted">开始阅读</Translate>
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h3>
                  <Translate id="homepage.feature1.title">模块化文档</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature1.content">通过模块化方式组织各类机器人项目内容，方便维护与查阅。</Translate>
                </p>
              </div>
              <div className="col col--4">
                <h3>
                  <Translate id="homepage.feature2.title">中英双语</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature2.content">支持中英双语切换，适配全球开发者。</Translate>
                </p>
              </div>
              <div className="col col--4">
                <h3>
                  <Translate id="homepage.feature3.title">开源协作</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature3.content">欢迎贡献者参与内容补充与修正，一起打造高质量资料库。</Translate>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
