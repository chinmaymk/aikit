import { OpenAIEmbeddingProvider } from '../../src/providers/openai_embeddings';
import type { OpenAIEmbeddingOptions } from '../../src/types';
import nock from 'nock';

describe('OpenAIEmbeddingProvider', () => {
  const defaultOptions: OpenAIEmbeddingOptions = {
    apiKey: 'test-api-key',
  };

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create provider with required options', () => {
      const provider = new OpenAIEmbeddingProvider(defaultOptions);
      expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new OpenAIEmbeddingProvider({} as OpenAIEmbeddingOptions);
      }).toThrow('OpenAI API key is required');
    });

    it('should set custom headers for organization and project', () => {
      const options: OpenAIEmbeddingOptions = {
        ...defaultOptions,
        organization: 'test-org',
        project: 'test-project',
      };

      // This should not throw
      new OpenAIEmbeddingProvider(options);
    });
  });

  describe('embed', () => {
    let provider: OpenAIEmbeddingProvider;

    beforeEach(() => {
      provider = new OpenAIEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-3-small',
      });
    });

    it('should generate embeddings for single text', async () => {
      const mockResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.1, 0.2, 0.3, -0.1, -0.2],
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };

      const scope = nock('https://api.openai.com/v1')
        .post('/embeddings')
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3, -0.1, -0.2]);
      expect(result.embeddings[0].index).toBe(0);
      expect(result.usage?.inputTokens).toBe(5);
      expect(result.usage?.totalTokens).toBe(5);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should generate embeddings for multiple texts', async () => {
      const mockResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.1, 0.2, 0.3],
          },
          {
            object: 'embedding',
            index: 1,
            embedding: [0.4, 0.5, 0.6],
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 8,
          total_tokens: 8,
        },
      };

      const scope = nock('https://api.openai.com/v1')
        .post('/embeddings')
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world', 'How are you?']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1].values).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle embedding options correctly', async () => {
      const mockResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.1, 0.2],
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };

      const scope = nock('https://api.openai.com/v1')
        .post('/embeddings', {
          model: 'text-embedding-3-small',
          input: ['Hello world'],
          dimensions: 2,
          encoding_format: 'float',
          user: 'test-user',
        })
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world'], {
        dimensions: 2,
        encodingFormat: 'float',
        user: 'test-user',
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2]);
    });

    it('should throw error when model is not provided', async () => {
      const providerWithoutModel = new OpenAIEmbeddingProvider(defaultOptions);

      await expect(providerWithoutModel.embed(['Hello world'])).rejects.toThrow(
        'Model is required. Provide it at construction time or when calling embed.'
      );
    });

    it('should throw error when no texts provided', async () => {
      await expect(provider.embed([])).rejects.toThrow('At least one text must be provided');
    });

    it('should throw error when too many texts provided', async () => {
      const tooManyTexts = Array(2049).fill('text');

      await expect(provider.embed(tooManyTexts)).rejects.toThrow(
        'OpenAI embedding API supports up to 2048 texts per request'
      );
    });

    it('should handle API errors gracefully', async () => {
      const scope = nock('https://api.openai.com/v1')
        .post('/embeddings')
        .reply(400, 'Invalid request');

      await expect(provider.embed(['Hello world'])).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should use custom base URL', async () => {
      const customProvider = new OpenAIEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-3-small',
        baseURL: 'https://custom.openai.com/v1',
      });

      const mockResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.1, 0.2, 0.3],
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };

      const scope = nock('https://custom.openai.com/v1')
        .post('/embeddings')
        .reply(200, JSON.stringify(mockResponse));

      const result = await customProvider.embed(['Hello world']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
    });

    it('should merge construction and call-time options correctly', async () => {
      const providerWithDefaults = new OpenAIEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-3-small',
        dimensions: 512,
      });

      const mockResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            index: 0,
            embedding: [0.1, 0.2],
          },
        ],
        model: 'text-embedding-3-large',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };

      const scope = nock('https://api.openai.com/v1')
        .post('/embeddings', {
          model: 'text-embedding-3-large', // Call-time override
          input: ['Hello world'],
          dimensions: 1024, // Call-time override
        })
        .reply(200, JSON.stringify(mockResponse));

      const result = await providerWithDefaults.embed(['Hello world'], {
        model: 'text-embedding-3-large',
        dimensions: 1024,
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
    });
  });
});
