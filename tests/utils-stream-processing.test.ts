import {
  processStream,
  printStream,
  filterStream,
  mapStream,
  toReadableStream,
  type StreamChunk,
} from '@chinmaymk/aikit';

describe('Utils - Stream Processing', () => {
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

  describe('processStream', () => {
    it('should process stream with handlers', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      const onDelta = jest.fn();
      const result = await processStream(stream, { onDelta });

      expect(onDelta).toHaveBeenCalledWith('Hello');
      expect(onDelta).toHaveBeenCalledWith(' world');
      expect(result.content).toBe('Hello world');
    });

    it('should handle onFinish callback', async () => {
      const stream = createMockStream([{ delta: 'Test', content: 'Test', finishReason: 'stop' }]);

      const onFinish = jest.fn();
      await processStream(stream, { onFinish });

      expect(onFinish).toHaveBeenCalledWith('stop');
    });

    it('should handle onToolCalls callback', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const stream = createMockStream([
        { delta: 'Test', content: 'Test', toolCalls, finishReason: 'tool_use' },
      ]);

      const onToolCalls = jest.fn();
      await processStream(stream, { onToolCalls });

      expect(onToolCalls).toHaveBeenCalledWith(toolCalls);
    });

    it('should handle all callbacks together', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', toolCalls, finishReason: 'tool_use' },
      ]);

      const onDelta = jest.fn();
      const onFinish = jest.fn();
      const onToolCalls = jest.fn();

      const result = await processStream(stream, { onDelta, onFinish, onToolCalls });

      expect(onDelta).toHaveBeenCalledTimes(2);
      expect(onFinish).toHaveBeenCalledWith('tool_use');
      expect(onToolCalls).toHaveBeenCalledWith(toolCalls);
      expect(result.content).toBe('Hello world');
    });

    it('should handle onContent callback', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      const onContent = jest.fn();
      await processStream(stream, { onContent });

      expect(onContent).toHaveBeenCalledWith('Hello');
      expect(onContent).toHaveBeenCalledWith('Hello world');
    });

    it('should handle onChunk callback', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      const onChunk = jest.fn();
      await processStream(stream, { onChunk });

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({ delta: 'Hello', content: 'Hello' })
      );
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({ delta: ' world', content: 'Hello world', finishReason: 'stop' })
      );
    });

    it('should handle onReasoning callback', async () => {
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
          finishReason: 'stop',
        },
      ]);

      const onReasoning = jest.fn();
      await processStream(stream, { onReasoning });

      expect(onReasoning).toHaveBeenCalledWith({ content: 'Thinking...', delta: 'Thinking...' });
      expect(onReasoning).toHaveBeenCalledWith({ content: 'Thinking... more', delta: ' more' });
    });

    it('should handle onUsage callback', async () => {
      const stream = createMockStream([
        {
          delta: 'Hello',
          content: 'Hello',
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      const onUsage = jest.fn();
      await processStream(stream, { onUsage });

      expect(onUsage).toHaveBeenCalledWith({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
    });
  });

  describe('printStream', () => {
    it('should print deltas to stdout', async () => {
      const originalWrite = process.stdout.write;
      const mockWrite = jest.fn().mockReturnValue(true);
      process.stdout.write = mockWrite;

      try {
        const stream = createMockStream([
          { delta: 'Hello' },
          { delta: ' world', finishReason: 'stop' },
        ]);

        await printStream(stream);

        expect(mockWrite).toHaveBeenCalledWith('Hello');
        expect(mockWrite).toHaveBeenCalledWith(' world');
        expect(mockWrite).toHaveBeenCalledWith('\n');
      } finally {
        process.stdout.write = originalWrite;
      }
    });

    it('should handle empty stream', async () => {
      const originalWrite = process.stdout.write;
      const mockWrite = jest.fn().mockReturnValue(true);
      process.stdout.write = mockWrite;

      try {
        const stream = createMockStream([]);
        await printStream(stream);

        expect(mockWrite).toHaveBeenCalledWith('\n');
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('filterStream', () => {
    it('should filter chunks based on predicate', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: '', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
      ]);

      const filteredStream = filterStream(stream, chunk => chunk.delta !== '');
      const chunks = [];

      for await (const chunk of filteredStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('Hello');
      expect(chunks[1].delta).toBe(' world');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const filteredStream = filterStream(stream, () => true);
      const chunks = [];

      for await (const chunk of filteredStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });
  });

  describe('mapStream', () => {
    it('should transform chunks', async () => {
      const stream = createMockStream([
        { delta: 'hello', content: 'hello' },
        { delta: ' world', content: 'hello world' },
      ]);

      const mappedStream = mapStream(stream, chunk => ({
        ...chunk,
        delta: chunk.delta.toUpperCase(),
        content: chunk.content.toUpperCase(),
      }));

      const chunks = [];
      for await (const chunk of mappedStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('HELLO');
      expect(chunks[0].content).toBe('HELLO');
      expect(chunks[1].delta).toBe(' WORLD');
      expect(chunks[1].content).toBe('HELLO WORLD');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const mappedStream = mapStream(stream, chunk => chunk);
      const chunks = [];

      for await (const chunk of mappedStream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });
  });

  describe('toReadableStream', () => {
    it('should convert async iterable to ReadableStream', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      const readableStream = toReadableStream(stream);
      expect(readableStream).toBeInstanceOf(ReadableStream);

      const reader = readableStream.getReader();
      const chunks = [];

      try {
        let result = await reader.read();
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }
      } finally {
        reader.releaseLock();
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('Hello');
      expect(chunks[1].delta).toBe(' world');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const readableStream = toReadableStream(stream);
      const reader = readableStream.getReader();
      const chunks = [];

      try {
        let result = await reader.read();
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }
      } finally {
        reader.releaseLock();
      }

      expect(chunks).toHaveLength(0);
    });

    it('should handle stream errors', async () => {
      const errorStream = {
        async *[Symbol.asyncIterator]() {
          yield { delta: 'Hello', content: 'Hello' } as StreamChunk;
          throw new Error('Stream error');
        },
      };

      const readableStream = toReadableStream(errorStream);
      const reader = readableStream.getReader();

      try {
        await reader.read(); // First chunk should work
        await expect(reader.read()).rejects.toThrow('Stream error');
      } finally {
        reader.releaseLock();
      }
    });
  });
});
