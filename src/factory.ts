import type { AIProvider, OpenAIConfig, AnthropicConfig, GoogleConfig } from './types';

import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleGeminiProvider } from './providers/google';

/**
 * Maps provider type strings to their corresponding provider classes
 */
type ProviderMap = {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  google: GoogleGeminiProvider;
};

/**
 * Maps provider type strings to their corresponding config types
 */
type ConfigMap = {
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  google: GoogleConfig;
};

/**
 * Summons an AIProvider that speaks fluent OpenAI.
 * Just give it your credentials and it'll be ready to chat.
 *
 * @param config - The secret handshake (configuration) for the OpenAI API.
 * @returns An AIProvider, ready to do your bidding with OpenAI's models.
 *
 * @example
 * ```typescript
 * const openai = createOpenAI({
 *   apiKey: process.env.OPENAI_API_KEY!,
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createOpenAI(config: OpenAIConfig): AIProvider {
  return new OpenAIProvider(config);
}

/**
 * Whips up an AIProvider that communicates with Anthropic's Claude.
 * It's thoughtful, helpful, and probably won't start a robot uprising.
 *
 * @param config - The configuration needed to get Claude's attention.
 * @returns An AIProvider, configured to work with Anthropic's models.
 *
 * @example
 * ```typescript
 * const anthropic = createAnthropic({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createAnthropic(config: AnthropicConfig): AIProvider {
  return new AnthropicProvider(config);
}

/**
 * Assembles an AIProvider for Google's Gemini.
 * Get ready for some of that Google magic.
 *
 * @param config - The keys to the Google AI kingdom.
 * @returns An AIProvider, geared up for Gemini.
 *
 * @example
 * ```typescript
 * const google = createGoogle({
 *   apiKey: process.env.GOOGLE_API_KEY!,
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createGoogle(config: GoogleConfig): AIProvider {
  return new GoogleGeminiProvider(config);
}

/**
 * The one function to rule them all.
 * A generic way to create any provider with type safety.
 * It's like a universal remote for AI.
 *
 * @param type - The flavor of AI you're in the mood for: 'openai', 'anthropic', or 'google'.
 * @param config - The configuration for your chosen flavor.
 * @returns The specific provider instance for the chosen type.
 *
 * @example
 * ```typescript
 * const openaiProvider = createProvider('openai', {
 *   apiKey: process.env.OPENAI_API_KEY!
 * });
 *
 * const anthropicProvider = createProvider('anthropic', {
 *   apiKey: process.env.ANTHROPIC_API_KEY!
 * });
 * ```
 *
 * @group Factory Functions
 */
export function createProvider<T extends keyof ProviderMap>(
  type: T,
  config: ConfigMap[T]
): ProviderMap[T] {
  switch (type) {
    case 'openai':
      return createOpenAI(config as OpenAIConfig) as ProviderMap[T];
    case 'anthropic':
      return createAnthropic(config as AnthropicConfig) as ProviderMap[T];
    case 'google':
      return createGoogle(config as GoogleConfig) as ProviderMap[T];
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
