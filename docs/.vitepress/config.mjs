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
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Streaming', link: '/guide/streaming' },
            { text: 'Conversations', link: '/guide/conversations' },
          ],
        },
        {
          text: 'Advanced Features',
          collapsed: false,
          items: [
            { text: 'Multimodal', link: '/guide/multimodal' },
            { text: 'Tools', link: '/guide/tools' },
            { text: 'Reasoning Models', link: '/guide/reasoning' },
            { text: 'Embeddings', link: '/guide/embeddings' },
            { text: 'Usage Tracking', link: '/guide/usage-tracking' },
            { text: 'Custom Headers', link: '/guide/custom-headers' },
            { text: 'Express Integration', link: '/examples/express-integration' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          collapsed: false,
          items: [{ text: 'Overview', link: '/api/generated/README' }],
        },
        {
          text: 'Core Functions',
          collapsed: false,
          items: [
            { text: 'generate', link: '/api/generated/functions/generate' },
            { text: 'createProvider', link: '/api/generated/functions/createProvider' },
            {
              text: 'createEmbeddingsProvider',
              link: '/api/generated/functions/createEmbeddingsProvider',
            },
            { text: 'getAvailableProvider', link: '/api/generated/functions/getAvailableProvider' },
          ],
        },
        {
          text: 'Streaming Functions',
          collapsed: true,
          items: [
            { text: 'collectStream', link: '/api/generated/functions/collectStream' },
            { text: 'collectDeltas', link: '/api/generated/functions/collectDeltas' },
            { text: 'processStream', link: '/api/generated/functions/processStream' },
            { text: 'mapStream', link: '/api/generated/functions/mapStream' },
            { text: 'filterStream', link: '/api/generated/functions/filterStream' },
            { text: 'printStream', link: '/api/generated/functions/printStream' },
            { text: 'toReadableStream', link: '/api/generated/functions/toReadableStream' },
          ],
        },
        {
          text: 'Message Builders',
          collapsed: true,
          items: [
            { text: 'conversation', link: '/api/generated/functions/conversation' },
            { text: 'userText', link: '/api/generated/functions/userText' },
            { text: 'userImage', link: '/api/generated/functions/userImage' },
            { text: 'userMultipleImages', link: '/api/generated/functions/userMultipleImages' },
            { text: 'userContent', link: '/api/generated/functions/userContent' },
            { text: 'assistantText', link: '/api/generated/functions/assistantText' },
            {
              text: 'assistantWithToolCalls',
              link: '/api/generated/functions/assistantWithToolCalls',
            },
            { text: 'systemText', link: '/api/generated/functions/systemText' },
            { text: 'textContent', link: '/api/generated/functions/textContent' },
            { text: 'imageContent', link: '/api/generated/functions/imageContent' },
            { text: 'toolResult', link: '/api/generated/functions/toolResult' },
            { text: 'toolResultContent', link: '/api/generated/functions/toolResultContent' },
          ],
        },
        {
          text: 'Tools',
          collapsed: true,
          items: [
            { text: 'createTool', link: '/api/generated/functions/createTool' },
            { text: 'executeToolCall', link: '/api/generated/functions/executeToolCall' },
          ],
        },
        {
          text: 'Provider Functions',
          collapsed: true,
          items: [
            { text: 'createOpenAI', link: '/api/generated/functions/createOpenAI' },
            { text: 'createAnthropic', link: '/api/generated/functions/createAnthropic' },
            { text: 'createGoogle', link: '/api/generated/functions/createGoogle' },
            {
              text: 'createOpenAIEmbeddings',
              link: '/api/generated/functions/createOpenAIEmbeddings',
            },
            {
              text: 'createGoogleEmbeddings',
              link: '/api/generated/functions/createGoogleEmbeddings',
            },
            { text: 'openai', link: '/api/generated/functions/openai' },
            { text: 'anthropic', link: '/api/generated/functions/anthropic' },
            { text: 'google', link: '/api/generated/functions/google' },
            { text: 'openaiEmbeddings', link: '/api/generated/functions/openaiEmbeddings' },
            { text: 'googleEmbeddings', link: '/api/generated/functions/googleEmbeddings' },
          ],
        },
        {
          text: 'Core Interfaces',
          collapsed: true,
          items: [
            { text: 'Message', link: '/api/generated/interfaces/Message' },
            { text: 'StreamChunk', link: '/api/generated/interfaces/StreamChunk' },
            { text: 'StreamResult', link: '/api/generated/interfaces/StreamResult' },
            { text: 'Tool', link: '/api/generated/interfaces/Tool' },
            { text: 'ToolCall', link: '/api/generated/interfaces/ToolCall' },
          ],
        },
        {
          text: 'Content Interfaces',
          collapsed: true,
          items: [
            { text: 'TextContent', link: '/api/generated/interfaces/TextContent' },
            { text: 'ImageContent', link: '/api/generated/interfaces/ImageContent' },
            { text: 'ToolResultContent', link: '/api/generated/interfaces/ToolResultContent' },
          ],
        },
        {
          text: 'Provider Options',
          collapsed: true,
          items: [
            { text: 'GenerationOptions', link: '/api/generated/interfaces/GenerationOptions' },
            { text: 'ProviderOptions', link: '/api/generated/interfaces/ProviderOptions' },
            { text: 'OpenAIOptions', link: '/api/generated/interfaces/OpenAIOptions' },
            { text: 'AnthropicOptions', link: '/api/generated/interfaces/AnthropicOptions' },
            { text: 'GoogleOptions', link: '/api/generated/interfaces/GoogleOptions' },
            {
              text: 'OpenAIResponsesOptions',
              link: '/api/generated/interfaces/OpenAIResponsesOptions',
            },
          ],
        },
        {
          text: 'Embeddings',
          collapsed: true,
          items: [
            { text: 'EmbeddingProvider', link: '/api/generated/interfaces/EmbeddingProvider' },
            { text: 'EmbeddingOptions', link: '/api/generated/interfaces/EmbeddingOptions' },
            {
              text: 'EmbeddingProviderOptions',
              link: '/api/generated/interfaces/EmbeddingProviderOptions',
            },
            {
              text: 'OpenAIEmbeddingOptions',
              link: '/api/generated/interfaces/OpenAIEmbeddingOptions',
            },
            {
              text: 'GoogleEmbeddingOptions',
              link: '/api/generated/interfaces/GoogleEmbeddingOptions',
            },
            { text: 'EmbeddingResponse', link: '/api/generated/interfaces/EmbeddingResponse' },
            { text: 'EmbeddingResult', link: '/api/generated/interfaces/EmbeddingResult' },
            { text: 'EmbeddingUsage', link: '/api/generated/interfaces/EmbeddingUsage' },
          ],
        },
        {
          text: 'Utilities',
          collapsed: true,
          items: [
            {
              text: 'AvailableProviderResult',
              link: '/api/generated/interfaces/AvailableProviderResult',
            },
          ],
        },
        {
          text: 'Classes',
          collapsed: true,
          items: [
            { text: 'ConversationBuilder', link: '/api/generated/classes/ConversationBuilder' },
          ],
        },
        {
          text: 'Provider Types',
          collapsed: true,
          items: [
            {
              text: 'GenerationProviderType',
              link: '/api/generated/type-aliases/GenerationProviderType',
            },
            {
              text: 'EmbeddingProviderType',
              link: '/api/generated/type-aliases/EmbeddingProviderType',
            },
            {
              text: 'AnyGenerationProvider',
              link: '/api/generated/type-aliases/AnyGenerationProvider',
            },
            {
              text: 'AnyEmbeddingProvider',
              link: '/api/generated/type-aliases/AnyEmbeddingProvider',
            },
            { text: 'OpenAIProvider', link: '/api/generated/type-aliases/OpenAIProvider' },
            { text: 'AnthropicProvider', link: '/api/generated/type-aliases/AnthropicProvider' },
            { text: 'GoogleProvider', link: '/api/generated/type-aliases/GoogleProvider' },
            {
              text: 'OpenAIEmbeddingProvider',
              link: '/api/generated/type-aliases/OpenAIEmbeddingProvider',
            },
            {
              text: 'GoogleEmbeddingProvider',
              link: '/api/generated/type-aliases/GoogleEmbeddingProvider',
            },
            {
              text: 'OpenAIResponsesProvider',
              link: '/api/generated/type-aliases/OpenAIResponsesProvider',
            },
          ],
        },
        {
          text: 'Function Types',
          collapsed: true,
          items: [
            { text: 'GenerateFunction', link: '/api/generated/type-aliases/GenerateFunction' },
            {
              text: 'StreamingGenerateFunction',
              link: '/api/generated/type-aliases/StreamingGenerateFunction',
            },
            { text: 'EmbedFunction', link: '/api/generated/type-aliases/EmbedFunction' },
            { text: 'ProviderFactory', link: '/api/generated/type-aliases/ProviderFactory' },
            {
              text: 'EmbeddingProviderFactory',
              link: '/api/generated/type-aliases/EmbeddingProviderFactory',
            },
          ],
        },
        {
          text: 'Other Types',
          collapsed: true,
          items: [
            { text: 'Content', link: '/api/generated/type-aliases/Content' },
            { text: 'FinishReason', link: '/api/generated/type-aliases/FinishReason' },
            { text: 'ProviderConfig', link: '/api/generated/type-aliases/ProviderConfig' },
            { text: 'WithApiKey', link: '/api/generated/type-aliases/WithApiKey' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            {
              text: 'Express Integration',
              link: '/examples/express-integration',
            },
          ],
        },
      ],
      '/': [
        {
          text: 'Documentation',
          collapsed: false,
          items: [
            { text: 'Home', link: '/' },
            { text: 'FAQ', link: '/faq' },
          ],
        },
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Streaming', link: '/guide/streaming' },
            { text: 'Conversations', link: '/guide/conversations' },
          ],
        },
        {
          text: 'Advanced Features',
          collapsed: true,
          items: [
            { text: 'Multimodal', link: '/guide/multimodal' },
            { text: 'Tools', link: '/guide/tools' },
            { text: 'Reasoning Models', link: '/guide/reasoning' },
            { text: 'Embeddings', link: '/guide/embeddings' },
            { text: 'Usage Tracking', link: '/guide/usage-tracking' },
          ],
        },
        {
          text: 'Reference',
          collapsed: true,
          items: [
            { text: 'API Documentation', link: '/api/generated/README' },
            { text: 'Examples', link: '/examples/README' },
          ],
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
