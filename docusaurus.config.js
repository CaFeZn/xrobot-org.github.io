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
    defaultLocale: 'en',
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
          routeBasePath: '/',
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
      copyright: `Copyright © ${new Date().getFullYear()} XRobot`,
    },
  },
};
