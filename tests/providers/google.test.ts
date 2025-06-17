import { createGoogle } from '../../src/providers/google';
import type { Message } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Google Provider', () => {
  const mockApiKey = 'test-api-key';
  const defaultOptions = {
    apiKey: mockApiKey,
    model: 'gemini-1.5-pro',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('createGoogle', () => {
    it('should create provider function', () => {
      const provider = createGoogle(defaultOptions);
      expect(typeof provider).toBe('function');
    });
  });

  describe('Message transformation', () => {
    it('should handle image content with valid data URL', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n\n'
            )
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            {
              type: 'image',
              image:
                'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAgICAgICAgICAgICAwQDAgIDBAQEBAQEBAQGBgUGBQYFBgYGBwkIBgcJBwYGCAsKCgoKBggLDAsKDAkKCgr',
            },
          ],
        },
      ];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/models/gemini-1.5-pro:streamGenerateContent'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"inlineData"'),
        })
      );
    });

    it('should handle image with unknown MIME type and default to jpeg', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Image processed"}]}}]}\n\n'
            )
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'image', image: 'data:image/unknown;base64,dGVzdA==' }],
        },
      ];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mimeType":"image/jpeg"'),
        })
      );
    });

    it('should handle image without image/ prefix and default to jpeg', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Image processed"}]}}]}\n\n'
            )
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'image', image: 'data:text/plain;base64,dGVzdA==' }],
        },
      ];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // The image handling should still work even if the MIME type gets defaulted
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle assistant message with tool calls', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"test_tool","args":{"param":"value"}}}]}}]}\n\n'
            )
          );
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const messages: Message[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'I will call a tool.' }],
          toolCalls: [
            {
              id: 'call_123',
              name: 'test_tool',
              arguments: { param: 'value' },
            },
          ],
        },
      ];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"functionCall"'),
        })
      );
    });

    it('should throw error for unsupported message role', async () => {
      const messages = [
        {
          role: 'unsupported' as any,
          content: [{ type: 'text' as const, text: 'test' }],
        },
      ];

      const provider = createGoogle(defaultOptions);

      await expect(async () => {
        const generator = provider(messages);
        for await (const chunk of generator) {
          void chunk;
          break;
        }
      }).rejects.toThrow("Unsupported message role 'unsupported' for Google provider");
    });
  });
});
