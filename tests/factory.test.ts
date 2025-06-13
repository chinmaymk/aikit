import {
  createOpenAI,
  createOpenAIResponses,
  createAnthropic,
  createGoogle,
  createProvider,
  getAvailableProvider,
} from '../src/factory';
import { OpenAIProvider } from '../src/providers/openai_completions';
import { OpenAIProvider as OpenAIResponsesProvider } from '../src/providers/openai_responses';
import { AnthropicProvider } from '../src/providers/anthropic';
import { GoogleGeminiProvider } from '../src/providers/google';
import type {
  OpenAIOptions,
  OpenAIResponsesOptions,
  AnthropicOptions,
  GoogleOptions,
} from '../src/types';

describe('Factory Functions', () => {
  const mockOpenAIOptions: OpenAIOptions = {
    apiKey: 'test-openai-key',
  };

  const mockOpenAIResponsesOptions: OpenAIResponsesOptions = {
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

  describe('createOpenAIResponses', () => {
    it('should create an OpenAI Responses provider instance', () => {
      const provider = createOpenAIResponses(mockOpenAIResponsesOptions);
      expect(provider).toBeInstanceOf(OpenAIResponsesProvider);
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

    it('should create OpenAI Responses provider when type is "openai_responses"', () => {
      const provider = createProvider('openai_responses', mockOpenAIResponsesOptions);
      expect(provider).toBeInstanceOf(OpenAIResponsesProvider);
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
        createProvider('unknown' as any, {});
      }).toThrow('Unknown provider type: unknown');
    });
  });

  describe('getAvailableProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return OpenAI provider when OPENAI_API_KEY is available', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.ANTHROPIC_API_KEY = '';
      process.env.GOOGLE_API_KEY = '';

      const result = getAvailableProvider();

      expect(result.provider).toBeInstanceOf(OpenAIProvider);
      expect(result.type).toBe('openai');
      expect(result.name).toBe('OpenAI');
    });

    it('should return Anthropic provider when only ANTHROPIC_API_KEY is available', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.GOOGLE_API_KEY = '';

      const result = getAvailableProvider();

      expect(result.provider).toBeInstanceOf(AnthropicProvider);
      expect(result.type).toBe('anthropic');
      expect(result.name).toBe('Anthropic');
    });

    it('should return Google provider when only GOOGLE_API_KEY is available', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.ANTHROPIC_API_KEY = '';
      process.env.GOOGLE_API_KEY = 'test-google-key';

      const result = getAvailableProvider();

      expect(result.provider).toBeInstanceOf(GoogleGeminiProvider);
      expect(result.type).toBe('google');
      expect(result.name).toBe('Google');
    });

    it('should return OpenAI provider when multiple API keys are available (priority order)', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.GOOGLE_API_KEY = 'test-google-key';

      const result = getAvailableProvider();

      expect(result.provider).toBeInstanceOf(OpenAIProvider);
      expect(result.type).toBe('openai');
      expect(result.name).toBe('OpenAI');
    });

    it('should return undefined when no API keys are available', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.ANTHROPIC_API_KEY = '';
      process.env.GOOGLE_API_KEY = '';
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = getAvailableProvider();

      expect(result.provider).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.name).toBeUndefined();
    });
  });
});
