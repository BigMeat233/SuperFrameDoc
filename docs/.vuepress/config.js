const path = require('path');

module.exports = {
  dest: './dist',
  title: 'Corejs Doc',
  description: 'Node-Corejs文档',
  head: [
    ['link', { rel: 'icon', href: '/images/logo.png' }],
  ],
  themeConfig: {
    logo: '/images/logo.png',
    smoothScroll: true,
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
            'default-value',
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
  configureWebpack: {
    resolve: {
      alias: {
        '@public': '/.vuepress/public'
      }
    }
  }
};