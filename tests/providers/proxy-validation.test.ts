import { createProxyProvider } from '../../src/providers/proxy';

describe('Proxy Provider Validation', () => {
  describe('createProxyProvider edge cases', () => {
    it('should handle missing baseURL', () => {
      expect(() => {
        createProxyProvider('openai', {
          apiKey: 'test-key',
        });
      }).toThrow('The `baseURL` option is required for `createProxy` and must be a string.');
    });

    it('should handle empty baseURL', () => {
      expect(() => {
        createProxyProvider('openai', {
          baseURL: '',
          apiKey: 'test-key',
        });
      }).toThrow('The `baseURL` option is required for `createProxy` and must be a string.');
    });

    it('should handle non-string baseURL', () => {
      expect(() => {
        createProxyProvider('openai', {
          baseURL: 123,
          apiKey: 'test-key',
        });
      }).toThrow('The `baseURL` option is required for `createProxy` and must be a string.');
    });

    it('should handle custom endpoint', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"delta": "test"}\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://example.com',
        endpoint: '/custom/endpoint',
        apiKey: 'test-key',
      });

      const chunks = [];
      for await (const chunk of proxy([
        { role: 'user', content: [{ type: 'text', text: 'test' }] },
      ])) {
        chunks.push(chunk);
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com/custom/endpoint',
        expect.any(Object)
      );
    });

    it('should handle various option types', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"delta": "test"}\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(mockStream));

      const proxy = createProxyProvider('openai', {
        baseURL: 'http://example.com',
        apiKey: 'test-key',
        timeout: 5000,
        maxRetries: 3,
        headers: { 'X-Custom': 'value' },
        mutateHeaders: (headers: Record<string, string>) => {
          headers['X-Dynamic'] = 'added';
        },
      });

      const chunks = [];
      for await (const chunk of proxy([
        { role: 'user', content: [{ type: 'text', text: 'test' }] },
      ])) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
    });
  });
});
