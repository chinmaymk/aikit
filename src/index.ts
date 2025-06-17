// Export main types
export type * from './types';

// Export functional APIs (primary) - using factory wrappers for consistency
export {
  createOpenAI,
  createAnthropic,
  createGoogle,
  createOpenAIResponses,
  createOpenAIEmbeddings,
  createGoogleEmbeddings,
} from './factory';
export { openai } from './providers/openai_completions';
export { anthropic } from './providers/anthropic';
export { google } from './providers/google';
export { createProxyProvider, callProxyProvider } from './providers/proxy';
export { openaiResponses } from './providers/openai_responses';

// Export functional embedding APIs (primary)
export { openaiEmbeddings } from './providers/openai_embeddings';
export { googleEmbeddings } from './providers/google_embeddings';

// Export embedding factory functions
export { type EmbeddingProviderType } from './factory';

// Export factory functions (with functional APIs)
export { createProvider, createEmbeddingsProvider, type GenerationProviderType } from './factory';

// Export utility functions
export * from './utils';
export * from './message-helpers';
export * from './stream-utils';
export * from './conversation-builder';

// Export provider-specific utilities
export * from './providers/anthropic-transformers';
export * from './providers/anthropic-stream';
