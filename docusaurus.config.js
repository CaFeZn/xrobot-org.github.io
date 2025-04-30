module.exports = {
  title: 'XRobot Docs',
  tagline: 'Want to be the best embedded framework',
  url: 'https://xrobot-org.github.io',
  baseUrl: '/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  onDuplicateRoutes: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'xrobot-org',
  projectName: 'xrobot-org.github.io',

  i18n: {
    defaultLocale: 'zh',
    locales: ['en', 'zh'],
    localeConfigs: {
      en: { label: 'English' },
      zh: { label: '简体中文' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/xrobot-org/xrobot-org.github.io/edit/XRobot2.0/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'XRobot Docs',
      logo: {
        alt: 'XRobot Logo',
        src: 'img/XRobot.jpeg',
      },
      items: [
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/xrobot-org/xrobot-org.github.io',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '入门',
              to: '/',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: 'GitHub Org',
              href: 'https://github.com/xrobot-org',
            },
            {
              label: 'LibXR',
              href: 'https://github.com/Jiu-xiao/libxr',
            },
            {
              label: 'CodeGenerator',
              href: 'https://github.com/Jiu-xiao/LibXR_CppCodeGenerator',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} XRobot`,
    },

    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
      additionalLanguages: ['cmake', 'bash'],
    },
  },
};
