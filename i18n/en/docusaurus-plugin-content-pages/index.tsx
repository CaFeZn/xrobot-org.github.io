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
      title={translate({ message: 'Home', id: 'homepage.title' })}
      description={translate({
        message: 'The documentation homepage for the XRobot project',
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
              <Link
                className="button button--secondary button--lg"
                to="/docs/intro"
              >
                <Translate id="homepage.getStarted">Get Started</Translate>
              </Link>
            </div>
          </div>
        </section>
        <section className="features">
          <div className="container">
            <div className="row">
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature1.title">Documentation Support</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature1.content">
                    Project content is organized modularly—from environment setup to advanced usage—for easy maintenance and reference.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature2.title">Complete Ecosystem</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature2.content">
                    Development environments support Windows/Linux, and Docker images are provided to support modular design and automation.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature3.title">Powerful Features</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature3.content">
                    From supporting various peripherals and RTOSs to coordinate transforms and kinematics, XRobot is like a Swiss army knife for development.
                  </Translate>
                </p>
              </div>
              <div className="col col--3">
                <h3>
                  <Translate id="homepage.feature4.title">Open Collaboration</Translate>
                </h3>
                <p>
                  <Translate id="homepage.feature4.content">
                    Contributors are welcome to help improve and expand the content—let’s build a better XRobot together.
                  </Translate>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container margin-top--lg">
          <h2>
            <Translate id="homepage.versionTitle">Repository Versions</Translate>
          </h2>
          <ul>
            XRobot: <code>{commits.XRobot || 'Loading...'}</code> libxr: <code>{commits.LibXR || 'Loading...'}</code> LibXR_CppCodeGenerator: <code>{commits.CodeGen || 'Loading...'}</code>
          </ul>
        </section>

        <section className="container margin-top--lg">
          <ul>
            This documentation includes usage and coding tutorials only.  
            For API and CLI references, see the Documents section in the footer.
          </ul>
        </section>
      </main>
    </Layout>
  );
}
