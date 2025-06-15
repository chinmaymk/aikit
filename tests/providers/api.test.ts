import { APIClient, extractDataLines } from '@chinmaymk/aikit/providers/api';
import nock from 'nock';
import { Readable } from 'node:stream';

describe('APIClient', () => {
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

  describe('mutateHeaders', () => {
    it('should call mutateHeaders function before making request', async () => {
      const mutateHeaders = jest.fn((headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
        headers['X-Another-Header'] = 'another-value';
      });

      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        headers,
        undefined,
        undefined,
        mutateHeaders
      );

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('X-Custom-Header', 'test-value')
        .matchHeader('X-Another-Header', 'another-value')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithMutateHeaders.stream('/test', { key: 'value' });

      expect(mutateHeaders).toHaveBeenCalledTimes(1);
      expect(mutateHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value',
          'X-Another-Header': 'another-value',
        })
      );
      expect(scope.isDone()).toBe(true);
    });

    it('should not modify original headers object', async () => {
      const originalHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer token' };
      const mutateHeaders = (headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
        delete headers['Authorization'];
      };

      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        originalHeaders,
        undefined,
        undefined,
        mutateHeaders
      );

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('X-Custom-Header', 'test-value')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithMutateHeaders.stream('/test', { key: 'value' });

      // Original headers should remain unchanged
      expect(originalHeaders).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('should work without mutateHeaders function', async () => {
      const clientWithoutMutateHeaders = new APIClient(baseUrl, headers);

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('Content-Type', 'application/json')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      const resultStream = await clientWithoutMutateHeaders.stream('/test', { key: 'value' });

      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle mutateHeaders that adds authentication', async () => {
      const mutateHeaders = (headers: Record<string, string>) => {
        headers['Authorization'] = 'Bearer dynamic-token';
        headers['X-Request-ID'] = 'req-123';
      };

      const clientWithAuth = new APIClient(baseUrl, headers, undefined, undefined, mutateHeaders);

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('Authorization', 'Bearer dynamic-token')
        .matchHeader('X-Request-ID', 'req-123')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithAuth.stream('/test', { key: 'value' });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('stream', () => {
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
        statusText: 'OK',
        body: null, // This is the key - null body
        text: async () => '',
      } as any);

      await expect(client.stream('/test', {})).rejects.toThrow('No response body from API');

      global.fetch = originalFetch;
    });

    it('should retry on failure', async () => {
      const retryClient = new APIClient(baseUrl, headers, undefined, 2);

      const scope = nock(baseUrl)
        .post('/test')
        .reply(500, 'Internal Server Error')
        .post('/test')
        .reply(200, () => new Readable({ read() {} }));

      const resultStream = await retryClient.stream('/test', {});

      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should throw last error after max retries', async () => {
      const retryClient = new APIClient(baseUrl, headers, undefined, 2);

      const scope = nock(baseUrl)
        .post('/test')
        .reply(500, 'Internal Server Error')
        .post('/test')
        .reply(500, 'Internal Server Error');

      await expect(retryClient.stream('/test', {})).rejects.toThrow('API error: 500');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle max retries correctly', async () => {
      const retryClient = new APIClient(baseUrl, headers, undefined, 2);

      const scope = nock(baseUrl)
        .post('/test')
        .reply(500, 'Internal Server Error')
        .post('/test')
        .reply(500, 'Internal Server Error');

      await expect(retryClient.stream('/test', {})).rejects.toThrow('API error: 500');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle timeout properly', async () => {
      const timeoutClient = new APIClient(baseUrl, headers, 10); // 10ms timeout

      const _scope = nock(baseUrl)
        .post('/test')
        .delay(100) // Delay longer than timeout
        .reply(200, () => new Readable({ read() {} }));

      await expect(timeoutClient.stream('/test', {})).rejects.toThrow();
      nock.cleanAll(); // Clean up manually since delay may prevent auto-cleanup
      expect(_scope.isDone()).toBe(true);
    });

    it('should handle retry exhaustion with proper error', async () => {
      const retryClient = new APIClient(baseUrl, headers, undefined, 3);

      const scope = nock(baseUrl)
        .post('/test')
        .reply(500, 'First error')
        .post('/test')
        .reply(500, 'Second error')
        .post('/test')
        .reply(500, 'Third error');

      await expect(retryClient.stream('/test', {})).rejects.toThrow(
        'API error: 500 Internal Server Error - Third error'
      );
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('processStreamAsLines', () => {
    it('should process stream and yield lines', async () => {
      const data = 'line1\nline2\nline3';
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(data));
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(stream)) {
        lines.push(line);
      }

      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle partial lines and buffer correctly', async () => {
      const stream = new ReadableStream({
        start(controller) {
          // Send data in chunks that split lines
          controller.enqueue(new TextEncoder().encode('line'));
          controller.enqueue(new TextEncoder().encode('1\nline2\npar'));
          controller.enqueue(new TextEncoder().encode('tial'));
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(stream)) {
        lines.push(line);
      }

      expect(lines).toEqual(['line1', 'line2', 'partial']);
    });

    it('should handle empty stream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(stream)) {
        lines.push(line);
      }

      expect(lines).toEqual([]);
    });
  });

  describe('processStreamAsRaw', () => {
    it('should process stream and yield raw chunks', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('chunk1'));
          controller.enqueue(new TextEncoder().encode('chunk2'));
          controller.enqueue(new TextEncoder().encode('chunk3'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      for await (const chunk of client.processStreamAsRaw(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
    });

    it('should handle empty chunks', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(''));
          controller.enqueue(new TextEncoder().encode('data'));
          controller.enqueue(new TextEncoder().encode(''));
          controller.close();
        },
      });

      const chunks: string[] = [];
      for await (const chunk of client.processStreamAsRaw(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['data']);
    });
  });
});

describe('extractDataLines', () => {
  async function* createLineStream(lines: string[]) {
    for (const line of lines) {
      yield line;
    }
  }

  it('should extract data lines from SSE stream', async () => {
    const lines = [
      'event: start',
      'data: {"type": "start"}',
      'data: {"type": "delta", "content": "hello"}',
      '',
      'data: [DONE]',
      'event: end',
    ];

    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream(lines))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual(['{"type": "start"}', '{"type": "delta", "content": "hello"}']);
  });

  it('should handle empty stream', async () => {
    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream([]))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual([]);
  });

  it('should filter out non-data lines', async () => {
    const lines = [
      'event: message',
      'id: 123',
      'retry: 1000',
      'data: actual data',
      ': comment line',
      'data: more data',
    ];

    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream(lines))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual(['actual data', 'more data']);
  });
});

describe('extractDataLines - Edge Cases', () => {
  async function* createAsyncIterable(lines: string[]): AsyncIterable<string> {
    for (const line of lines) {
      yield line;
    }
  }

  it('should handle lines without data prefix', async () => {
    const lines = ['event: start', 'data: {"test": true}', 'invalid line', 'data: {"test": false}'];
    const result: string[] = [];
    for await (const data of extractDataLines(createAsyncIterable(lines))) {
      result.push(data);
    }
    expect(result).toEqual(['{"test": true}', '{"test": false}']);
  });

  it('should handle empty lines array', async () => {
    const result: string[] = [];
    for await (const data of extractDataLines(createAsyncIterable([]))) {
      result.push(data);
    }
    expect(result).toEqual([]);
  });

  it('should handle lines with only whitespace', async () => {
    const lines = ['   ', 'data: content', '\t\n', 'data: more'];
    const result: string[] = [];
    for await (const data of extractDataLines(createAsyncIterable(lines))) {
      result.push(data);
    }
    expect(result).toEqual(['content', 'more']);
  });

  it('should handle data lines with colons in content', async () => {
    const lines = ['data: {"url": "https://example.com", "time": "12:34:56"}'];
    const result: string[] = [];
    for await (const data of extractDataLines(createAsyncIterable(lines))) {
      result.push(data);
    }
    expect(result).toEqual(['{"url": "https://example.com", "time": "12:34:56"}']);
  });

  it('should skip [DONE] markers', async () => {
    const lines = ['data: {"test": true}', 'data: [DONE]', 'data: {"test": false}'];
    const result: string[] = [];
    for await (const data of extractDataLines(createAsyncIterable(lines))) {
      result.push(data);
    }
    expect(result).toEqual(['{"test": true}', '{"test": false}']);
  });
});
