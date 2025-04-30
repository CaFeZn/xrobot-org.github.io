import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';
import commitInfo from '../../../src/data/commitInfo.json';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={translate({ message: 'Home', id: 'homepage.title' })}
      description={translate({
        message: 'Documentation homepage for the XRobot project',
        id: 'homepage.description',
      })}
    >
      <main>
        <section className="hero hero--primary">
          <div className="container">
            <h1 className="hero__title">
              <Translate id="homepage.heroTitle">Welcome to XRobot</Translate>
            </h1>
            <p className="hero__subtitle">
              <Translate id="homepage.heroSubtitle">
                A documentation and tutorial platform for robotics and embedded developers
              </Translate>
            </p>
            <div className="buttons">
              <Link className="button button--secondary button--lg" to="/docs/intro">
                <Translate id="homepage.getStarted">Get Started</Translate>
              </Link>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--3">
                <h3><Translate id="homepage.feature1.title">Documentation Support</Translate></h3>
                <p><Translate id="homepage.feature1.content">
                  Content is organized in modular blocks, covering setup, tutorials, and advanced usage for easy reference and maintenance.
                </Translate></p>
              </div>
              <div className="col col--3">
                <h3><Translate id="homepage.feature2.title">Complete Ecosystem</Translate></h3>
                <p><Translate id="homepage.feature2.content">
                  Supports Windows/Linux, and provides Docker images for modular design and automation workflows.
                </Translate></p>
              </div>
              <div className="col col--3">
                <h3><Translate id="homepage.feature3.title">Powerful Features</Translate></h3>
                <p><Translate id="homepage.feature3.content">
                  From peripheral and RTOS support to coordinate transforms and kinematics algorithms, XRobot is your Swiss army knife for development.
                </Translate></p>
              </div>
              <div className="col col--3">
                <h3><Translate id="homepage.feature4.title">Open Collaboration</Translate></h3>
                <p><Translate id="homepage.feature4.content">
                  Contributions are welcome. Help improve the content and build a better XRobot together.
                </Translate></p>
              </div>
            </div>
          </div>
        </section>

        <section className="container margin-top--lg">
          <h2><Translate id="homepage.versionTitle">Repository Versions</Translate></h2>
          <ul>
            XRobot: <code>{commitInfo.XRobot || 'N/A'}</code>{' '}
            libxr: <code>{commitInfo.LibXR || 'N/A'}</code>{' '}
            LibXR_CppCodeGenerator: <code>{commitInfo.CodeGen || 'N/A'}</code>
          </ul>
        </section>

        <section className="container margin-top--lg">
          <ul>
            This documentation includes usage and coding tutorials only.  
            For API and CLI documentation, please refer to the Documents section in the footer.
          </ul>
        </section>
      </main>
    </Layout>
  );
}
