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
  processStream,
  printStream,
  filterStream,
  mapStream,
  toReadableStream,
} from '../src/utils';
import type { Content, StreamChunk } from '../src/types';

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
    it('should create tools with properties and required fields', () => {
      const properties = {
        location: { type: 'string', description: 'City name' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      };
      const required = ['location'];

      expect(createTool('get_weather', 'Get weather', properties, required)).toEqual({
        name: 'get_weather',
        description: 'Get weather',
        parameters: {
          type: 'object',
          properties,
          required,
        },
      });
    });

    it('should work with empty required array', () => {
      const properties = { query: { type: 'string' } };
      expect(createTool('search', 'Search', properties)).toEqual({
        name: 'search',
        description: 'Search',
        parameters: {
          type: 'object',
          properties,
          required: [],
        },
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
      const mockWrite = jest.fn();
      process.stdout.write = mockWrite as any;

      try {
        const chunks = [
          { delta: 'Hello', content: 'Hello' },
          { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
        ];

        await printStream(createMockStream(chunks));

        expect(mockWrite).toHaveBeenCalledWith('Hello');
        expect(mockWrite).toHaveBeenCalledWith(' world');
      } finally {
        process.stdout.write = originalWrite;
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
      const stream = createMockStream([{ delta: 'hello' }, { delta: 'world' }]);

      const readableStream = toReadableStream(stream);
      const reader = readableStream.getReader();

      const chunk1 = await reader.read();
      expect(chunk1.done).toBe(false);
      expect(chunk1.value?.delta).toBe('hello');

      const chunk2 = await reader.read();
      expect(chunk2.done).toBe(false);
      expect(chunk2.value?.delta).toBe('world');

      const chunk3 = await reader.read();
      expect(chunk3.done).toBe(true);
    });
  });
});
