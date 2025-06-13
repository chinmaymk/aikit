import type {
  WithApiKey,
  OpenAIOptions,
  AnthropicOptions,
  GoogleOptions,
  OpenAIResponsesOptions,
  OpenAIEmbeddingOptions,
  GoogleEmbeddingOptions,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  OpenAIResponsesProvider,
  OpenAIEmbeddingProvider,
  GoogleEmbeddingProvider,
  AnyGenerationProvider,
  AnyEmbeddingProvider,
  GenerationProviderType,
  EmbeddingProviderType,
  AvailableProviderResult,
} from './types';

import { createOpenAI as createOpenAIProvider } from './providers/openai_completions';
import { createAnthropic as createAnthropicProvider } from './providers/anthropic';
import { createGoogle as createGoogleProvider } from './providers/google';
import { createOpenAIResponses as createOpenAIResponsesProvider } from './providers/openai_responses';
import { createOpenAIEmbeddings as createOpenAIEmbeddingsProvider } from './providers/openai_embeddings';
import { createGoogleEmbeddings as createGoogleEmbeddingsProvider } from './providers/google_embeddings';

// Re-export types for external use
export type { GenerationProviderType, EmbeddingProviderType };

// Provider factory mappings
const generationProviders = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  google: createGoogleProvider,
  openai_responses: createOpenAIResponsesProvider,
} as const;

const embeddingProviders = {
  openai_embeddings: createOpenAIEmbeddingsProvider,
  google_embeddings: createGoogleEmbeddingsProvider,
} as const;

// Environment variable mappings for provider discovery
const providerEnvKeys = [
  { keys: ['OPENAI_API_KEY'], type: 'openai' as const, name: 'OpenAI' },
  { keys: ['ANTHROPIC_API_KEY'], type: 'anthropic' as const, name: 'Anthropic' },
  { keys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], type: 'google' as const, name: 'Google' },
] as const;

/**
 * Creates an OpenAI provider using the Chat Completions API.
 *
 * @param options - Configuration options with required API key
 * @returns OpenAI streaming generation provider function
 *
 * @example
 * ```typescript
 * const openai = createOpenAI({
 *   apiKey: 'sk-...',
 *   model: 'gpt-4o',
 *   temperature: 0.7
 * });
 * ```
 */
export function createOpenAI(options: WithApiKey<OpenAIOptions>): OpenAIProvider {
  return createOpenAIProvider(options);
}

/**
 * Creates an Anthropic provider.
 *
 * @param options - Configuration options with required API key
 * @returns Anthropic streaming generation provider function
 *
 * @example
 * ```typescript
 * const anthropic = createAnthropic({
 *   apiKey: 'sk-ant-...',
 *   model: 'claude-3-5-sonnet-20241022',
 *   topK: 40
 * });
 * ```
 */
export function createAnthropic(options: WithApiKey<AnthropicOptions>): AnthropicProvider {
  return createAnthropicProvider(options);
}

/**
 * Creates a Google Gemini provider.
 *
 * @param options - Configuration options with required API key
 * @returns Google streaming generation provider function
 *
 * @example
 * ```typescript
 * const google = createGoogle({
 *   apiKey: 'AIza...',
 *   model: 'gemini-1.5-pro',
 *   topK: 20
 * });
 * ```
 */
export function createGoogle(options: WithApiKey<GoogleOptions>): GoogleProvider {
  return createGoogleProvider(options);
}

/**
 * Creates an OpenAI provider using the Responses API.
 *
 * @param options - Configuration options with required API key
 * @returns OpenAI Responses streaming generation provider function
 *
 * @example
 * ```typescript
 * const openaiResponses = createOpenAIResponses({
 *   apiKey: 'sk-...',
 *   model: 'gpt-4o',
 *   reasoning: { effort: 'high' }
 * });
 * ```
 */
export function createOpenAIResponses(
  options: WithApiKey<OpenAIResponsesOptions>
): OpenAIResponsesProvider {
  return createOpenAIResponsesProvider(options);
}

/**
 * Creates an OpenAI embedding provider.
 *
 * @param options - Configuration options with required API key
 * @returns OpenAI embedding provider function
 *
 * @example
 * ```typescript
 * const embeddings = createOpenAIEmbeddings({
 *   apiKey: 'sk-...',
 *   model: 'text-embedding-3-large',
 *   dimensions: 1024
 * });
 * ```
 */
export function createOpenAIEmbeddings(
  options: WithApiKey<OpenAIEmbeddingOptions>
): OpenAIEmbeddingProvider {
  return createOpenAIEmbeddingsProvider(options);
}

/**
 * Creates a Google embedding provider.
 *
 * @param options - Configuration options with required API key
 * @returns Google embedding provider function
 *
 * @example
 * ```typescript
 * const embeddings = createGoogleEmbeddings({
 *   apiKey: 'AIza...',
 *   model: 'text-embedding-004',
 *   taskType: 'SEMANTIC_SIMILARITY'
 * });
 * ```
 */
export function createGoogleEmbeddings(
  options: WithApiKey<GoogleEmbeddingOptions>
): GoogleEmbeddingProvider {
  return createGoogleEmbeddingsProvider(options);
}

/**
 * Generic embeddings provider factory function with strong typing.
 * Creates embedding providers with full type safety.
 * Returns a narrowed type based on the provider type.
 *
 * @example
 * ```typescript
 * // Strongly typed - options are specific to the provider type
 * const openaiEmbeddings = createEmbeddingsProvider('openai_embeddings', {
 *   apiKey: 'sk-...',
 *   model: 'text-embedding-3-large',
 *   dimensions: 1024  // OpenAI-specific option
 * });
 *
 * const googleEmbeddings = createEmbeddingsProvider('google_embeddings', {
 *   apiKey: 'AIza...',
 *   model: 'text-embedding-004'
 * });
 * ```
 */

// Function overloads for precise type narrowing
export function createEmbeddingsProvider(
  type: 'openai_embeddings',
  options: WithApiKey<OpenAIEmbeddingOptions>
): OpenAIEmbeddingProvider;
export function createEmbeddingsProvider(
  type: 'google_embeddings',
  options: WithApiKey<GoogleEmbeddingOptions>
): GoogleEmbeddingProvider;
export function createEmbeddingsProvider(
  type: EmbeddingProviderType,
  options: WithApiKey<OpenAIEmbeddingOptions | GoogleEmbeddingOptions>
): AnyEmbeddingProvider;

// Implementation
export function createEmbeddingsProvider(
  type: EmbeddingProviderType,
  options: WithApiKey<OpenAIEmbeddingOptions | GoogleEmbeddingOptions>
): AnyEmbeddingProvider {
  switch (type) {
    case 'openai_embeddings':
      return embeddingProviders[type](options as WithApiKey<OpenAIEmbeddingOptions>);
    case 'google_embeddings':
      return embeddingProviders[type](options as WithApiKey<GoogleEmbeddingOptions>);
    default:
      throw new Error(`Unknown embedding provider type: ${type}`);
  }
}

/**
 * Generic provider factory for generation providers with strong typing.
 * This is the default factory for text generation providers.
 * Returns a narrowed type based on the provider type.
 *
 * @example
 * ```typescript
 * // Strongly typed - options are specific to the provider type
 * const openai = createProvider('openai', {
 *   apiKey: 'sk-...',
 *   model: 'gpt-4o',
 *   temperature: 0.7
 * });
 *
 * const anthropic = createProvider('anthropic', {
 *   apiKey: 'sk-ant-...',
 *   model: 'claude-3-5-sonnet-20241022',
 *   topK: 40  // Anthropic-specific option
 * });
 * ```
 */

// Function overloads for precise type narrowing
export function createProvider(type: 'openai', options: WithApiKey<OpenAIOptions>): OpenAIProvider;
export function createProvider(
  type: 'anthropic',
  options: WithApiKey<AnthropicOptions>
): AnthropicProvider;
export function createProvider(type: 'google', options: WithApiKey<GoogleOptions>): GoogleProvider;
export function createProvider(
  type: 'openai_responses',
  options: WithApiKey<OpenAIResponsesOptions>
): OpenAIResponsesProvider;
export function createProvider(
  type: GenerationProviderType,
  options: WithApiKey<OpenAIOptions | AnthropicOptions | GoogleOptions | OpenAIResponsesOptions>
): AnyGenerationProvider;

// Implementation
export function createProvider(
  type: GenerationProviderType,
  options: WithApiKey<OpenAIOptions | AnthropicOptions | GoogleOptions | OpenAIResponsesOptions>
): AnyGenerationProvider {
  switch (type) {
    case 'openai':
      return generationProviders[type](options as WithApiKey<OpenAIOptions>);
    case 'anthropic':
      return generationProviders[type](options as WithApiKey<AnthropicOptions>);
    case 'google':
      return generationProviders[type](options as WithApiKey<GoogleOptions>);
    case 'openai_responses':
      return generationProviders[type](options as WithApiKey<OpenAIResponsesOptions>);
    default:
      throw new Error(`Unknown generation provider type: ${type}`);
  }
}

/**
 * Checks for available generation providers based on environment variables.
 * Returns the first available provider based on priority order.
 *
 * @example
 * ```typescript
 * const result = getAvailableProvider();
 * if (result.provider) {
 *   console.log(`Using ${result.name} provider`);
 *   const response = await result.provider(messages, { model: 'default' });
 * }
 * ```
 */
export function getAvailableProvider(): AvailableProviderResult {
  for (const { keys, type, name } of providerEnvKeys) {
    const availableKey = keys.find(key => process.env[key]);
    if (availableKey && process.env[availableKey]) {
      try {
        const provider = createProvider(type, { apiKey: process.env[availableKey]! });
        return { provider, type, name } as AvailableProviderResult;
      } catch {
        continue;
      }
    }
  }
  return {};
}
