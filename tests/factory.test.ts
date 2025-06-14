import {
  createOpenAI,
  createOpenAIResponses,
  createAnthropic,
  createGoogle,
  createProvider,
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

    it('should handle provider creation with additional options', () => {
      const provider = createOpenAI({
        apiKey: 'test-key',
        model: 'gpt-4o',
        temperature: 0.7,
      });
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

    it('should handle provider creation with reasoning options', () => {
      const provider = createOpenAIResponses({
        apiKey: 'test-key',
        reasoning: { effort: 'high' },
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('openaiResponses');
    });

    it('should handle provider creation with all response options', () => {
      const provider = createOpenAIResponses({
        apiKey: 'test-key',
        model: 'gpt-4o',
        reasoning: { effort: 'medium' },
        background: true,
        include: ['reasoning.encrypted_content'],
        instructions: 'You are a helpful assistant',
        metadata: { user: 'test' },
        parallelToolCalls: true,
        store: false,
        serviceTier: 'default',
      });
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

    it('should handle provider creation with additional options', () => {
      const provider = createAnthropic({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        topK: 40,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('anthropic');
    });

    it('should handle provider creation with all anthropic options', () => {
      const provider = createAnthropic({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.8,
        maxOutputTokens: 2000,
        topP: 0.95,
        topK: 40,
        stopSequences: ['Human:', 'Assistant:'],
        beta: ['tools-2024-04-04'],
        metadata: { user_id: 'user123' },
        system: 'You are Claude, an AI assistant.',
        thinking: { type: 'enabled', budget_tokens: 1024 },
      });
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

    it('should handle provider creation with additional options', () => {
      const provider = createGoogle({
        apiKey: 'test-key',
        model: 'gemini-1.5-pro',
        topK: 20,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('google');
    });

    it('should handle provider creation with all google options', () => {
      const provider = createGoogle({
        apiKey: 'test-key',
        model: 'gemini-1.5-pro',
        temperature: 0.9,
        maxOutputTokens: 1500,
        topP: 0.8,
        topK: 20,
        stopSequences: ['END'],
        candidateCount: 1,
        presencePenalty: 0.2,
        frequencyPenalty: 0.4,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
        seed: 12345,
        responseLogprobs: true,
        logprobs: 5,
        audioTimestamp: false,
      });
      expect(typeof provider).toBe('function');
      expect(provider.name).toBe('google');
    });
  });

  describe('createOpenAIEmbeddings', () => {
    it('should create an OpenAI embeddings provider function', () => {
      const provider = createOpenAIEmbeddings({ apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });

    it('should handle provider creation with embedding options', () => {
      const provider = createOpenAIEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-3-large',
        dimensions: 1024,
      });
      expect(typeof provider).toBe('function');
    });

    it('should handle provider creation with all embedding options', () => {
      const provider = createOpenAIEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-3-large',
        dimensions: 1024,
        encodingFormat: 'float',
        user: 'test-user',
        organization: 'org-123',
        project: 'proj-456',
        baseURL: 'https://api.custom.com',
        timeout: 30000,
        maxRetries: 3,
        taskType: 'similarity',
        autoTruncate: true,
      });
      expect(typeof provider).toBe('function');
    });
  });

  describe('createGoogleEmbeddings', () => {
    it('should create a Google embeddings provider function', () => {
      const provider = createGoogleEmbeddings({ apiKey: 'test-key' });
      expect(typeof provider).toBe('function');
    });

    it('should handle provider creation with embedding options', () => {
      const provider = createGoogleEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        taskType: 'SEMANTIC_SIMILARITY',
      });
      expect(typeof provider).toBe('function');
    });

    it('should handle provider creation with all google embedding options', () => {
      const provider = createGoogleEmbeddings({
        apiKey: 'test-key',
        model: 'text-embedding-004',
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDtype: 'float',
        title: 'Document Title',
        dimensions: 768,
        baseURL: 'https://api.google.com',
        timeout: 25000,
        maxRetries: 2,
        autoTruncate: false,
      });
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
});
