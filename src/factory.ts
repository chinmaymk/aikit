import type {
  AIProvider,
  OpenAIOptions,
  OpenAIResponsesOptions,
  AnthropicOptions,
  GoogleOptions,
  OpenAIEmbeddingOptions,
  GoogleEmbeddingOptions,
} from './types';

import { OpenAIProvider } from './providers/openai_completions';
import { OpenAIProvider as OpenAIResponsesProvider } from './providers/openai_responses';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleGeminiProvider } from './providers/google';
import { OpenAIEmbeddingProvider } from './providers/openai_embeddings';
import { GoogleEmbeddingProvider } from './providers/google_embeddings';

/**
 * Maps provider type strings to their corresponding provider classes
 */
type ProviderMap = {
  openai: OpenAIProvider;
  openai_responses: OpenAIResponsesProvider;
  anthropic: AnthropicProvider;
  google: GoogleGeminiProvider;
  openai_embeddings: OpenAIEmbeddingProvider;
  google_embeddings: GoogleEmbeddingProvider;
};

/**
 * Maps provider type strings to their corresponding option types
 */
type OptionsMap = {
  openai: OpenAIOptions;
  openai_responses: OpenAIResponsesOptions;
  anthropic: AnthropicOptions;
  google: GoogleOptions;
  openai_embeddings: OpenAIEmbeddingOptions;
  google_embeddings: GoogleEmbeddingOptions;
};

/**
 * Union type of all available provider types.
 * Use this for type-safe provider selection.
 */
export type ProviderType = keyof ProviderMap;

/**
 * Union type of AI generation provider types only (excludes embedding providers).
 * Use this when you need providers that support the generate() method.
 */
export type GenerationProviderType = 'openai' | 'openai_responses' | 'anthropic' | 'google';

/**
 * Union type of embedding provider types only.
 * Use this when you need providers that support the embed() method.
 */
export type EmbeddingProviderType = 'openai_embeddings' | 'google_embeddings';

/**
 * Summons an AIProvider that speaks fluent OpenAI using the Chat Completions API (default).
 * Just give it your credentials and it'll be ready to chat.
 *
 * @param options - The configuration and default generation options for the OpenAI Chat Completions API.
 * @returns An AIProvider, ready to do your bidding with OpenAI's models.
 *
 * @example
 * ```typescript
 * const openai = createOpenAI({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o', // Default model
 *   temperature: 0.7, // Default temperature
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createOpenAI(options: OpenAIOptions): AIProvider {
  return new OpenAIProvider(options);
}

/**
 * Creates an OpenAI provider using the Responses API.
 * This is an alternative to the default Chat Completions API.
 *
 * @param options - The configuration and default generation options for the OpenAI Responses API.
 * @returns An AIProvider using OpenAI's Responses API.
 *
 * @example
 * ```typescript
 * const openaiResponses = createOpenAIResponses({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o',
 *   reasoning: { effort: 'high' },
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createOpenAIResponses(options: OpenAIResponsesOptions): AIProvider {
  return new OpenAIResponsesProvider(options);
}

/**
 * Whips up an AIProvider that communicates with Anthropic's Claude.
 * It's thoughtful, helpful, and probably won't start a robot uprising.
 *
 * @param options - The configuration and default generation options for Anthropic's API.
 * @returns An AIProvider, configured to work with Anthropic's models.
 *
 * @example
 * ```typescript
 * const anthropic = createAnthropic({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-3-5-sonnet-20240620', // Default model
 *   maxTokens: 1000, // Default max tokens
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createAnthropic(options: AnthropicOptions): AIProvider {
  return new AnthropicProvider(options);
}

/**
 * Assembles an AIProvider for Google's Gemini.
 * Get ready for some of that Google magic.
 *
 * @param options - The configuration and default generation options for Google's API.
 * @returns An AIProvider, geared up for Gemini.
 *
 * @example
 * ```typescript
 * const google = createGoogle({
 *   apiKey: process.env.GOOGLE_API_KEY!,
 *   model: 'gemini-1.5-pro', // Default model
 *   temperature: 0.8, // Default temperature
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createGoogle(options: GoogleOptions): AIProvider {
  return new GoogleGeminiProvider(options);
}

/**
 * The one function to rule them all.
 * A generic way to create any provider with type safety.
 * It's like a universal remote for AI.
 *
 * @param type - The flavor of AI you're in the mood for: 'openai', 'anthropic', 'google', 'openai_embeddings', or 'google_embeddings'.
 * @param options - The configuration and default generation options for your chosen flavor.
 * @returns The specific provider instance for the chosen type.
 *
 * @example
 * ```typescript
 * const openaiProvider = createProvider('openai', {
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'gpt-4o'
 * });
 *
 * const embeddingProvider = createProvider('openai_embeddings', {
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'text-embedding-3-small'
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createProvider<T extends ProviderType>(
  type: T,
  options: OptionsMap[T]
): ProviderMap[T] {
  switch (type) {
    case 'openai':
      return createOpenAI(options as OpenAIOptions) as ProviderMap[T];
    case 'openai_responses':
      return createOpenAIResponses(options as OpenAIResponsesOptions) as ProviderMap[T];
    case 'anthropic':
      return createAnthropic(options as AnthropicOptions) as ProviderMap[T];
    case 'google':
      return createGoogle(options as GoogleOptions) as ProviderMap[T];
    case 'openai_embeddings':
      return createOpenAIEmbeddings(options as OpenAIEmbeddingOptions) as ProviderMap[T];
    case 'google_embeddings':
      return createGoogleEmbeddings(options as GoogleEmbeddingOptions) as ProviderMap[T];
    default:
      // This should be impossible with TypeScript, but we'll be safe.
      // If you see this, you've somehow broken reality.
      throw new Error(`Unknown provider type: ${type}. How did you do that?`);
  }
}

/**
 * Creates an OpenAI embedding provider for generating text embeddings.
 * Perfect for semantic search, clustering, and similarity tasks.
 *
 * @param options - Configuration for OpenAI's embedding models
 * @returns An EmbeddingProvider ready to create vectors from text
 *
 * @example
 * ```typescript
 * const embeddings = createOpenAIEmbeddings({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   model: 'text-embedding-3-small',
 * });
 *
 * const response = await embeddings.embed(['Hello world', 'How are you?']);
 * ```
 *
 * @group Factory Functions
 */
export function createOpenAIEmbeddings(options: OpenAIEmbeddingOptions): OpenAIEmbeddingProvider {
  return new OpenAIEmbeddingProvider(options);
}

/**
 * Creates a Google embedding provider for generating text embeddings.
 * Supports both Gemini and traditional Google embedding models.
 *
 * @param options - Configuration for Google's embedding models
 * @returns An EmbeddingProvider ready to create vectors from text
 *
 * @example
 * ```typescript
 * const embeddings = createGoogleEmbeddings({
 *   apiKey: process.env.GOOGLE_API_KEY!,
 *   model: 'text-embedding-004',
 *   taskType: 'RETRIEVAL_DOCUMENT',
 * });
 *
 * const response = await embeddings.embed(['Document text here']);
 * ```
 *
 * @group Factory Functions
 */
export function createGoogleEmbeddings(options: GoogleEmbeddingOptions): GoogleEmbeddingProvider {
  return new GoogleEmbeddingProvider(options);
}

/**
 * Gets the first available AI provider constructed with default options.
 * Checks for API keys in order: OpenAI, Anthropic, Google and returns a ready-to-use provider.
 * @returns A constructed provider instance, or null if no API keys are available
 * @group Factory Functions
 * @example
 * ```typescript
 * const { provider } = getAvailableProvider();
 * if (!provider) throw new Error('No API keys found, configure it manually');
 * // Provider is ready to use
 * const response = await generate(provider, messages, options);
 * ```
 */
export function getAvailableProvider(): {
  provider?: AIProvider;
  type?: ProviderType;
  name?: string;
} {
  const providerConfigs = [
    {
      type: 'openai' as const,
      name: 'OpenAI',
      key: 'OPENAI_API_KEY',
      envVar: process.env.OPENAI_API_KEY,
    },
    {
      type: 'anthropic' as const,
      name: 'Anthropic',
      key: 'ANTHROPIC_API_KEY',
      envVar: process.env.ANTHROPIC_API_KEY,
    },
    {
      type: 'google' as const,
      name: 'Google',
      key: 'GOOGLE_API_KEY',
      envVar: process.env.GOOGLE_API_KEY,
    },
  ];

  const availableConfig = providerConfigs.find(p => p.envVar);
  if (!availableConfig) {
    return {};
  }

  return {
    provider: createProvider(availableConfig.type, {
      apiKey: availableConfig.envVar!,
    }),
    type: availableConfig.type,
    name: availableConfig.name,
  };
}
