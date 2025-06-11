import { OpenAIProvider } from '../../src/providers/openai';
import type { Message, GenerationOptions, OpenAIConfig, StreamChunk } from '../../src/types';

// Mock the OpenAI SDK
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: any;
  const mockConfig: OpenAIConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OpenAI } = require('openai');
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    OpenAI.mockReturnValue(mockOpenAI);
    provider = new OpenAIProvider(mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct models', () => {
      expect(provider.models).toEqual([
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1-preview',
        'o1-mini',
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
      model: 'gpt-4o',
      maxTokens: 100,
      temperature: 0.7,
    };

    it('should call OpenAI API with correct parameters', async () => {
      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Hello!' }, finish_reason: null }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
        max_tokens: 100,
        temperature: 0.7,
        top_p: undefined,
        stop: undefined,
      });
    });

    it('should transform system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are a helpful assistant' }],
        },
        ...mockMessages,
      ];

      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Hi!' }, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call.messages).toEqual([
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ]);
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

      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'I see an image' }, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call.messages[0].content).toEqual([
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,iVBORw0KGgo=' } },
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

      const mockStream = createMockStream([
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'get_weather', arguments: '{"location": "SF"}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call.tools).toEqual([
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
        },
      ]);
      expect(call.tool_choice).toBe('auto');
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

      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Let me check...' }, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call.messages[0]).toEqual({
        role: 'assistant',
        content: 'I need to check the weather',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: JSON.stringify({ location: 'San Francisco' }),
            },
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

      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'The weather is sunny' }, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([toolResultMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call.messages[0]).toEqual({
        role: 'tool',
        tool_call_id: 'call_123',
        content: '{"temperature": 72, "condition": "sunny"}',
      });
    });

    it('should process streaming response correctly', async () => {
      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] },
        { choices: [{ delta: { content: ' there' }, finish_reason: null }] },
        { choices: [{ delta: { content: '!' }, finish_reason: null }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

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
        model: 'gpt-4',
        maxTokens: 500,
        temperature: 0.8,
        topP: 0.9,
        stopSequences: ['END', 'STOP'],
      };

      const mockStream = createMockStream([
        { choices: [{ delta: { content: 'Response' }, finish_reason: 'stop' }] },
      ]);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, detailedOptions)) {
        chunks.push(chunk);
      }

      const call = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(call).toMatchObject({
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.8,
        top_p: 0.9,
        stop: ['END', 'STOP'],
        stream: true,
      });
    });
  });
});

// Helper function to create mock async iterators for OpenAI streaming responses
function createMockStream(chunks: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}
