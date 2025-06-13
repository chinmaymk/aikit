import { createOpenAI, createAnthropic, createGoogle, createProvider } from '../src/factory';
import { OpenAIProvider } from '../src/providers/openai';
import { AnthropicProvider } from '../src/providers/anthropic';
import { GoogleGeminiProvider } from '../src/providers/google';
import type { OpenAIOptions, AnthropicOptions, GoogleOptions } from '../src/types';

describe('Factory Functions', () => {
  const mockOpenAIOptions: OpenAIOptions = {
    apiKey: 'test-openai-key',
  };

  const mockAnthropicOptions: AnthropicOptions = {
    apiKey: 'test-anthropic-key',
  };

  const mockGoogleOptions: GoogleOptions = {
    apiKey: 'test-google-key',
  };

  describe('createOpenAI', () => {
    it('should create an OpenAI provider instance', () => {
      const provider = createOpenAI(mockOpenAIOptions);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });
  });

  describe('createAnthropic', () => {
    it('should create an Anthropic provider instance', () => {
      const provider = createAnthropic(mockAnthropicOptions);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe('createGoogle', () => {
    it('should create a Google provider instance', () => {
      const provider = createGoogle(mockGoogleOptions);
      expect(provider).toBeInstanceOf(GoogleGeminiProvider);
    });
  });

  describe('createProvider', () => {
    it('should create OpenAI provider when type is "openai"', () => {
      const provider = createProvider('openai', mockOpenAIOptions);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Anthropic provider when type is "anthropic"', () => {
      const provider = createProvider('anthropic', mockAnthropicOptions);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create Google provider when type is "google"', () => {
      const provider = createProvider('google', mockGoogleOptions);
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
