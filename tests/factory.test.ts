import {
  createOpenAI,
  createOpenAIResponses,
  createAnthropic,
  createGoogle,
  createProvider,
  getAvailableProvider,
  createOpenAIEmbeddings,
  createGoogleEmbeddings,
  createEmbeddingsProvider,
  type OpenAIOptions,
  type OpenAIResponsesOptions,
  type AnthropicOptions,
  type GoogleOptions,
  type WithApiKey,
} from '@chinmaymk/aikit';

describe('Factory Functions', () => {
  const mockOpenAIOptions = {
    apiKey: 'test-openai-key',
  };

  const mockOpenAIResponsesOptions: WithApiKey<OpenAIResponsesOptions> = {
    apiKey: 'test-openai-key',
  };

  const mockAnthropicOptions = {
    apiKey: 'test-anthropic-key',
  };

  const mockGoogleOptions = {
    apiKey: 'test-google-key',
  };

  describe('createOpenAI', () => {
    it('should create an OpenAI provider function', () => {
      const provider = createOpenAI(mockOpenAIOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openai');
    });
  });

  describe('createOpenAIResponses', () => {
    it('should create an OpenAI Responses provider function', () => {
      const provider = createOpenAIResponses(mockOpenAIResponsesOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openaiResponses');
    });
  });

  describe('createAnthropic', () => {
    it('should create an Anthropic provider function', () => {
      const provider = createAnthropic(mockAnthropicOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('anthropic');
    });
  });

  describe('createGoogle', () => {
    it('should create a Google provider function', () => {
      const provider = createGoogle(mockGoogleOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('google');
    });
  });

  describe('createOpenAIEmbeddings', () => {
    it('should create an OpenAI embeddings provider function', () => {
      const provider = createOpenAIEmbeddings({ apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });
  });

  describe('createGoogleEmbeddings', () => {
    it('should create a Google embeddings provider function', () => {
      const provider = createGoogleEmbeddings({ apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });
  });

  describe('createEmbeddingsProvider', () => {
    it('should create OpenAI embeddings provider when type is "openai_embeddings"', () => {
      const provider = createEmbeddingsProvider('openai_embeddings', { apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });

    it('should create Google embeddings provider when type is "google_embeddings"', () => {
      const provider = createEmbeddingsProvider('google_embeddings', { apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });

    it('should throw error for unknown embedding provider type', () => {
      expect(() => {
        createEmbeddingsProvider('unknown_type' as any, { apiKey: 'test-key' });
      }).toThrow('Unknown embedding provider type: unknown_type');
    });
  });

  describe('createProvider', () => {
    it('should create OpenAI provider when type is "openai"', () => {
      const provider = createProvider('openai', mockOpenAIOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openai');
    });

    it('should create OpenAI Responses provider when type is "openai_responses"', () => {
      const provider = createProvider('openai_responses', mockOpenAIResponsesOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openaiResponses');
    });

    it('should create Anthropic provider when type is "anthropic"', () => {
      const provider = createProvider('anthropic', mockAnthropicOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('anthropic');
    });

    it('should create Google provider when type is "google"', () => {
      const provider = createProvider('google', mockGoogleOptions);
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('google');
    });

    it('should throw error for unknown provider type', () => {
      expect(() => {
        createProvider('unknown' as any, { apiKey: 'test' } as any);
      }).toThrow('Unknown generation provider type: unknown');
    });
  });

  describe('getAvailableProvider', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return OpenAI provider when OPENAI_API_KEY is available', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('openai');
      expect(result.name).toBe('OpenAI');
    });

    it('should return Anthropic provider when only ANTHROPIC_API_KEY is available', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('anthropic');
      expect(result.name).toBe('Anthropic');
    });

    it('should return Google provider when only GOOGLE_API_KEY is available', () => {
      process.env.GOOGLE_API_KEY = 'test-google-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('google');
      expect(result.name).toBe('Google');
    });

    it('should return Google provider when only GEMINI_API_KEY is available', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('google');
      expect(result.name).toBe('Google');
    });

    it('should return OpenAI provider when multiple API keys are available (priority order)', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.GOOGLE_API_KEY = 'test-google-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('openai');
      expect(result.name).toBe('OpenAI');
    });

    it('should return undefined when no API keys are available', () => {
      const result = getAvailableProvider();
      expect(result.provider).toBeUndefined();
      expect(result.type).toBeUndefined();
      expect(result.name).toBeUndefined();
    });

    it('should handle provider creation errors gracefully', () => {
      // Set an empty API key which should cause provider creation to fail
      process.env.OPENAI_API_KEY = '';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      const result = getAvailableProvider();
      expect(result.provider).toBeDefined();
      expect(result.type).toBe('anthropic');
      expect(result.name).toBe('Anthropic');
    });
  });
});
