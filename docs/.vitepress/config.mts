import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SillySpec',
  description: '规范驱动开发工具包',
  lang: 'zh-CN',
  head: [['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }], ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }], ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', rel: 'stylesheet' }]],
  themeConfig: {
    logo: '/logo.jpg',
    nav: [
      { text: '首页', link: '/' },
      { text: '快速上手', link: '/sillyspec/getting-started' },
      { text: '安装', link: '/sillyspec/install' },
      { text: '命令', link: '/sillyspec/commands' },
      { text: '生命周期', link: '/sillyspec/lifecycle' },
      { text: 'Dashboard', link: '/sillyspec/dashboard' },
      { text: '目录结构', link: '/sillyspec/structure' },
    ],
    sidebar: [
      {
        text: '入门',
        items: [
          { text: '快速上手', link: '/sillyspec/getting-started' },
          { text: '安装指南', link: '/sillyspec/install' },
        ],
      },
      {
        text: '核心',
        items: [
          { text: '命令参考', link: '/sillyspec/commands' },
          { text: '生命周期', link: '/sillyspec/lifecycle' },
          { text: '目录结构', link: '/sillyspec/structure' },
          { text: '文件读写一览', link: '/sillyspec/file-io' },
        ],
      },
      {
        text: '工具',
        items: [
          { text: 'Dashboard', link: '/sillyspec/dashboard' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/q512426816/sillyspec' }],
  },
})
