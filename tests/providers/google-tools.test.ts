import { createGoogle } from '../../src/providers/google';
import type { Message } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Google Provider - Tool Choice', () => {
  const mockApiKey = 'test-api-key';
  const defaultOptions = {
    apiKey: mockApiKey,
    model: 'gemini-1.5-pro',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Tool choice formatting', () => {
    it('should format toolChoice as required', async () => {
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

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages, {
        tools: [{ name: 'test_tool', description: 'A test tool', parameters: {} }],
        toolChoice: 'required',
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"ANY"'),
        })
      );
    });

    it('should format toolChoice as auto', async () => {
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

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages, {
        tools: [{ name: 'test_tool', description: 'A test tool', parameters: {} }],
        toolChoice: 'auto',
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"AUTO"'),
        })
      );
    });

    it('should format toolChoice as none', async () => {
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

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages, {
        tools: [{ name: 'test_tool', description: 'A test tool', parameters: {} }],
        toolChoice: 'none',
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"mode":"NONE"'),
        })
      );
    });

    it('should format toolChoice with specific function name', async () => {
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

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages, {
        tools: [{ name: 'specific_tool', description: 'A specific tool', parameters: {} }],
        toolChoice: { name: 'specific_tool' },
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"allowedFunctionNames":["specific_tool"]'),
        })
      );
    });

    it('should not include toolConfig for undefined toolChoice', async () => {
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

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages, {
        tools: [{ name: 'test_tool', description: 'A test tool', parameters: {} }],
        toolChoice: undefined,
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // When toolChoice is undefined, no toolConfig should be included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.not.stringContaining('"toolConfig"'),
        })
      );
    });
  });
});
