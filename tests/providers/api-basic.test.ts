import { APIClient } from '@chinmaymk/aikit/providers/api';
import nock from 'nock';
import { Readable } from 'node:stream';

describe('API Client - Basic Functionality', () => {
  const baseUrl = 'https://api.example.com';
  const headers = { 'Content-Type': 'application/json' };

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  let client: APIClient;

  beforeEach(() => {
    client = new APIClient(baseUrl, headers);
  });

  describe('constructor', () => {
    it('should initialize with basic config', () => {
      const basicClient = new APIClient(baseUrl, headers);
      expect(basicClient).toBeInstanceOf(APIClient);
    });

    it('should initialize with timeout and max retries', () => {
      const advancedClient = new APIClient(baseUrl, headers, 5000, 3);
      expect(advancedClient).toBeInstanceOf(APIClient);
    });

    it('should initialize with mutateHeaders function', () => {
      const mutateHeaders = (headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
      };
      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        headers,
        undefined,
        undefined,
        mutateHeaders
      );
      expect(clientWithMutateHeaders).toBeInstanceOf(APIClient);
    });
  });

  describe('basic streaming', () => {
    it('should make successful API call', async () => {
      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      const resultStream = await client.stream('/test', { key: 'value' });

      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle API errors', async () => {
      const scope = nock(baseUrl).post('/test').reply(400, 'Bad Request');

      await expect(client.stream('/test', {})).rejects.toThrow('API error: 400');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle missing response body', async () => {
      // Test the edge case where response.body is null
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
      });

      await expect(client.stream('/test', {})).rejects.toThrow('No response body');

      global.fetch = originalFetch;
    });

    it('should handle network errors', async () => {
      const scope = nock(baseUrl).post('/test').replyWithError('Network Error');

      await expect(client.stream('/test', {})).rejects.toThrow();
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('retry logic and error handling', () => {
    it('should retry on 429 rate limit errors', async () => {
      const clientWithRetries = new APIClient(baseUrl, headers, 5000, 2);

      // First request fails with 429, second succeeds
      const scope = nock(baseUrl)
        .post('/test')
        .reply(429, 'Rate limit exceeded')
        .post('/test')
        .reply(200, 'success', { 'Content-Type': 'text/event-stream' });

      const resultStream = await clientWithRetries.stream('/test', {});
      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should retry on 502 bad gateway errors', async () => {
      const clientWithRetries = new APIClient(baseUrl, headers, 5000, 2);

      const scope = nock(baseUrl)
        .post('/test')
        .reply(502, 'Bad Gateway')
        .post('/test')
        .reply(200, 'success', { 'Content-Type': 'text/event-stream' });

      const resultStream = await clientWithRetries.stream('/test', {});
      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should exhaust retries and throw error', async () => {
      const clientWithRetries = new APIClient(baseUrl, headers, 5000, 2);

      // maxRetries = 2 means 2 total attempts (not initial + retries)
      const scope = nock(baseUrl).post('/test').times(2).reply(503, 'Service Unavailable');

      await expect(clientWithRetries.stream('/test', {})).rejects.toThrow('API error: 503');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle mutateHeaders function', async () => {
      const mutateHeaders = jest.fn((headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
        headers['Authorization'] = 'Bearer updated-token';
      });

      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        { 'Content-Type': 'application/json', Authorization: 'Bearer original-token' },
        undefined,
        undefined,
        mutateHeaders
      );

      const scope = nock(baseUrl, {
        reqheaders: {
          'X-Custom-Header': 'test-value',
          Authorization: 'Bearer updated-token',
        },
      })
        .post('/test')
        .reply(200, 'success', { 'Content-Type': 'text/event-stream' });

      await clientWithMutateHeaders.stream('/test', {});

      expect(mutateHeaders).toHaveBeenCalled();
      expect(scope.isDone()).toBe(true);
    });

    it('should handle timeout configuration', () => {
      const clientWithTimeout = new APIClient(baseUrl, headers, 10000);
      expect(clientWithTimeout).toBeInstanceOf(APIClient);
    });

    it('should handle custom maxRetries configuration', () => {
      const clientWithMaxRetries = new APIClient(baseUrl, headers, undefined, 5);
      expect(clientWithMaxRetries).toBeInstanceOf(APIClient);
    });
  });
});
