import { AnthropicProvider } from '../../src/providers/anthropic';
import type { Message, GenerationOptions, AnthropicConfig, StreamChunk } from '../../src/types';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockAnthropic: any;
  const mockConfig: AnthropicConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.anthropic.com',
    timeout: 30000,
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Anthropic } = require('@anthropic-ai/sdk');
    mockAnthropic = {
      messages: {
        create: jest.fn(),
      },
    };
    Anthropic.mockReturnValue(mockAnthropic);
    provider = new AnthropicProvider(mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct models', () => {
      expect(provider.models).toEqual([
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ]);
    });

    it('should have correct provider configuration', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('generate', () => {
    const mockMessages: Message[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
    ];

    const mockOptions: GenerationOptions = {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 100,
      temperature: 0.7,
    };

    it('should call Anthropic API with correct parameters', async () => {
      const mockStream = createMockAnthropicStream([
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello!' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
        max_tokens: 100,
        temperature: 0.7,
        top_p: undefined,
        top_k: undefined,
        stop_sequences: undefined,
        stream: true,
      });
    });

    it('should handle system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are a helpful assistant' }],
        },
        ...mockMessages,
      ];

      const mockStream = createMockAnthropicStream([
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi!' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.system).toBe('You are a helpful assistant');
      expect(call.messages).toEqual([{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]);
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', image: 'data:image/jpeg;base64,iVBORw0KGgo=' },
          ],
        },
      ];

      const mockStream = createMockAnthropicStream([
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'I see an image' },
        },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.messages[0].content).toEqual([
        { type: 'text', text: 'What is in this image?' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: 'iVBORw0KGgo=',
          },
        },
      ]);
    });

    it('should handle tools configuration', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
        ],
        toolChoice: 'auto',
      };

      const mockStream = createMockAnthropicStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'tool_use', id: 'call_123', name: 'get_weather', input: {} },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{"location": "SF"}' },
        },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.tools).toEqual([
        {
          name: 'get_weather',
          description: 'Get weather information',
          input_schema: {
            type: 'object',
            properties: { location: { type: 'string' } },
            required: ['location'],
          },
        },
      ]);
      expect(call.tool_choice).toEqual({ type: 'auto' });
    });

    it('should handle assistant messages with tool calls', async () => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'I need to check the weather' }],
        toolCalls: [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'San Francisco' },
          },
        ],
      };

      const mockStream = createMockAnthropicStream([
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Let me check...' },
        },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.messages[0]).toEqual({
        role: 'assistant',
        content: [
          { type: 'text', text: 'I need to check the weather' },
          {
            type: 'tool_use',
            id: 'call_123',
            name: 'get_weather',
            input: { location: 'San Francisco' },
          },
        ],
      });
    });

    it('should handle tool result messages', async () => {
      const toolResultMessage: Message = {
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_123',
            result: '{"temperature": 72, "condition": "sunny"}',
          },
        ],
      };

      const mockStream = createMockAnthropicStream([
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'The weather is sunny' },
        },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([toolResultMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.messages[0]).toEqual({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_123',
            content: '{"temperature": 72, "condition": "sunny"}',
          },
        ],
      });
    });

    it('should process streaming response correctly', async () => {
      const mockStream = createMockAnthropicStream([
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' there' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '!' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
        { type: 'message_stop' },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toMatchObject({ delta: 'Hello', content: 'Hello' });
      expect(chunks[1]).toMatchObject({ delta: ' there', content: 'Hello there' });
      expect(chunks[2]).toMatchObject({ delta: '!', content: 'Hello there!' });
      expect(chunks[3]).toMatchObject({ delta: '', content: 'Hello there!', finishReason: 'stop' });
    });

    it('should handle all generation options', async () => {
      const detailedOptions: GenerationOptions = {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 500,
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        stopSequences: ['END', 'STOP'],
      };

      const mockStream = createMockAnthropicStream([
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Response' } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, detailedOptions)) {
        chunks.push(chunk);
      }

      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call).toMatchObject({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 40,
        stop_sequences: ['END', 'STOP'],
        stream: true,
      });
    });

    it('should handle messages with unknown roles', async () => {
      const unknownRoleMessage: Message = {
        role: 'unknown' as any,
        content: [{ type: 'text', text: 'Unknown role message' }],
      };

      const mockStream = createMockAnthropicStream([
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Response' } },
        { type: 'message_stop' },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([unknownRoleMessage], mockOptions)) {
        chunks.push(chunk);
      }

      // Should skip the unknown role message and generate with empty messages array
      const call = mockAnthropic.messages.create.mock.calls[0][0];
      expect(call.messages).toEqual([]);
    });

    it('should handle malformed JSON in tool arguments', async () => {
      const mockStream = createMockAnthropicStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'tool_use', id: 'call_123', name: 'get_weather', input: {} },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{"location": "SF"' }, // malformed JSON
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '}' }, // complete JSON
        },
        { type: 'message_stop' },
      ]);

      mockAnthropic.messages.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      // Should eventually parse the complete JSON and include tool calls
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.toolCalls).toEqual([
        {
          id: 'call_123',
          name: 'get_weather',
          arguments: { location: 'SF' },
        },
      ]);
    });
  });
});

// Helper function to create mock async iterators for Anthropic streaming responses
function createMockAnthropicStream(events: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}
