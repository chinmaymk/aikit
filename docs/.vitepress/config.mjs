import { defineConfig } from 'vitepress';
import { getSidebar } from 'vitepress-plugin-auto-sidebar';

export default defineConfig({
  title: 'AIKit',
  description: 'Lightweight generation abstraction for OpenAI, Anthropic and Google Gemini',
  base: '/aikit/',
  head: [['link', { rel: 'icon', href: '/aikit/favicon.svg' }]],
  themeConfig: {
    logo: '/aikit-logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/generated/README' },
      { text: 'Examples', link: '/examples/README' },
      { text: 'FAQ', link: '/faq' },
    ],
    sidebar: {
      // Auto-generate Guide and API sidebars from folder structure
      ...getSidebar({
        contentRoot: '/',
        contentDirs: ['docs/guide', 'docs/api'],
        collapsible: true,
        collapsed: true,
      }),
      '/examples/': [
        {
          text: 'Examples',
          items: [{ text: 'Usage', link: '/examples/README' }],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/chinmaymk/aikit' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/aikit' },
    ],
    editLink: {
      pattern: 'https://github.com/chinmaymk/aikit/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025',
    },
  },
});
