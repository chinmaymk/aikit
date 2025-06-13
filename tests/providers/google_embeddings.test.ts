import { GoogleEmbeddingProvider, type GoogleEmbeddingOptions } from '@chinmaymk/aikit';
import nock from 'nock';

describe('GoogleEmbeddingProvider', () => {
  const defaultOptions: GoogleEmbeddingOptions = {
    apiKey: 'test-api-key',
  };

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create provider with required options', () => {
      const provider = new GoogleEmbeddingProvider(defaultOptions);
      expect(provider).toBeInstanceOf(GoogleEmbeddingProvider);
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new GoogleEmbeddingProvider({} as GoogleEmbeddingOptions);
      }).toThrow('Google API key is required');
    });
  });

  describe('embed', () => {
    let provider: GoogleEmbeddingProvider;

    beforeEach(() => {
      provider = new GoogleEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-004',
      });
    });

    it('should generate embeddings for single text', async () => {
      const mockResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3, -0.1, -0.2],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3, -0.1, -0.2]);
      expect(result.embeddings[0].index).toBe(0);
      expect(result.model).toBe('text-embedding-004');
    });

    it('should generate embeddings for multiple texts', async () => {
      const mockResponse1 = {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      };

      const mockResponse2 = {
        embedding: {
          values: [0.4, 0.5, 0.6],
        },
      };

      const scope1 = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse1));

      const scope2 = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse2));

      const result = await provider.embed(['Hello world', 'How are you?']);

      expect(scope1.isDone()).toBe(true);
      expect(scope2.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1].values).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle Google-specific embedding options correctly', async () => {
      const mockResponse = {
        embedding: {
          values: [0.1, 0.2],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent', {
          content: {
            parts: [{ text: 'Hello world' }],
          },
          taskType: 'RETRIEVAL_DOCUMENT',
          title: 'Test Document',
          outputDimensionality: 2,
        })
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world'], {
        taskType: 'RETRIEVAL_DOCUMENT',
        title: 'Test Document',
        dimensions: 2,
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2]);
    });

    it('should handle task type mapping correctly', async () => {
      const mockResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent', {
          content: {
            parts: [{ text: 'Hello world' }],
          },
          taskType: 'RETRIEVAL_QUERY',
        })
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world'], {
        taskType: 'RETRIEVAL_QUERY',
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle output data type correctly', async () => {
      const mockResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent', {
          content: {
            parts: [{ text: 'Hello world' }],
          },
          outputDtype: 'float',
        })
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await provider.embed(['Hello world'], {
        outputDtype: 'float',
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings[0].values).toEqual([0.1, 0.2, 0.3]);
    });

    it('should throw error when model is not provided', async () => {
      const providerWithoutModel = new GoogleEmbeddingProvider(defaultOptions);

      await expect(providerWithoutModel.embed(['Hello world'])).rejects.toThrow(
        'Model is required. Provide it at construction time or when calling embed.'
      );
    });

    it('should throw error when no texts provided', async () => {
      await expect(provider.embed([])).rejects.toThrow('At least one text must be provided');
    });

    it('should handle API errors gracefully', async () => {
      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(400, 'Invalid request');

      await expect(provider.embed(['Hello world'])).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });

    it('should use custom base URL', async () => {
      const customProvider = new GoogleEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-004',
        baseURL: 'https://custom.googleapis.com/v1beta',
      });

      const mockResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      };

      const scope = nock('https://custom.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await customProvider.embed(['Hello world']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
    });

    it('should merge construction and call-time options correctly', async () => {
      const providerWithDefaults = new GoogleEmbeddingProvider({
        ...defaultOptions,
        model: 'text-embedding-004',
        taskType: 'RETRIEVAL_DOCUMENT',
        dimensions: 512,
      });

      const mockResponse = {
        embedding: {
          values: [0.1, 0.2],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/gemini-embedding-001:embedContent', {
          content: {
            parts: [{ text: 'Hello world' }],
          },
          taskType: 'SEMANTIC_SIMILARITY', // Call-time override
          outputDimensionality: 1024, // Call-time override
        })
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await providerWithDefaults.embed(['Hello world'], {
        model: 'gemini-embedding-001',
        taskType: 'SEMANTIC_SIMILARITY',
        dimensions: 1024,
      });

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
    });

    it('should handle models with versions correctly', async () => {
      const providerWithVersionedModel = new GoogleEmbeddingProvider({
        ...defaultOptions,
        model: 'models/text-embedding-004',
      });

      const mockResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      };

      const scope = nock('https://generativelanguage.googleapis.com/v1beta')
        .post('/models/text-embedding-004:embedContent')
        .query({ key: 'test-api-key' })
        .reply(200, JSON.stringify(mockResponse));

      const result = await providerWithVersionedModel.embed(['Hello world']);

      expect(scope.isDone()).toBe(true);
      expect(result.embeddings).toHaveLength(1);
    });
  });
});
