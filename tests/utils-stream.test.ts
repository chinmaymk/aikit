import {
  collectDeltas,
  collectStream,
  processStream,
  printStream,
  filterStream,
  mapStream,
  toReadableStream,
  type StreamChunk,
} from '@chinmaymk/aikit';

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
  });

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
  });

  describe('filterStream', () => {
    it('should filter stream chunks', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
        { delta: '!', content: 'Hello world!' },
      ]);

      const filtered = filterStream(stream, chunk => chunk.delta.length > 0);
      const chunks = [];
      for await (const chunk of filtered) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
    });

    it('should filter out empty deltas', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: '', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
      ]);

      const filtered = filterStream(stream, chunk => chunk.delta !== '');
      const chunks = [];
      for await (const chunk of filtered) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('Hello');
      expect(chunks[1].delta).toBe(' world');
    });
  });

  describe('mapStream', () => {
    it('should transform stream chunks', async () => {
      const stream = createMockStream([
        { delta: 'hello', content: 'hello' },
        { delta: ' world', content: 'hello world' },
      ]);

      const mapped = mapStream(stream, chunk => ({
        ...chunk,
        delta: chunk.delta.toUpperCase(),
      }));

      const chunks = [];
      for await (const chunk of mapped) {
        chunks.push(chunk);
      }

      expect(chunks[0].delta).toBe('HELLO');
      expect(chunks[1].delta).toBe(' WORLD');
    });
  });

  describe('printStream', () => {
    async function* createMockStream(
      chunks: { delta: string; content: string; finishReason?: 'stop' }[]
    ) {
      for (const chunk of chunks) {
        yield chunk;
      }
    }

    it('should print stream to stdout', async () => {
      const originalWrite = process.stdout.write;
      const originalLog = console.log;
      const mockWrite = jest.fn().mockReturnValue(true);
      const mockLog = jest.fn();

      // Mock both process.stdout.write (Node.js) and console.log (browser/fallback)
      process.stdout.write = mockWrite;
      console.log = mockLog;

      try {
        const chunks = [
          { delta: 'Hello', content: 'Hello' },
          { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
        ];

        await printStream(createMockStream(chunks));

        // In Node.js environment, should use process.stdout.write
        expect(mockWrite).toHaveBeenCalledWith('Hello');
        expect(mockWrite).toHaveBeenCalledWith(' world');
        expect(mockWrite).toHaveBeenCalledWith('\n'); // Final newline from flush
      } finally {
        process.stdout.write = originalWrite;
        console.log = originalLog;
      }
    });
  });

  describe('toReadableStream', () => {
    it('should convert async iterable to ReadableStream', () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
      ]);

      const readableStream = toReadableStream(stream);
      expect(readableStream).toBeInstanceOf(ReadableStream);
    });

    it('should handle stream reading', async () => {
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
      ]);

      const readableStream = toReadableStream(stream);
      const reader = readableStream.getReader();

      const chunk1 = await reader.read();
      expect(chunk1.done).toBe(false);
      expect(chunk1.value?.delta).toBe('Hello');

      const chunk2 = await reader.read();
      expect(chunk2.done).toBe(false);
      expect(chunk2.value?.delta).toBe(' world');

      const chunk3 = await reader.read();
      expect(chunk3.done).toBe(true);
    });
  });
});
