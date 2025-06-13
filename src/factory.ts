import type {
  AIProvider,
  OpenAIOptions,
  OpenAIResponsesOptions,
  AnthropicOptions,
  GoogleOptions,
} from './types';

import { OpenAIProvider } from './providers/openai_completions';
import { OpenAIProvider as OpenAIResponsesProvider } from './providers/openai_responses';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleGeminiProvider } from './providers/google';

/**
 * Maps provider type strings to their corresponding provider classes
 */
type ProviderMap = {
  openai: OpenAIProvider;
  openai_responses: OpenAIResponsesProvider;
  anthropic: AnthropicProvider;
  google: GoogleGeminiProvider;
};

/**
 * Maps provider type strings to their corresponding option types
 */
type OptionsMap = {
  openai: OpenAIOptions;
  openai_responses: OpenAIResponsesOptions;
  anthropic: AnthropicOptions;
  google: GoogleOptions;
};

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
 * @param type - The flavor of AI you're in the mood for: 'openai', 'anthropic', or 'google'.
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
 * const anthropicProvider = createProvider('anthropic', {
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-3-5-sonnet-20240620'
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createProvider<T extends keyof ProviderMap>(
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
    default:
      // This should be impossible with TypeScript, but we'll be safe.
      // If you see this, you've somehow broken reality.
      throw new Error(`Unknown provider type: ${type}. How did you do that?`);
  }
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
  provider: AIProvider | null;
  type: keyof ProviderMap | null;
  name: string | null;
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
    return { provider: null, type: null, name: null };
  }

  return {
    provider: createProvider(availableConfig.type, {
      apiKey: availableConfig.envVar!,
    }),
    type: availableConfig.type,
    name: availableConfig.name,
  };
}
