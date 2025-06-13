// Export main types
export type * from './types';

// Export functional APIs (primary)
export { createOpenAI, openai } from './providers/openai_completions';
export { createAnthropic, anthropic } from './providers/anthropic';
export { createGoogle, google } from './providers/google';
export { createOpenAIResponses, openaiResponses } from './providers/openai_responses';

// Export functional embedding APIs (primary)
export { createOpenAIEmbeddings, openaiEmbeddings } from './providers/openai_embeddings';
export { createGoogleEmbeddings, googleEmbeddings } from './providers/google_embeddings';

// Export embedding factory functions
export {
  createOpenAIEmbeddings as createOpenAIEmbeddingsClass,
  createGoogleEmbeddings as createGoogleEmbeddingsClass,
  type EmbeddingProviderType,
} from './factory';

// Export factory functions (with functional APIs)
export {
  createOpenAI as createOpenAIClass,
  createAnthropic as createAnthropicClass,
  createGoogle as createGoogleClass,
  createProvider,
  createEmbeddingsProvider,
  getAvailableProvider,
  type GenerationProviderType,
} from './factory';

// Export utility functions
export * from './utils';
