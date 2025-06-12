import { APIClient, extractDataLines } from '../../src/providers/api';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('APIClient', () => {
  let client: APIClient;

  beforeEach(() => {
    client = new APIClient('https://api.example.com', { 'Content-Type': 'application/json' });
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with basic config', () => {
      const basicClient = new APIClient('https://api.test.com', { Authorization: 'Bearer test' });
      expect(basicClient).toBeInstanceOf(APIClient);
    });

    it('should initialize with timeout and max retries', () => {
      const advancedClient = new APIClient(
        'https://api.test.com',
        { Authorization: 'Bearer test' },
        5000,
        3
      );
      expect(advancedClient).toBeInstanceOf(APIClient);
    });
  });

  describe('stream', () => {
    it('should make successful API call', async () => {
      const mockBody = new ReadableStream();
      const mockResponse = {
        ok: true,
        body: mockBody,
      };

      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      const result = await client.stream('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
        signal: undefined,
      });
      expect(result).toBe(mockBody);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('Invalid request'),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as unknown as Response);

      await expect(client.stream('/test', { data: 'test' })).rejects.toThrow(
        'API error: 400 Bad Request - Invalid request'
      );
    });

    it('should handle missing response body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      };

      mockFetch.mockResolvedValueOnce(mockResponse as Response);

      await expect(client.stream('/test', { data: 'test' })).rejects.toThrow(
        'No response body from API'
      );
    });

    it('should retry on failure', async () => {
      const clientWithRetries = new APIClient(
        'https://api.example.com',
        { 'Content-Type': 'application/json' },
        undefined,
        3 // Will attempt 3 times total
      );

      const mockBody = new ReadableStream();

      // Clear any previous mocks
      mockFetch.mockReset();

      // Set up the mock to fail twice, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          body: mockBody,
        } as Response);

      const result = await clientWithRetries.stream('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toBe(mockBody);
    });

    it('should throw last error after max retries', async () => {
      const clientWithRetries = new APIClient(
        'https://api.example.com',
        { 'Content-Type': 'application/json' },
        undefined,
        2 // Will attempt 2 times total
      );

      const error1 = new Error('Network error 1');
      const error2 = new Error('Network error 2');

      // Clear any previous mocks
      mockFetch.mockReset();

      // Set up the mock to fail both times
      mockFetch.mockRejectedValueOnce(error1).mockRejectedValueOnce(error2);

      await expect(clientWithRetries.stream('/test', { data: 'test' })).rejects.toThrow(
        'Network error 2'
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use timeout when specified', async () => {
      const clientWithTimeout = new APIClient(
        'https://api.example.com',
        { 'Content-Type': 'application/json' },
        5000
      );

      const mockBody = new ReadableStream();

      // Clear any previous mocks
      mockFetch.mockReset();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockBody,
      } as Response);

      await clientWithTimeout.stream('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'test' }),
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('processStreamAsLines', () => {
    it('should process stream and yield lines', async () => {
      const mockData = new TextEncoder().encode('line1\nline2\nline3');
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(mockStream)) {
        lines.push(line);
      }

      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle partial lines and buffer correctly', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('partial'));
          controller.enqueue(new TextEncoder().encode('line\ncomplete\n'));
          controller.enqueue(new TextEncoder().encode('final'));
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(mockStream)) {
        lines.push(line);
      }

      expect(lines).toEqual(['partialline', 'complete', 'final']);
    });

    it('should handle empty stream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const lines: string[] = [];
      for await (const line of client.processStreamAsLines(mockStream)) {
        lines.push(line);
      }

      expect(lines).toEqual([]);
    });
  });

  describe('processStreamAsRaw', () => {
    it('should process stream and yield raw chunks', async () => {
      const mockData1 = new TextEncoder().encode('chunk1');
      const mockData2 = new TextEncoder().encode('chunk2');
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockData1);
          controller.enqueue(mockData2);
          controller.close();
        },
      });

      const chunks: string[] = [];
      for await (const chunk of client.processStreamAsRaw(mockStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1', 'chunk2']);
    });

    it('should handle empty chunks', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(''));
          controller.enqueue(new TextEncoder().encode('data'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      for await (const chunk of client.processStreamAsRaw(mockStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['data']);
    });
  });
});

describe('extractDataLines', () => {
  async function* createLineStream(lines: string[]): AsyncIterable<string> {
    for (const line of lines) {
      yield line;
    }
  }

  it('should extract data lines from SSE stream', async () => {
    const lines = [
      'event: message',
      'data: {"content": "hello"}',
      'data: {"content": "world"}',
      '',
      'data: ',
      'data: {"content": "end"}',
    ];

    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream(lines))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual([
      '{"content": "hello"}',
      '{"content": "world"}',
      '{"content": "end"}',
    ]);
  });

  it('should handle empty stream', async () => {
    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream([]))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual([]);
  });

  it('should filter out non-data lines', async () => {
    const lines = ['event: start', 'id: 123', 'retry: 1000', 'data: actual data', ': comment'];

    const dataLines: string[] = [];
    for await (const data of extractDataLines(createLineStream(lines))) {
      dataLines.push(data);
    }

    expect(dataLines).toEqual(['actual data']);
  });
});
