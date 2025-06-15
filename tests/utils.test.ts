import {
  userText,
  systemText,
  assistantText,
  userImage,
  userMultipleImages,
  userContent,
  assistantWithToolCalls,
  toolResult,
  textContent,
  imageContent,
  toolResultContent,
  createTool,
  conversation,
  ConversationBuilder,
  collectDeltas,
  collectStream,
  processStream,
  printStream,
  filterStream,
  mapStream,
  toReadableStream,
  generate,
  executeToolCall,
  type Content,
  type StreamChunk,
} from '@chinmaymk/aikit';

describe('Utils', () => {
  describe('Message Creation Helpers', () => {
    it('should create user messages', () => {
      expect(userText('Hello')).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });

    it('should create system messages', () => {
      expect(systemText('You are helpful')).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are helpful' }],
      });
    });

    it('should create assistant messages', () => {
      expect(assistantText('How can I help?')).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'How can I help?' }],
      });
    });

    it('should create user messages with images', () => {
      expect(userImage('What is this?', 'image_data')).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', image: 'image_data' },
        ],
      });
    });

    it('should create user messages with multiple images', () => {
      const images = ['img1', 'img2'];
      expect(userMultipleImages('Compare', images)).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'Compare' },
          { type: 'image', image: 'img1' },
          { type: 'image', image: 'img2' },
        ],
      });
    });

    it('should create messages with custom content', () => {
      const content: Content[] = [{ type: 'text', text: 'Hello' }];
      expect(userContent(content)).toEqual({
        role: 'user',
        content,
      });
    });

    it('should create assistant messages with tool calls', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: {} }];
      expect(assistantWithToolCalls('Let me check', toolCalls)).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'Let me check' }],
        toolCalls,
      });
    });

    it('should create tool result messages', () => {
      expect(toolResult('call_123', 'result')).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_123',
            result: 'result',
          },
        ],
      });
    });
  });

  describe('Content Creation Helpers', () => {
    it('should create text content', () => {
      expect(textContent('Hello')).toEqual({
        type: 'text',
        text: 'Hello',
      });
    });

    it('should create image content', () => {
      expect(imageContent('image_data')).toEqual({
        type: 'image',
        image: 'image_data',
      });
    });

    it('should create tool result content', () => {
      expect(toolResultContent('call_123', 'result')).toEqual({
        type: 'tool_result',
        toolCallId: 'call_123',
        result: 'result',
      });
    });
  });

  describe('Tool Creation', () => {
    it('should create tools with parameters', () => {
      const parameters = {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      };

      expect(createTool('get_weather', 'Get weather', parameters)).toEqual({
        name: 'get_weather',
        description: 'Get weather',
        parameters,
      });
    });

    it('should work with simple parameters', () => {
      const parameters = {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: [],
      };
      expect(createTool('search', 'Search', parameters)).toEqual({
        name: 'search',
        description: 'Search',
        parameters,
      });
    });
  });

  describe('Conversation Builder', () => {
    let builder: ConversationBuilder;

    beforeEach(() => {
      builder = new ConversationBuilder();
    });

    it('should build empty conversation', () => {
      expect(builder.build()).toEqual([]);
    });

    it('should add messages and chain operations', () => {
      const messages = builder
        .system('You are helpful')
        .user('Hello')
        .assistant('Hi there!')
        .build();

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
    });

    it('should add tool results', () => {
      const messages = builder.tool('call_123', 'result').build();
      expect(messages[0].role).toBe('tool');
    });

    it('should clear conversation', () => {
      builder.user('Hello');
      expect(builder.build()).toHaveLength(1);

      builder.clear();
      expect(builder.build()).toHaveLength(0);
    });

    it('should return different arrays on multiple builds', () => {
      builder.user('Hello');
      const messages1 = builder.build();
      const messages2 = builder.build();

      expect(messages1).toEqual(messages2);
      expect(messages1).not.toBe(messages2);
    });

    it('should add user message with image', () => {
      const messages = builder
        .userWithImage('Describe this', 'data:image/png;base64,abc123')
        .build();
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toHaveLength(2);
      expect(messages[0].content[0].type).toBe('text');
      expect(messages[0].content[1].type).toBe('image');
    });

    it('should add custom message', () => {
      const customMessage = {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Custom message' }],
      };
      const messages = builder.addMessage(customMessage).build();
      expect(messages[0]).toEqual(customMessage);
    });
  });

  describe('Conversation Factory', () => {
    it('should create new ConversationBuilder', () => {
      expect(conversation()).toBeInstanceOf(ConversationBuilder);
    });
  });

  describe('Stream Functions', () => {
    async function* createMockStream(
      chunks: { delta: string; content: string; finishReason?: 'stop' }[]
    ) {
      for (const chunk of chunks) {
        yield chunk;
      }
    }

    it('should collect deltas correctly', async () => {
      const chunks = [
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
      ];

      const result = await collectDeltas(createMockStream(chunks));

      expect(result).toEqual({
        content: 'Hello world',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should process stream with handlers', async () => {
      const chunks = [
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
      ];

      const onDelta = jest.fn();
      const result = await processStream(createMockStream(chunks), { onDelta });

      expect(onDelta).toHaveBeenCalledWith('Hello');
      expect(onDelta).toHaveBeenCalledWith(' world');
      expect(result.content).toBe('Hello world');
    });

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
});

describe('Stream Utilities', () => {
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

    it('should handle reasoning content correctly', async () => {
      const stream = createMockStream([
        {
          delta: 'Hello',
          content: 'Hello',
          reasoning: { delta: 'Let me think...', content: 'Let me think...' },
        },
        {
          delta: ' world',
          content: 'Hello world',
          reasoning: { delta: ' about this.', content: 'Let me think... about this.' },
        },
        {
          delta: '!',
          content: 'Hello world!',
          reasoning: { delta: ' Done!', content: 'Let me think... about this. Done!' },
          finishReason: 'stop',
        },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Hello world!');
      expect(result.reasoning).toBe('Let me think... about this. Done!');
      expect(result.finishReason).toBe('stop');
    });

    it('should handle tool calls', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', toolCalls, finishReason: 'tool_use' },
      ]);

      const result = await collectStream(stream);
      expect(result.content).toBe('Hello world');
      expect(result.toolCalls).toEqual(toolCalls);
      expect(result.finishReason).toBe('tool_use');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const result = await collectStream(stream);
      expect(result.content).toBe('');
      expect(result.finishReason).toBeUndefined();
      expect(result.toolCalls).toBeUndefined();
      expect(result.reasoning).toBeUndefined();
    });

    it('should differ from collectDeltas when content accumulation is broken', async () => {
      // Edge case: provider incorrectly resets content
      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: ' world' }, // Broken provider resets content
        { delta: '!', content: ' world!', finishReason: 'stop' },
      ]);

      const resultDeltas = await collectDeltas(stream);
      const resultStream = await collectStream(
        createMockStream([
          { delta: 'Hello', content: 'Hello' },
          { delta: ' world', content: ' world' },
          { delta: '!', content: ' world!', finishReason: 'stop' },
        ])
      );

      // collectDeltas accumulates deltas: "Hello world!"
      expect(resultDeltas.content).toBe('Hello world!');

      // collectStream uses last accumulated content: " world!"
      expect(resultStream.content).toBe(' world!');
    });
  });

  describe('processStream', () => {
    it('should call handlers for each event', async () => {
      const handlers = {
        onDelta: jest.fn(),
        onContent: jest.fn(),
        onFinish: jest.fn(),
        onChunk: jest.fn(),
      };

      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' },
      ]);

      await processStream(stream, handlers);

      expect(handlers.onDelta).toHaveBeenCalledWith('Hello');
      expect(handlers.onDelta).toHaveBeenCalledWith(' world');
      expect(handlers.onContent).toHaveBeenCalledWith('Hello');
      expect(handlers.onContent).toHaveBeenCalledWith('Hello world');
      expect(handlers.onFinish).toHaveBeenCalledWith('stop');
      expect(handlers.onChunk).toHaveBeenCalledTimes(2);
    });

    it('should handle reasoning content correctly', async () => {
      const onReasoning = jest.fn();

      const stream = createMockStream([
        {
          delta: 'Hello',
          content: 'Hello',
          reasoning: { delta: 'Think...', content: 'Think...' },
        },
        {
          delta: ' world',
          content: 'Hello world',
          reasoning: { delta: ' more.', content: 'Think... more.' },
        },
        {
          delta: '!',
          content: 'Hello world!',
          reasoning: { delta: ' Done!', content: 'Think... more. Done!' },
          finishReason: 'stop',
        },
      ]);

      const result = await processStream(stream, { onReasoning });

      // Verify reasoning handler received accumulated content
      expect(onReasoning).toHaveBeenCalledTimes(3);
      expect(onReasoning).toHaveBeenNthCalledWith(1, { content: 'Think...', delta: 'Think...' });
      expect(onReasoning).toHaveBeenNthCalledWith(2, {
        content: 'Think... more.',
        delta: ' more.',
      });
      expect(onReasoning).toHaveBeenNthCalledWith(3, {
        content: 'Think... more. Done!',
        delta: ' Done!',
      });

      // Verify final result has correct reasoning
      expect(result.reasoning).toBe('Think... more. Done!');
    });
  });

  describe('filterStream', () => {
    it('should filter chunks based on predicate', async () => {
      const stream = createMockStream([
        { delta: 'a', content: 'a' },
        { delta: 'b', content: 'ab' },
        { delta: 'c', content: 'abc' },
      ]);

      const filtered = filterStream(stream, chunk => chunk.delta !== 'b');
      const chunks: StreamChunk[] = [];
      for await (const chunk of filtered) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('a');
      expect(chunks[1].delta).toBe('c');
    });
  });

  describe('mapStream', () => {
    it('should transform chunks', async () => {
      const stream = createMockStream([{ delta: 'hello' }, { delta: 'world' }]);

      const mapped = mapStream(stream, (chunk: StreamChunk) => chunk.delta.toUpperCase());
      const results: string[] = [];
      for await (const result of mapped) {
        results.push(result);
      }

      expect(results).toEqual(['HELLO', 'WORLD']);
    });
  });

  describe('toReadableStream', () => {
    it('should convert async iterable to ReadableStream', async () => {
      const data = ['chunk1', 'chunk2', 'chunk3'];
      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          for (const item of data) {
            yield item;
          }
        },
      };

      const readableStream = toReadableStream(asyncIterable);
      expect(readableStream).toBeInstanceOf(ReadableStream);

      const reader = readableStream.getReader();
      const chunks = [];

      let result = await reader.read();
      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      expect(chunks).toEqual(data);
    });

    it('should handle stream cancellation properly', async () => {
      let returnCalled = false;
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: 'test1', delta: 'test1' };
          yield { content: 'test2', delta: 'test2' };
        },
      };

      // Mock the iterator with a return method
      const originalIterator = mockStream[Symbol.asyncIterator];
      mockStream[Symbol.asyncIterator] = function () {
        const iterator = originalIterator.call(this);
        iterator.return = async () => {
          returnCalled = true;
          return { done: true, value: undefined };
        };
        return iterator;
      };

      const readableStream = toReadableStream(mockStream);
      const reader = readableStream.getReader();

      // Read one chunk then cancel
      await reader.read();
      await reader.cancel();

      expect(returnCalled).toBe(true);
    });

    it('should handle iterator without return method', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { content: 'test', delta: 'test' };
        },
      };

      const readableStream = toReadableStream(mockStream);
      const reader = readableStream.getReader();

      await reader.read();
      // This should not throw even if iterator doesn't have return method
      await reader.cancel();
    });

    it('should handle errors in the stream', async () => {
      const error = new Error('Stream error');
      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          yield 'chunk1';
          throw error;
        },
      };

      const readableStream = toReadableStream(asyncIterable);
      const reader = readableStream.getReader();

      const result1 = await reader.read();
      expect(result1.value).toBe('chunk1');

      await expect(reader.read()).rejects.toThrow('Stream error');
    });
  });

  describe('processStream edge cases', () => {
    it('should handle stream with tool calls and all handlers', async () => {
      const toolCalls = [{ id: 'call_123', name: 'test', arguments: {} }];
      const handlers = {
        onDelta: jest.fn(),
        onContent: jest.fn(),
        onToolCalls: jest.fn(),
        onFinish: jest.fn(),
        onChunk: jest.fn(),
      };

      const stream = createMockStream([
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', toolCalls, finishReason: 'tool_use' },
      ]);

      const result = await processStream(stream, handlers);

      expect(handlers.onToolCalls).toHaveBeenCalledWith(toolCalls);
      expect(result.toolCalls).toEqual(toolCalls);
      expect(result.finishReason).toBe('tool_use');
    });

    it('should handle empty stream', async () => {
      const stream = createMockStream([]);
      const result = await processStream(stream);

      expect(result.content).toBe('');
      expect(result.finishReason).toBeUndefined();
      expect(result.toolCalls).toBeUndefined();
    });

    it('should handle stream with only content updates', async () => {
      const handlers = {
        onContent: jest.fn(),
      };

      const stream = createMockStream([{ content: 'Hello' }, { content: 'Hello world' }]);

      const result = await processStream(stream, handlers);

      expect(handlers.onContent).toHaveBeenCalledWith('Hello');
      expect(handlers.onContent).toHaveBeenCalledWith('Hello world');
      expect(result.content).toBe('Hello world');
    });
  });

  describe('generate', () => {
    it('should call provider and collect stream result', async () => {
      const mockProvider = jest.fn().mockReturnValue(
        createMockStream([
          { delta: 'Hello', content: 'Hello' },
          { delta: ' world', content: 'Hello world', finishReason: 'stop' },
        ])
      );

      const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }];
      const options = { temperature: 0.7 };

      const result = await generate(mockProvider as any, messages as any, options);

      expect(mockProvider).toHaveBeenCalledWith(messages, options);
      expect(result.content).toBe('Hello world');
      expect(result.finishReason).toBe('stop');
    });

    it('should work with default options', async () => {
      const mockProvider = jest
        .fn()
        .mockReturnValue(
          createMockStream([{ delta: 'Test', content: 'Test', finishReason: 'stop' }])
        );

      const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }];

      const result = await generate(mockProvider as any, messages as any);

      expect(mockProvider).toHaveBeenCalledWith(messages, {});
      expect(result.content).toBe('Test');
    });
  });

  describe('executeToolCall', () => {
    const mockServices: Record<string, (args: Record<string, unknown>) => any> = {
      get_weather: jest.fn((args: Record<string, unknown>) => {
        const { location } = args as { location: string };
        return `Weather in ${location}`;
      }),
      calculate: jest.fn((args: Record<string, unknown>) => {
        const { a, b } = args as { a: number; b: number };
        return a + b;
      }),
      return_object: jest.fn(() => ({ result: 'success' })),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute tool call with object arguments', () => {
      const toolCall = {
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'New York' },
      };

      const result = executeToolCall(toolCall, toolName => mockServices[toolName]);

      expect(mockServices.get_weather).toHaveBeenCalledWith({ location: 'New York' });
      expect(result).toBe('Weather in New York');
    });

    it('should execute tool call with multiple arguments', () => {
      const toolCall = {
        id: 'call_123',
        name: 'calculate',
        arguments: { a: 5, b: 3 },
      };

      const result = executeToolCall(toolCall, toolName => mockServices[toolName]);

      expect(mockServices.calculate).toHaveBeenCalledWith({ a: 5, b: 3 });
      expect(result).toBe(8);
    });

    it('should stringify non-string results', () => {
      const toolCall = {
        id: 'call_123',
        name: 'return_object',
        arguments: {},
      };

      const result = executeToolCall(toolCall, toolName => mockServices[toolName]);

      expect(mockServices.return_object).toHaveBeenCalled();
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error for unknown tool', () => {
      const toolCall = {
        id: 'call_123',
        name: 'unknown_tool',
        arguments: {},
      };

      expect(() => executeToolCall(toolCall, toolName => mockServices[toolName])).toThrow(
        'No service found for tool: unknown_tool'
      );
    });

    it('should handle tool execution errors', () => {
      const errorService: Record<string, (args: Record<string, unknown>) => any> = {
        failing_tool: jest.fn(() => {
          throw new Error('Tool failed');
        }),
      };

      const toolCall = {
        id: 'call_123',
        name: 'failing_tool',
        arguments: {},
      };

      expect(() => executeToolCall(toolCall, toolName => errorService[toolName])).toThrow(
        'Tool execution failed: Tool failed'
      );
    });
  });

  describe('processStream with reasoning content', () => {
    it('should handle reasoning content properly', async () => {
      const mockStream = async function* () {
        yield {
          content: 'Hello',
          delta: 'Hello',
          reasoning: {
            content: 'I think this is a greeting',
            delta: 'I think this is a greeting',
          },
        };
        yield {
          content: 'Hello world',
          delta: ' world',
          reasoning: {
            content: 'I think this is a greeting to the world',
            delta: ' to the world',
          },
        };
      };

      let reasoningCallbacks: Array<{ content: string; delta: string }> = [];

      const result = await processStream(mockStream(), {
        onReasoning: reasoning => {
          reasoningCallbacks.push(reasoning);
        },
      });

      expect(result.reasoning).toBe('I think this is a greeting to the world');
      expect(reasoningCallbacks).toHaveLength(2);
      expect(reasoningCallbacks[0]).toEqual({
        content: 'I think this is a greeting',
        delta: 'I think this is a greeting',
      });
      expect(reasoningCallbacks[1]).toEqual({
        content: 'I think this is a greeting to the world',
        delta: ' to the world',
      });
    });
  });
});
