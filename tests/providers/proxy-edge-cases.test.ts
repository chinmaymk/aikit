import { createProxyProvider } from '../../src/providers/proxy';
import { userText } from '../../src/utils';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

describe('Proxy Provider Edge Cases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('proxy error handling edge cases', () => {
    it('should handle fetch failures gracefully', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

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
      }).rejects.toThrow('Network error');
    });

    it('should handle different header types', async () => {
      // Test with array headers (should be ignored)
      const mockStream1 = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockStream1));

      const proxyWithArrayHeaders = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        headers: ['invalid', 'array'],
        model: 'gpt-4o',
      });

      const chunks1 = [];
      for await (const chunk of proxyWithArrayHeaders([userText('test')])) {
        chunks1.push(chunk);
      }

      // Test with non-object headers (should be ignored)
      const mockStream2 = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockStream2));

      const proxyWithStringHeaders = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        headers: 'invalid-string',
        model: 'gpt-4o',
      });

      const chunks2 = [];
      for await (const chunk of proxyWithStringHeaders([userText('test')])) {
        chunks2.push(chunk);
      }

      expect(chunks1).toEqual([]);
      expect(chunks2).toEqual([]);
    });

    it('should handle different apiKey types', async () => {
      // Test with non-string apiKey (should not add Authorization header)
      const mockStream1 = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockStream1));

      const proxyWithNumberKey = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        apiKey: 123,
        model: 'gpt-4o',
      });

      const chunks1 = [];
      for await (const chunk of proxyWithNumberKey([userText('test')])) {
        chunks1.push(chunk);
      }

      // Test with empty string apiKey (should not add Authorization header)
      const mockStream2 = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(mockStream2));

      const proxyWithEmptyKey = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        apiKey: '',
        model: 'gpt-4o',
      });

      const chunks2 = [];
      for await (const chunk of proxyWithEmptyKey([userText('test')])) {
        chunks2.push(chunk);
      }

      expect(chunks1).toEqual([]);
      expect(chunks2).toEqual([]);
    });

    it('should handle different timeout and maxRetries types', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      // Test with non-number timeout and maxRetries
      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        timeout: 'invalid',
        maxRetries: 'invalid',
        model: 'gpt-4o',
      });

      const chunks = [];
      for await (const chunk of proxy([userText('test')])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });

    it('should handle non-function mutateHeaders', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://localhost:3000',
        mutateHeaders: 'not-a-function',
        model: 'gpt-4o',
      });

      const chunks = [];
      for await (const chunk of proxy([userText('test')])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });
  });
});
