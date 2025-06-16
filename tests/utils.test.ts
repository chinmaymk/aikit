import { generate, executeToolCall } from '../src/utils';
import type { Message, StreamChunk, ToolCall, AnyGenerationProvider } from '../src/types';

describe('utils', () => {
  describe('generate', () => {
    it('should collect stream from provider', async () => {
      const mockStreamChunk: StreamChunk = {
        content: 'Hello, world!',
        delta: 'Hello, world!',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      };

      const mockProvider: AnyGenerationProvider = async function* () {
        yield mockStreamChunk;
      };

      const result = await generate(mockProvider, [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);

      expect(result.content).toBe('Hello, world!');
      expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
    });

    it('should pass options to provider', async () => {
      const mockProvider = jest.fn(async function* (_: Message[], options: any) {
        expect(options.temperature).toBe(0.7);
        expect(options.maxOutputTokens).toBe(100);
        yield { content: 'response', delta: 'response' };
      }) as AnyGenerationProvider;

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      await generate(mockProvider, messages, { temperature: 0.7, maxOutputTokens: 100 });

      expect(mockProvider).toHaveBeenCalledWith(messages, {
        temperature: 0.7,
        maxOutputTokens: 100,
      });
    });

    it('should handle empty options', async () => {
      const mockProvider = jest.fn(async function* (_: Message[], options: any) {
        expect(options).toEqual({});
        yield { content: 'response', delta: 'response' };
      }) as AnyGenerationProvider;

      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      await generate(mockProvider, messages);

      expect(mockProvider).toHaveBeenCalledWith(messages, {});
    });

    it('should handle provider errors', async () => {
      const mockProvider: AnyGenerationProvider = async function* () {
        throw new Error('Provider error');
        yield { content: '', delta: '' };
      };

      await expect(
        generate(mockProvider, [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }])
      ).rejects.toThrow('Provider error');
    });
  });

  describe('executeToolCall', () => {
    it('should execute tool function with correct arguments', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'calculator',
        arguments: { a: 5, b: 3 },
      };

      const selector = (toolName: string) => {
        if (toolName === 'calculator') {
          return (args: { a: number; b: number }) => args.a + args.b;
        }
        return undefined;
      };

      const result = executeToolCall(toolCall, selector);
      expect(result).toBe(8);
    });

    it('should throw error when tool function not found', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'unknown_tool',
        arguments: { a: 5, b: 3 },
      };

      const selector = (toolName: string) => {
        if (toolName === 'calculator') {
          return (args: any) => args.a + args.b;
        }
        return undefined;
      };

      expect(() => executeToolCall(toolCall, selector)).toThrow(
        'No function found for tool: unknown_tool'
      );
    });

    it('should handle complex tool arguments', () => {
      const toolCall: ToolCall = {
        id: 'call_456',
        name: 'processData',
        arguments: {
          data: [1, 2, 3, 4, 5],
          operation: 'sum',
          options: { includeAverage: true },
        },
      };

      const selector = (toolName: string) => {
        if (toolName === 'processData') {
          return (args: {
            data: number[];
            operation: string;
            options: { includeAverage: boolean };
          }) => {
            const sum = args.data.reduce((acc, val) => acc + val, 0);
            if (args.options.includeAverage) {
              return { sum, average: sum / args.data.length };
            }
            return { sum };
          };
        }
        return undefined;
      };

      const result = executeToolCall(toolCall, selector);
      expect(result).toEqual({ sum: 15, average: 3 });
    });

    it('should handle tool with no arguments', () => {
      const toolCall: ToolCall = {
        id: 'call_789',
        name: 'getCurrentTime',
        arguments: {},
      };

      const selector = (toolName: string) => {
        if (toolName === 'getCurrentTime') {
          return () => new Date('2023-01-01').toISOString();
        }
        return undefined;
      };

      const result = executeToolCall(toolCall, selector);
      expect(result).toBe('2023-01-01T00:00:00.000Z');
    });

    it('should handle tool function that returns void', () => {
      const toolCall: ToolCall = {
        id: 'call_void',
        name: 'logMessage',
        arguments: { message: 'test' },
      };

      const selector = (toolName: string) => {
        if (toolName === 'logMessage') {
          return (args: { message: string }) => {
            console.log(args.message);
          };
        }
        return undefined;
      };

      const result = executeToolCall(toolCall, selector);
      expect(result).toBeUndefined();
    });
  });
});
