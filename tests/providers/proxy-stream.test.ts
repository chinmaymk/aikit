import { createProxyProvider } from '../../src/providers/proxy';
import { userText } from '../../src/utils';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

describe('Proxy Provider Stream Handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('stream processing edge cases', () => {
    it('should handle lines that do not start with data:', async () => {
      const mockStreamResponse = [
        'event: start',
        'data: {"type":"chunk","delta":"test"}',
        'invalid line',
        'data: [DONE]',
      ].join('\n');

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockStreamResponse));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      const chunks = [];
      for await (const chunk of proxy([userText('test')])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ type: 'chunk', delta: 'test' });
    });

    it('should handle empty lines in stream', async () => {
      const mockStreamResponse = [
        '',
        'data: {"type":"chunk","delta":"test"}',
        '',
        'data: [DONE]',
      ].join('\n');

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockStreamResponse));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      const chunks = [];
      for await (const chunk of proxy([userText('test')])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ type: 'chunk', delta: 'test' });
    });

    it('should handle response stream reading errors', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream read error'));
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      const messages = [userText('Test')];

      await expect(async () => {
        for await (const chunk of proxy(messages)) {
          // Should not reach here
          void chunk;
        }
      }).rejects.toThrow('Stream read error');
    });

    it('should handle empty stream response', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        model: 'gpt-4o',
      });

      const messages = [userText('Test')];

      const chunks = [];
      for await (const chunk of proxy(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });
  });
});
