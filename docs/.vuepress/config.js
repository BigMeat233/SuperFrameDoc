const path = require('path');

module.exports = {
  dest: './dist',
  locales: {
    '/': {
      lang: 'zh-CN',
      title: 'Corejs Doc',
      description: 'Node-Corejs文档',
    },
  },
  head: [
    ['link', { rel: 'icon', href: '/images/logo.png' }],
  ],
  themeConfig: {
    logo: '/images/logo.png',
    smoothScroll: true,
    sidebarDepth: 2,
    nav: [
      { text: '首页', link: '/' },
      { text: '教程', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/guide/': [
        {
          title: '基础',
          collapsable: false,
          children: [
            '',
            'getting-started',
            'web-service',
            'request-handler',
            'log-collectting',
            'logger-introduce',
            'logger-group-introduce',
            'cluster-manager',
          ],
        }, {
          title: '进阶',
          collapsable: false,
          children: [
            'handler-manager',
            'dynamic-middleware',
            'static-resource',
            'logger-customizing',
            'logger-group-customizing'
          ],
        }
      ],
    },
  },
  markdown: { lineNumbers: true },
  configureWebpack: {
    resolve: {
      alias: {
        '@public': '/.vuepress/public'
      }
    }
  }
};