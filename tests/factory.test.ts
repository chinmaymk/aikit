import {
  createOpenAI,
  createOpenAIResponses,
  createAnthropic,
  createGoogle,
  createProvider,
  createOpenAIEmbeddings,
  createGoogleEmbeddings,
  createEmbeddingsProvider,
  type OpenAIResponsesOptions,
  type WithApiKey,
} from '@chinmaymk/aikit';

describe('Factory Functions', () => {
  const mockOptions = {
    openai: { apiKey: 'test-openai-key', model: 'gpt-4o' },
    anthropic: { apiKey: 'test-anthropic-key', model: 'claude-3-5-sonnet-20241022' },
    google: { apiKey: 'test-google-key', model: 'gemini-1.5-pro' },
    openai_responses: {
      apiKey: 'test-openai-key',
      model: 'gpt-4o',
    } as WithApiKey<OpenAIResponsesOptions>,
    embeddings: { apiKey: 'test-key' },
  };

  describe('Individual provider creation functions', () => {
    const providerTests = [
      { fn: createOpenAI, options: mockOptions.openai, name: 'openai' },
      { fn: createAnthropic, options: mockOptions.anthropic, name: 'anthropic' },
      { fn: createGoogle, options: mockOptions.google, name: 'google' },
      { fn: createOpenAIResponses, options: mockOptions.openai_responses, name: 'openaiResponses' },
      { fn: createOpenAIEmbeddings, options: mockOptions.embeddings, name: undefined },
      { fn: createGoogleEmbeddings, options: mockOptions.embeddings, name: undefined },
    ];

    providerTests.forEach(({ fn, options, name }) => {
      it(`should create ${fn.name} provider function`, () => {
        const provider = fn(options as any);
        expect(typeof provider).toBe('function');
        if (name) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(provider.name).toBe(name);
        }
      });
    });

    it('should handle createOpenAI with additional options', () => {
      const provider = createOpenAI({
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
        maxOutputTokens: 2000,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openai');
    });

    it('should handle createOpenAIResponses with reasoning options', () => {
      const provider = createOpenAIResponses({
        apiKey: 'test-key',
        reasoning: { effort: 'high' },
        model: 'gpt-4o',
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openaiResponses');
    });

    it('should handle createAnthropic with additional options', () => {
      const provider = createAnthropic({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        topK: 40,
        temperature: 0.8,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('anthropic');
    });

    it('should handle createGoogle with additional options', () => {
      const provider = createGoogle({
        apiKey: 'test-key',
        model: 'gemini-1.5-pro',
        topK: 20,
        temperature: 0.9,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('google');
    });

    it('should handle createGoogleEmbeddings with options', () => {
      const provider = createGoogleEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        taskType: 'SEMANTIC_SIMILARITY',
        title: 'Test document',
      });
      expect(typeof provider).toBe('function');
    });
  });

  describe('Generic factory functions', () => {
    describe('createEmbeddingsProvider', () => {
      const embeddingTests = [
        {
          type: 'openai_embeddings' as const,
          options: { apiKey: 'test-key', model: 'text-embedding-3-large' },
        },
        {
          type: 'google_embeddings' as const,
          options: { apiKey: 'test-key', model: 'text-embedding-004' },
        },
      ];

      embeddingTests.forEach(({ type, options }) => {
        it(`should create ${type} provider via generic factory`, () => {
          const provider = createEmbeddingsProvider(type, options);
          expect(typeof provider).toBe('function');
        });
      });

      it('should throw error for unknown embedding provider type', () => {
        expect(() => {
          createEmbeddingsProvider('unknown_embeddings' as any, { apiKey: 'test' } as any);
        }).toThrow('Unknown embedding provider type: unknown_embeddings');
      });
    });

    describe('createProvider', () => {
      const generationTests = [
        { type: 'openai' as const, options: mockOptions.openai, name: 'openai' },
        { type: 'anthropic' as const, options: mockOptions.anthropic, name: 'anthropic' },
        { type: 'google' as const, options: mockOptions.google, name: 'google' },
        {
          type: 'openai_responses' as const,
          options: mockOptions.openai_responses,
          name: 'openaiResponses',
        },
      ];

      generationTests.forEach(({ type, options, name }) => {
        it(`should create ${type} provider via generic factory`, () => {
          const provider = createProvider(type, options);
          expect(typeof provider).toBe('function');
          expect(provider.name).toBe(name);
        });
      });

      it('should throw error for unknown generation provider type', () => {
        expect(() => {
          createProvider('unknown_provider' as any, { apiKey: 'test' } as any);
        }).toThrow('Unknown generation provider type: unknown_provider');
      });
    });
  });

  // Direct function calls to ensure 100% function coverage
  describe('Direct function body execution', () => {
    it('should execute all individual factory function bodies', () => {
      // These calls ensure each individual function implementation gets executed
      const openaiProvider = createOpenAI({ apiKey: 'test', model: 'gpt-4o' });
      const anthropicProvider = createAnthropic({
        apiKey: 'test',
        model: 'claude-3-5-sonnet-20241022',
      });
      const googleProvider = createGoogle({ apiKey: 'test', model: 'gemini-1.5-pro' });
      const openaiResponsesProvider = createOpenAIResponses({ apiKey: 'test', model: 'gpt-4o' });
      const openaiEmbeddingsProvider = createOpenAIEmbeddings({ apiKey: 'test' });
      const googleEmbeddingsProvider = createGoogleEmbeddings({ apiKey: 'test' });

      // Verify they all return functions
      expect(typeof openaiProvider).toBe('function');
      expect(typeof anthropicProvider).toBe('function');
      expect(typeof googleProvider).toBe('function');
      expect(typeof openaiResponsesProvider).toBe('function');
      expect(typeof openaiEmbeddingsProvider).toBe('function');
      expect(typeof googleEmbeddingsProvider).toBe('function');
    });

    it('should execute both switch statements in factory functions', () => {
      // Execute createEmbeddingsProvider switch statement
      const embeddingProvider1 = createEmbeddingsProvider('openai_embeddings', { apiKey: 'test' });
      const embeddingProvider2 = createEmbeddingsProvider('google_embeddings', { apiKey: 'test' });

      // Execute createProvider switch statement
      const generationProvider1 = createProvider('openai', { apiKey: 'test', model: 'gpt-4o' });
      const generationProvider2 = createProvider('anthropic', {
        apiKey: 'test',
        model: 'claude-3-5-sonnet-20241022',
      });
      const generationProvider3 = createProvider('google', {
        apiKey: 'test',
        model: 'gemini-1.5-pro',
      });
      const generationProvider4 = createProvider('openai_responses', {
        apiKey: 'test',
        model: 'gpt-4o',
      });

      // Verify all are functions
      expect(typeof embeddingProvider1).toBe('function');
      expect(typeof embeddingProvider2).toBe('function');
      expect(typeof generationProvider1).toBe('function');
      expect(typeof generationProvider2).toBe('function');
      expect(typeof generationProvider3).toBe('function');
      expect(typeof generationProvider4).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should throw errors for missing API keys', () => {
      expect(() => createOpenAI({} as any)).toThrow('OpenAI API key is required');
      expect(() => createAnthropic({} as any)).toThrow('Anthropic API key is required');
      expect(() => createGoogle({} as any)).toThrow('Google API key is required');
      expect(() => createOpenAIResponses({} as any)).toThrow('OpenAI API key is required');
      expect(() => createOpenAIEmbeddings({} as any)).toThrow('OpenAI API key is required');
      expect(() => createGoogleEmbeddings({} as any)).toThrow('Google API key is required');
    });
  });

  describe('Individual factory function coverage', () => {
    it('should call each individual factory function directly', () => {
      // Call each individual factory function to ensure 100% function coverage
      const openai = createOpenAI({ apiKey: 'test', model: 'gpt-4o' });
      const anthropic = createAnthropic({ apiKey: 'test', model: 'claude-3-5-sonnet-20241022' });
      const google = createGoogle({ apiKey: 'test', model: 'gemini-1.5-pro' });
      const openaiResponses = createOpenAIResponses({ apiKey: 'test', model: 'gpt-4o' });
      const openaiEmbeddings = createOpenAIEmbeddings({
        apiKey: 'test',
        model: 'text-embedding-3-large',
      });
      const googleEmbeddings = createGoogleEmbeddings({
        apiKey: 'test',
        model: 'text-embedding-004',
      });

      expect(typeof openai).toBe('function');
      expect(typeof anthropic).toBe('function');
      expect(typeof google).toBe('function');
      expect(typeof openaiResponses).toBe('function');
      expect(typeof openaiEmbeddings).toBe('function');
      expect(typeof googleEmbeddings).toBe('function');
    });

    it('should ensure factory wrapper functions are covered', () => {
      // This test specifically targets the wrapper functions in factory.ts
      // to ensure lines 61, 80, 99, 120, 141, 162 are covered

      // Test each wrapper function return statement
      const openaiWrapper = createOpenAI({ apiKey: 'test-key', model: 'gpt-4o' });
      expect(openaiWrapper.name).toBe('openai');

      const anthropicWrapper = createAnthropic({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(anthropicWrapper.name).toBe('anthropic');

      const googleWrapper = createGoogle({ apiKey: 'test-key', model: 'gemini-1.5-pro' });
      expect(googleWrapper.name).toBe('google');

      const openaiResponsesWrapper = createOpenAIResponses({ apiKey: 'test-key', model: 'gpt-4o' });
      expect(openaiResponsesWrapper.name).toBe('openaiResponses');

      const openaiEmbeddingsWrapper = createOpenAIEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-3-large',
      });
      expect(typeof openaiEmbeddingsWrapper).toBe('function');

      const googleEmbeddingsWrapper = createGoogleEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-004',
      });
      expect(typeof googleEmbeddingsWrapper).toBe('function');
    });
  });
});
