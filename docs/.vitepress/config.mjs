import { defineConfig } from 'vitepress';

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
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Streaming', link: '/guide/streaming' },
            { text: 'Multimodal', link: '/guide/multimodal' },
            { text: 'Function Calling', link: '/guide/tools' },
            { text: 'Conversations', link: '/guide/conversations' },
            { text: 'Embeddings', link: '/guide/embeddings' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/generated/README' },
            {
              text: 'Classes',
              collapsed: false,
              items: [
                { text: 'AnthropicProvider', link: '/api/generated/classes/AnthropicProvider' },
                {
                  text: 'GoogleGeminiProvider',
                  link: '/api/generated/classes/GoogleGeminiProvider',
                },
                { text: 'OpenAIProvider', link: '/api/generated/classes/OpenAIProvider' },
              ],
            },
            {
              text: 'Functions',
              collapsed: false,
              items: [
                { text: 'createAnthropic', link: '/api/generated/functions/createAnthropic' },
                { text: 'createGoogle', link: '/api/generated/functions/createGoogle' },
                { text: 'createOpenAI', link: '/api/generated/functions/createOpenAI' },
                { text: 'createProvider', link: '/api/generated/functions/createProvider' },
              ],
            },
            {
              text: 'Interfaces',
              collapsed: false,
              items: [
                { text: 'AIProvider', link: '/api/generated/interfaces/AIProvider' },
                { text: 'AnthropicConfig', link: '/api/generated/interfaces/AnthropicConfig' },
                { text: 'GenerationOptions', link: '/api/generated/interfaces/GenerationOptions' },
                { text: 'GoogleConfig', link: '/api/generated/interfaces/GoogleConfig' },
                { text: 'ImageContent', link: '/api/generated/interfaces/ImageContent' },
                { text: 'Message', link: '/api/generated/interfaces/Message' },
                { text: 'OpenAIConfig', link: '/api/generated/interfaces/OpenAIConfig' },
                { text: 'StreamChunk', link: '/api/generated/interfaces/StreamChunk' },
                { text: 'TextContent', link: '/api/generated/interfaces/TextContent' },
                { text: 'Tool', link: '/api/generated/interfaces/Tool' },
                { text: 'ToolCall', link: '/api/generated/interfaces/ToolCall' },
                { text: 'ToolResultContent', link: '/api/generated/interfaces/ToolResultContent' },
              ],
            },
            {
              text: 'Type Aliases',
              collapsed: false,
              items: [{ text: 'Content', link: '/api/generated/type-aliases/Content' }],
            },
          ],
        },
      ],
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
