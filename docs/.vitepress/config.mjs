import { defineConfig } from 'vitepress';

// Common guide sections
const guideItems = [
  { text: 'Introduction', link: '/guide/getting-started' },
  { text: 'Streaming', link: '/guide/streaming' },
  { text: 'Conversations', link: '/guide/conversations' },
];

const advancedItems = [
  { text: 'Multimodal', link: '/guide/multimodal' },
  { text: 'Tools', link: '/guide/tools' },
  { text: 'Reasoning Models', link: '/guide/reasoning' },
  { text: 'Embeddings', link: '/guide/embeddings' },
  { text: 'Usage Tracking', link: '/guide/usage-tracking' },
  { text: 'Custom Headers', link: '/guide/custom-headers' },
  { text: 'Framework Integration', link: '/guide/framework-integration' },
];

// API section builders
const createAPISection = (text, items, collapsed = true) => ({
  text,
  collapsed,
  items,
});

const coreFunctions = [
  'generate',
  'createProvider',
  'createEmbeddingsProvider',
  'getAvailableProvider',
].map(name => ({
  text: name,
  link: `/api/generated/functions/${name}`,
}));

const streamingFunctions = [
  'collectStream',
  'collectDeltas',
  'processStream',
  'mapStream',
  'filterStream',
  'printStream',
  'toReadableStream',
].map(name => ({
  text: name,
  link: `/api/generated/functions/${name}`,
}));

const messageBuilders = [
  'conversation',
  'userText',
  'userImage',
  'userMultipleImages',
  'userContent',
  'assistantText',
  'assistantWithToolCalls',
  'systemText',
  'textContent',
  'imageContent',
  'toolResult',
  'toolResultContent',
].map(name => ({
  text: name,
  link: `/api/generated/functions/${name}`,
}));

const toolFunctions = ['createTool', 'executeToolCall'].map(name => ({
  text: name,
  link: `/api/generated/functions/${name}`,
}));

const providerFunctions = [
  'createOpenAI',
  'createAnthropic',
  'createGoogle',
  'createOpenAIEmbeddings',
  'createGoogleEmbeddings',
  'openai',
  'anthropic',
  'google',
  'openaiEmbeddings',
  'googleEmbeddings',
].map(name => ({
  text: name,
  link: `/api/generated/functions/${name}`,
}));

const coreInterfaces = ['Message', 'StreamChunk', 'StreamResult', 'Tool', 'ToolCall'].map(name => ({
  text: name,
  link: `/api/generated/interfaces/${name}`,
}));

const contentInterfaces = ['TextContent', 'ImageContent', 'ToolResultContent'].map(name => ({
  text: name,
  link: `/api/generated/interfaces/${name}`,
}));

const providerOptions = [
  'GenerationOptions',
  'ProviderOptions',
  'OpenAIOptions',
  'AnthropicOptions',
  'GoogleOptions',
  'OpenAIResponsesOptions',
].map(name => ({
  text: name,
  link: `/api/generated/interfaces/${name}`,
}));

const embeddingInterfaces = [
  'EmbeddingProvider',
  'EmbeddingOptions',
  'EmbeddingProviderOptions',
  'OpenAIEmbeddingOptions',
  'GoogleEmbeddingOptions',
  'EmbeddingResponse',
  'EmbeddingResult',
  'EmbeddingUsage',
].map(name => ({
  text: name,
  link: `/api/generated/interfaces/${name}`,
}));

const providerTypes = [
  'GenerationProviderType',
  'EmbeddingProviderType',
  'AnyGenerationProvider',
  'AnyEmbeddingProvider',
  'OpenAIProvider',
  'AnthropicProvider',
  'GoogleProvider',
  'OpenAIEmbeddingProvider',
  'GoogleEmbeddingProvider',
  'OpenAIResponsesProvider',
].map(name => ({
  text: name,
  link: `/api/generated/type-aliases/${name}`,
}));

const functionTypes = [
  'GenerateFunction',
  'StreamingGenerateFunction',
  'EmbedFunction',
  'ProviderFactory',
  'EmbeddingProviderFactory',
].map(name => ({
  text: name,
  link: `/api/generated/type-aliases/${name}`,
}));

const otherTypes = ['Content', 'FinishReason', 'ProviderConfig', 'WithApiKey'].map(name => ({
  text: name,
  link: `/api/generated/type-aliases/${name}`,
}));

// Main sidebar configuration
const guideSidebar = [
  {
    text: 'Getting Started',
    collapsed: false,
    items: guideItems,
  },
  {
    text: 'Advanced Features',
    collapsed: false,
    items: advancedItems,
  },
];

const apiSidebar = [
  createAPISection('API Reference', [{ text: 'Overview', link: '/api/generated/README' }], false),
  createAPISection('Core Functions', coreFunctions, false),
  createAPISection('Streaming Functions', streamingFunctions),
  createAPISection('Message Builders', messageBuilders),
  createAPISection('Tools', toolFunctions),
  createAPISection('Provider Functions', providerFunctions),
  createAPISection('Core Interfaces', coreInterfaces),
  createAPISection('Content Interfaces', contentInterfaces),
  createAPISection('Provider Options', providerOptions),
  createAPISection('Embeddings', embeddingInterfaces),
  createAPISection('Utilities', [
    { text: 'AvailableProviderResult', link: '/api/generated/interfaces/AvailableProviderResult' },
  ]),
  createAPISection('Classes', [
    { text: 'ConversationBuilder', link: '/api/generated/classes/ConversationBuilder' },
  ]),
  createAPISection('Provider Types', providerTypes),
  createAPISection('Function Types', functionTypes),
  createAPISection('Other Types', otherTypes),
];



const homeSidebar = [
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
    items: guideItems,
  },
  {
    text: 'Advanced Features',
    collapsed: true,
    items: advancedItems,
  },

  {
    text: 'Reference',
    collapsed: true,
    items: [{ text: 'API Documentation', link: '/api/generated/README' }],
  },
];

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
      { text: 'FAQ', link: '/faq' },
    ],
    sidebar: {
      '/guide/': guideSidebar,
      '/api/': apiSidebar,
      '/': homeSidebar,
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
