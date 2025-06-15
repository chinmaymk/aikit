import { createProxyProvider, callProxyProvider } from '../../src/providers/proxy';
import { userText } from '../../src/utils';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

describe('Proxy Provider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createProxy', () => {
    it('should create proxy provider with correct configuration', () => {
      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      expect(proxy).toBeDefined();
      expect(typeof proxy).toBe('function');
    });

    it('should create proxy for different provider types', () => {
      const openaiProxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });
      const anthropicProxy = createProxyProvider('anthropic', {
        baseURL: 'http://localhost:3000',
        model: 'claude-3-5-sonnet-20241022',
      });
      const googleProxy = createProxyProvider('google', {
        baseURL: 'http://localhost:3000',
        model: 'gemini-1.5-pro',
      });
      const responsesProxy = createProxyProvider('openai_responses', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      expect(openaiProxy).toBeDefined();
      expect(anthropicProxy).toBeDefined();
      expect(googleProxy).toBeDefined();
      expect(responsesProxy).toBeDefined();
    });

    it('should handle minimal configuration', () => {
      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
      });

      expect(proxy).toBeDefined();
    });

    it('should handle full configuration with proxy options', () => {
      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        endpoint: '/custom-proxy',
        apiKey: 'test-key',
        timeout: 10000,
        headers: { 'X-Custom': 'value' },
        model: 'gpt-4o',
        temperature: 0.7,
      });

      expect(proxy).toBeDefined();
    });

    it('should throw an error if baseURL is not provided', () => {
      expect(() =>
        createProxyProvider('openai', {
          model: 'gpt-4o',
        })
      ).toThrow('The `baseURL` option is required for `createProxy` and must be a string.');
    });

    describe('end-to-end proxy integration', () => {
      it('should complete full proxy flow with successful response', async () => {
        const mockStreamResponse = [
          'data: {"type":"chunk","delta":"Hello"}',
          'data: {"type":"chunk","delta":" from"}',
          'data: {"type":"chunk","delta":" backend!"}',
          'data: [DONE]',
        ].join('\n');

        const mockStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(mockStreamResponse));
            controller.close();
          },
        });

        jest.spyOn(global, 'fetch').mockResolvedValue(
          new Response(mockStream, {
            status: 200,
            statusText: 'OK',
          })
        );

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
          apiKey: 'test-key',
          headers: { 'X-Client': 'test' },
          model: 'gpt-4o',
          temperature: 0.7,
        });

        const messages = [userText('Hello world!')];
        const options = { maxOutputTokens: 100 };

        const chunks = [];
        for await (const chunk of proxy(messages, options)) {
          chunks.push(chunk);
        }

        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toEqual({ type: 'chunk', delta: 'Hello' });
        expect(chunks[1]).toEqual({ type: 'chunk', delta: ' from' });
        expect(chunks[2]).toEqual({ type: 'chunk', delta: ' backend!' });

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/aikit/proxy',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-key',
              'X-Client': 'test',
            }),
            body: JSON.stringify({
              messages,
              providerType: 'openai',
              providerOptions: { model: 'gpt-4o', temperature: 0.7 },
              options: { maxOutputTokens: 100 },
            }),
          })
        );
      });

      it('should handle backend errors correctly', async () => {
        jest.spyOn(global, 'fetch').mockResolvedValue(
          new Response('Invalid request format', {
            status: 400,
            statusText: 'Bad Request',
          })
        );

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
          model: 'gpt-4o',
        });
        const messages = [userText('Test')];

        await expect(async () => {
          for await (const chunk of proxy(messages)) {
            // Should not reach here
          }
        }).rejects.toThrow('API error: 400 Bad Request - Invalid request format');
      });

      it('should handle invalid JSON in stream', async () => {
        const mockStreamResponse = [
          'data: {"type":"chunk","delta":"valid"}',
          'data: invalid-json-line',
          'data: {"type":"chunk","delta":"also valid"}',
          'data: [DONE]',
        ].join('\n');

        const mockStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(mockStreamResponse));
            controller.close();
          },
        });

        jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
        });
        const messages = [userText('Test')];

        const chunks = [];
        for await (const chunk of proxy(messages)) {
          chunks.push(chunk);
        }

        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toEqual({ type: 'chunk', delta: 'valid' });
        expect(chunks[1]).toEqual({ type: 'chunk', delta: 'also valid' });

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to parse streaming response:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should skip non-data lines in stream', async () => {
        const mockStreamResponse = [
          '',
          '   ',
          'event: start',
          'data: {"type":"chunk","delta":"content"}',
          'retry: 1000',
          'data: [DONE]',
        ].join('\n');

        const mockStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(mockStreamResponse));
            controller.close();
          },
        });

        jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
        });
        const messages = [userText('Test')];

        const chunks = [];
        for await (const chunk of proxy(messages)) {
          chunks.push(chunk);
        }

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toEqual({ type: 'chunk', delta: 'content' });
      });

      it('should handle baseURL with trailing slash', async () => {
        const mockStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: [DONE]\n'));
            controller.close();
          },
        });

        jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000/', // Note trailing slash
        });

        const messages = [userText('Test')];

        for await (const chunk of proxy(messages)) {
          // Just consume the stream
        }

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/aikit/proxy', // No double slash
          expect.any(Object)
        );
      });

      it('should handle custom endpoint', async () => {
        const mockStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: [DONE]\n'));
            controller.close();
          },
        });

        jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

        const proxy = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
          endpoint: '/custom-endpoint',
        });

        const messages = [userText('Test')];

        for await (const chunk of proxy(messages)) {
          // Just consume the stream
        }

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/custom-endpoint',
          expect.any(Object)
        );
      });

      it('should handle undefined options gracefully', async () => {
        const createMockStream = () =>
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode('data: [DONE]\n'));
              controller.close();
            },
          });

        const fetchSpy = jest
          .spyOn(global, 'fetch')
          .mockImplementation(() => Promise.resolve(new Response(createMockStream())));

        // Test with no provider options
        const proxy1 = createProxyProvider('openai', { baseURL: 'http://localhost:3000' });
        const messages = [userText('Test')];

        for await (const chunk of proxy1(messages)) {
          // Just consume the stream
        }

        expect(fetchSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              messages,
              providerType: 'openai',
              providerOptions: {},
              options: {},
            }),
          })
        );

        // Reset for next test
        fetchSpy.mockClear();

        // Test with no call options
        const proxy2 = createProxyProvider('openai', {
          baseURL: 'http://localhost:3000',
          model: 'gpt-4o',
        });

        for await (const chunk of proxy2(messages)) {
          // Just consume the stream
        }

        expect(fetchSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              messages,
              providerType: 'openai',
              providerOptions: { model: 'gpt-4o' },
              options: {},
            }),
          })
        );
      });
    });
  });
});
