import type { AIProvider, OpenAIConfig, AnthropicConfig, GoogleConfig } from './types';

import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleGeminiProvider } from './providers/google';

/**
 * Creates an OpenAI provider instance
 * 
 * @param config - Configuration options for OpenAI
 * @returns An AIProvider instance configured for OpenAI
 * 
 * @example
 * ```typescript
 * const provider = createOpenAI({
 *   apiKey: process.env.OPENAI_API_KEY!
 * });
 * ```
 * 
 * @group Factory Functions
 */
export function createOpenAI(config: OpenAIConfig): AIProvider {
  return new OpenAIProvider(config);
}

/**
 * Creates an Anthropic provider instance
 * 
 * @param config - Configuration options for Anthropic
 * @returns An AIProvider instance configured for Anthropic
 * 
 * @example
 * ```typescript
 * const provider = createAnthropic({
 *   apiKey: process.env.ANTHROPIC_API_KEY!
 * });
 * ```
 * 
 * @group Factory Functions
 */
export function createAnthropic(config: AnthropicConfig): AIProvider {
  return new AnthropicProvider(config);
}

/**
 * Creates a Google Gemini provider instance
 * 
 * @param config - Configuration options for Google Gemini
 * @returns An AIProvider instance configured for Google Gemini
 * 
 * @example
 * ```typescript
 * const provider = createGoogle({
 *   apiKey: process.env.GOOGLE_API_KEY!
 * });
 * ```
 * 
 * @group Factory Functions
 */
export function createGoogle(config: GoogleConfig): AIProvider {
  return new GoogleGeminiProvider(config);
}

/**
 * Generic provider creation with type safety
 * 
 * @param type - The provider type ('openai', 'anthropic', or 'google')
 * @param config - Configuration options for the specified provider
 * @returns An AIProvider instance configured for the specified provider
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
export function createProvider<T extends 'openai' | 'anthropic' | 'google'>(
  type: T,
  config: T extends 'openai' ? OpenAIConfig : T extends 'anthropic' ? AnthropicConfig : GoogleConfig
): AIProvider {
  switch (type) {
    case 'openai':
      return createOpenAI(config as OpenAIConfig);
    case 'anthropic':
      return createAnthropic(config as AnthropicConfig);
    case 'google':
      return createGoogle(config as GoogleConfig);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
