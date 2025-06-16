import { collectDeltas, collectStream, type StreamChunk } from '@chinmaymk/aikit';

describe('Utils - Stream Utilities', () => {
  const createMockStream = (chunks: Partial<StreamChunk>[]): AsyncIterable<StreamChunk> => {
    return {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield {
            delta: '',
            content: '',
            finishReason: undefined,
            toolCalls: undefined,
            ...chunk,
          } as StreamChunk;
        }
      },
    };
  };

  describe('collectDeltas', () => {
    it('should accumulate deltas', async () => {
      const stream = createMockStream([
        { delta: 'Hello' },
        { delta: ' world' },
        { delta: '!', finishReason: 'stop' },
      ]);

      const result = await collectDeltas(stream);
      expect(result.content).toBe('Hello world!');
      expect(result.finishReason).toBe('stop');
    });

    it('should handle tool calls in deltas', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const stream = createMockStream([
        { delta: 'Hello' },
        { delta: ' world', toolCalls, finishReason: 'tool_use' },
      ]);

      const result = await collectDeltas(stream);
      expect(result.content).toBe('Hello world');
      expect(result.toolCalls).toEqual(toolCalls);
      expect(result.finishReason).toBe('tool_use');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const result = await collectDeltas(stream);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeUndefined();
      expect(result.toolCalls).toBeUndefined();
    });
  });

  describe('collectStream', () => {
    it('should use accumulated content from chunks', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
        { delta: '!', content: 'Hello world!', finishReason: 'stop' },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Hello world!');
      expect(result.finishReason).toBe('stop');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const result = await collectStream(stream);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeUndefined();
    });

    it('should use last content if available', async () => {
      const stream = createMockStream([
        { delta: 'Hi', content: 'Hi' },
        { delta: '', content: 'Hi there', finishReason: 'stop' },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Hi there');
    });

    it('should handle tool calls', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const stream = createMockStream([
        { delta: 'Calling tool', content: 'Calling tool' },
        { delta: '', content: 'Calling tool', toolCalls, finishReason: 'tool_use' },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Calling tool');
      expect(result.toolCalls).toEqual(toolCalls);
      expect(result.finishReason).toBe('tool_use');
    });

    it('should handle chunks with reasoning content', async () => {
      const stream = createMockStream([
        {
          delta: 'Hello',
          content: 'Hello',
          reasoning: { content: 'Thinking...', delta: 'Thinking...' },
        },
        {
          delta: ' world',
          content: 'Hello world',
          reasoning: { content: 'Thinking... more', delta: ' more' },
        },
        { delta: '', content: 'Hello world', finishReason: 'stop' },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Hello world');
      expect(result.reasoning).toBe('Thinking... more');
      expect(result.finishReason).toBe('stop');
    });
  });
});
