import { APIClient, extractDataLines } from '../../src/providers/api';
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
