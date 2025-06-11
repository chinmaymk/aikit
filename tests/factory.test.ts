import { createOpenAI, createAnthropic, createGoogle, createProvider } from '../src/factory';
import { OpenAIProvider } from '../src/providers/openai';
import { AnthropicProvider } from '../src/providers/anthropic';
import { GoogleGeminiProvider } from '../src/providers/google';
import type { OpenAIConfig, AnthropicConfig, GoogleConfig } from '../src/types';

describe('Factory Functions', () => {
  const mockOpenAIConfig: OpenAIConfig = {
    apiKey: 'test-openai-key',
  };

  const mockAnthropicConfig: AnthropicConfig = {
    apiKey: 'test-anthropic-key',
  };

  const mockGoogleConfig: GoogleConfig = {
    apiKey: 'test-google-key',
  };

  describe('createOpenAI', () => {
    it('should create an OpenAI provider instance', () => {
      const provider = createOpenAI(mockOpenAIConfig);
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.models).toContain('gpt-4o');
    });
  });

  describe('createAnthropic', () => {
    it('should create an Anthropic provider instance', () => {
      const provider = createAnthropic(mockAnthropicConfig);
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.models).toContain('claude-3-5-sonnet-20241022');
    });
  });

  describe('createGoogle', () => {
    it('should create a Google provider instance', () => {
      const provider = createGoogle(mockGoogleConfig);
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
      expect(provider.models).toContain('gemini-1.5-pro');
    });
  });

  describe('createProvider', () => {
    it('should create OpenAI provider when type is "openai"', () => {
      const provider = createProvider('openai', mockOpenAIConfig);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Anthropic provider when type is "anthropic"', () => {
      const provider = createProvider('anthropic', mockAnthropicConfig);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create Google provider when type is "google"', () => {
      const provider = createProvider('google', mockGoogleConfig);
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
    });

    it('should throw error for unknown provider type', () => {
      expect(() => {
        // @ts-expect-error Testing invalid type
        createProvider('unknown', {});
      }).toThrow('Unknown provider type: unknown');
    });
  });
});
