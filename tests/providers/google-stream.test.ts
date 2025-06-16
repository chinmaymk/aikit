import { createGoogle } from '../../src/providers/google';
import type { Message } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Google Provider - Stream Processing', () => {
  const mockApiKey = 'test-api-key';
  const defaultOptions = {
    apiKey: mockApiKey,
    model: 'gemini-1.5-pro',
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Stream processing', () => {
    it('should handle chunks with usage only', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5}}\n\n'
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
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.usage)).toBe(true);
    });

    it('should handle chunks without candidates', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {"usageMetadata":{"promptTokenCount":10}}\n\n')
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
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Should still process the usage-only chunk
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle tool calls in response', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"test_tool","args":{"param":"value"}}}]},"finishReason":"STOP"}]}\n\n'
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
        { role: 'user', content: [{ type: 'text', text: 'use a tool' }] },
      ];

      const provider = createGoogle(defaultOptions);
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.toolCalls?.length)).toBe(true);
    });

    it('should handle unknown finish reason', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]},"finishReason":"UNKNOWN_REASON"}]}\n\n'
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
      const generator = provider(messages);
      const chunks = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.some(chunk => chunk.finishReason === 'stop')).toBe(true);
    });
  });

  describe('Configuration options', () => {
    it('should include stopSequences when provided', async () => {
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
        stopSequences: ['stop1', 'stop2'],
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"stopSequences":["stop1","stop2"]'),
        })
      );
    });

    it('should include all generation config options', async () => {
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
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1000,
        candidateCount: 1,
        presencePenalty: 0.1,
        frequencyPenalty: 0.2,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
        seed: 123,
        responseLogprobs: true,
        logprobs: 5,
      });

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.8'),
        })
      );
    });
  });
});
