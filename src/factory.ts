import type { AIProvider, OpenAIConfig, AnthropicConfig, GoogleConfig } from './types';

import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleGeminiProvider } from './providers/google';

// Simple factory functions with strong typing
export function createOpenAI(config: OpenAIConfig): AIProvider {
  return new OpenAIProvider(config);
}

export function createAnthropic(config: AnthropicConfig): AIProvider {
  return new AnthropicProvider(config);
}

export function createGoogle(config: GoogleConfig): AIProvider {
  return new GoogleGeminiProvider(config);
}

// Generic provider creation with type safety
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
