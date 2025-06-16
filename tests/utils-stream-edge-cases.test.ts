import { printStream, toReadableStream, type StreamChunk } from '@chinmaymk/aikit';

describe('Stream utilities edge cases', () => {
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

  describe('printStream in non-Node.js environment', () => {
    it('should handle non-Node.js environment', async () => {
      // Mock non-Node.js environment
      const originalProcess = global.process;
      delete (global as any).process;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world' },
      ]);

      const result = await printStream(stream);
      expect(result.content).toBe('Hello world');
      expect(consoleSpy).toHaveBeenCalledWith('Hello');
      expect(consoleSpy).toHaveBeenCalledWith(' world');

      consoleSpy.mockRestore();
      global.process = originalProcess;
    });
  });

  describe('flushOutput edge cases', () => {
    it('should handle stdout drain events', async () => {
      const originalWrite = process.stdout.write;
      let drainCallback: (() => void) | null = null;

      // Mock stdout.write to return false (indicating buffer is full)
      process.stdout.write = jest.fn().mockImplementation((chunk: any) => {
        if (chunk === '\n') {
          return false; // Simulate buffer full
        }
        return true;
      });

      // Mock stdout.once to capture the drain callback
      const originalOnce = process.stdout.once;
      process.stdout.once = jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'drain') {
          drainCallback = callback;
        }
        return process.stdout;
      });

      const stream = createMockStream([{ delta: 'test', content: 'test' }]);

      // Start the printStream operation
      const printPromise = printStream(stream);

      // Simulate the drain event after a short delay
      setTimeout(() => {
        if (drainCallback) {
          drainCallback();
        }
      }, 10);

      const result = await printPromise;
      expect(result.content).toBe('test');

      // Restore original methods
      process.stdout.write = originalWrite;
      process.stdout.once = originalOnce;
    });

    it('should handle timeout in flushOutput', async () => {
      const originalWrite = process.stdout.write;

      // Mock stdout.write to return false for newline
      process.stdout.write = jest.fn().mockImplementation((chunk: any) => {
        if (chunk === '\n') {
          return false; // Simulate buffer full
        }
        return true;
      });

      // Mock stdout.once to never call the drain callback (simulate timeout)
      const originalOnce = process.stdout.once;
      process.stdout.once = jest.fn().mockImplementation(() => process.stdout);

      const originalRemoveListener = process.stdout.removeListener;
      process.stdout.removeListener = jest.fn().mockImplementation(() => process.stdout);

      const stream = createMockStream([{ delta: 'test', content: 'test' }]);

      const result = await printStream(stream);
      expect(result.content).toBe('test');

      // Restore original methods
      process.stdout.write = originalWrite;
      process.stdout.once = originalOnce;
      process.stdout.removeListener = originalRemoveListener;
    });
  });

  describe('toReadableStream edge cases', () => {
    it('should handle errors in stream iteration', async () => {
      const errorStream = {
        async *[Symbol.asyncIterator]() {
          yield 'first';
          throw new Error('Stream error');
        },
      };

      const readableStream = toReadableStream(errorStream);
      const reader = readableStream.getReader();

      // Should get the first value
      const first = await reader.read();
      expect(first.value).toBe('first');
      expect(first.done).toBe(false);

      // Should get the error
      await expect(reader.read()).rejects.toThrow('Stream error');
    });

    it('should handle stream cancellation', async () => {
      let returnCalled = false;
      const cancellableStream = {
        async *[Symbol.asyncIterator]() {
          try {
            yield 'first';
            yield 'second';
          } finally {
            // This should be called when the stream is cancelled
          }
        },
        async return() {
          returnCalled = true;
          return { done: true, value: undefined };
        },
      };

      // Add return method to the iterator
      const originalIterator = cancellableStream[Symbol.asyncIterator];
      cancellableStream[Symbol.asyncIterator] = function () {
        const iterator = originalIterator.call(this);
        iterator.return = async () => {
          returnCalled = true;
          return { done: true, value: undefined };
        };
        return iterator;
      };

      const readableStream = toReadableStream(cancellableStream);
      const reader = readableStream.getReader();

      // Read first value
      const first = await reader.read();
      expect(first.value).toBe('first');

      // Cancel the stream
      await reader.cancel();

      // The return method should have been called
      expect(returnCalled).toBe(true);
    });

    it('should handle stream without return method', async () => {
      const simpleStream = {
        async *[Symbol.asyncIterator]() {
          yield 'first';
          yield 'second';
        },
      };

      const readableStream = toReadableStream(simpleStream);
      const reader = readableStream.getReader();

      // Read first value
      const first = await reader.read();
      expect(first.value).toBe('first');

      // Cancel should not throw even without return method
      await expect(reader.cancel()).resolves.toBeUndefined();
    });
  });
});
