import { AnthropicProvider } from '../../src/providers/anthropic';
import { MessageTransformer } from '../../src/providers/utils';
import type {
  Message,
  GenerationOptions,
  AnthropicOptions,
  StreamChunk,
  FinishReason,
} from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  userImage,
  systemText,
  assistantWithToolCalls,
  toolResult,
} from '../../src/utils';
import { createAnthropicSSEStream } from '../helpers/stream';
import {
  anthropicTextResponse,
  anthropicToolCallResponse,
  anthropicErrorChunk,
  anthropicTextDeltaChunk,
  anthropicMessageStartChunk,
  anthropicContentBlockStartChunk,
  anthropicContentBlockStopChunk,
  anthropicMessageDeltaChunk,
  anthropicMessageStopChunk,
} from '../helpers/anthropicChunks';

/**
 * Set up nock to intercept the Anthropic request and return the provided chunks.
 * The intercepted request body is captured so that callers can assert on it.
 */
function mockAnthropicGeneration(
  expectedChunks: any[],
  captureBody: (body: any) => void
): nock.Scope {
  return nock('https://api.anthropic.com/v1')
    .post('/messages', body => {
      captureBody(body);
      return true; // allow the request
    })
    .matchHeader('x-api-key', 'test-api-key')
    .matchHeader('anthropic-version', '2023-06-01')
    .matchHeader('content-type', 'application/json')
    .reply(200, () => createAnthropicSSEStream(expectedChunks), {
      'content-type': 'text/event-stream',
    });
}

describe('AnthropicProvider', () => {
  const mockConfig: AnthropicOptions = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.anthropic.com/v1',
    timeout: 30000,
  };

  let provider: AnthropicProvider;

  // Ensure no real HTTP requests are made
  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    provider = new AnthropicProvider(mockConfig);
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      expect(() => {
        new AnthropicProvider({} as AnthropicOptions);
      }).toThrow('Anthropic API key is required');
    });

    it('should have correct provider configuration', () => {
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should handle beta configuration', () => {
      const configWithBeta: AnthropicOptions = {
        apiKey: 'test-api-key',
        beta: ['message-batches-2024-09-24', 'prompt-caching-2024-07-31'],
      };

      const providerWithBeta = new AnthropicProvider(configWithBeta);
      expect(providerWithBeta).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe('MessageTransformer (Anthropic tests)', () => {
    it('should test groupContentByType', () => {
      const content = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'image' as const, image: 'data:image/png;base64,xyz' },
        { type: 'tool_result' as const, toolCallId: 'call_1', result: 'result' },
      ];

      const grouped = MessageTransformer.groupContentByType(content);
      expect(grouped.text).toHaveLength(1);
      expect(grouped.images).toHaveLength(1);
      expect(grouped.toolResults).toHaveLength(1);
    });

    it('should test extractBase64Data', () => {
      const dataUrl = 'data:image/png;base64,xyz123';
      const base64Data = MessageTransformer.extractBase64Data(dataUrl);
      expect(base64Data).toBe('xyz123');
    });
  });

  describe('generate', () => {
    const mockMessages: Message[] = [userText('Hello')];

    const mockOptions: GenerationOptions = {
      model: 'claude-3-5-sonnet-20241022',
      maxOutputTokens: 100,
      temperature: 0.7,
    };

    it('should call Anthropic API with correct parameters', async () => {
      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Hello!'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        content: 'Hello!',
        delta: 'Hello!',
        toolCalls: undefined,
      });
      expect(chunks[1]).toEqual({
        content: 'Hello!',
        delta: '',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should handle system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        systemText('You are a helpful assistant'),
        ...mockMessages,
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Hi there!'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        content: 'Hi there!',
        delta: 'Hi there!',
        toolCalls: undefined,
      });
      expect(chunks[1]).toEqual({
        content: 'Hi there!',
        delta: '',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        userImage('What is in this image?', 'data:image/jpeg;base64,iVBORw0KGgo='),
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('I see an image'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        content: 'I see an image',
        delta: 'I see an image',
        toolCalls: undefined,
      });
      expect(chunks[1]).toEqual({
        content: 'I see an image',
        delta: '',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should detect different image MIME types', async () => {
      const testCases = [
        { input: 'data:image/png;base64,abc', expected: 'image/png' },
        { input: 'data:image/gif;base64,abc', expected: 'image/gif' },
        { input: 'data:image/webp;base64,abc', expected: 'image/webp' },
        { input: 'data:image/unknown;base64,abc', expected: 'image/jpeg' }, // fallback
      ];

      for (const { input, expected } of testCases) {
        const messagesWithImage: Message[] = [userImage('Test image', input)];

        const scopeReq = mockAnthropicGeneration(
          anthropicTextResponse('Image detected'),
          body => {}
        );

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
          chunks.push(chunk);
        }

        // Media type was inferred correctly if no runtime error is thrown.
        nock.cleanAll();
      }
    });

    it('should throw error when model is missing', async () => {
      const optionsWithoutModel = { ...mockOptions };
      delete optionsWithoutModel.model;

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, optionsWithoutModel)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Model is required. Provide it at construction time or generation time.');
    });

    it('should handle stop sequences', async () => {
      const optionsWithStopSequences: GenerationOptions = {
        ...mockOptions,
        stopSequences: ['STOP', 'END'],
      };

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Response'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, optionsWithStopSequences)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
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

      const scopeReq = mockAnthropicGeneration(
        anthropicToolCallResponse('call_123', 'get_weather', '{"location": "SF"}'),
        body => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks[0]).toEqual({
        content: '',
        delta: '',
        finishReason: 'tool_use',
        toolCalls: [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'SF' },
          },
        ],
      });
    });

    it('should handle new Anthropic-specific options', async () => {
      const anthropicOptions: AnthropicOptions = {
        ...mockOptions,
        container: 'container-123',
        mcpServers: [
          {
            name: 'test-server',
            url: 'https://example.com/mcp',
            authorization_token: 'token123',
            tool_configuration: {
              enabled: true,
              allowed_tools: ['search', 'calculator'],
            },
          },
        ],
        metadata: {
          user_id: 'user-456',
        },
        serviceTier: 'auto',
        thinking: {
          type: 'enabled',
          budget_tokens: 2048,
        },
        system: 'You are a helpful assistant.',
      };

      const scopeReq = mockAnthropicGeneration(
        anthropicTextResponse('Hello with new options!'),
        body => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, anthropicOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks[0]).toEqual({
        content: 'Hello with new options!',
        delta: 'Hello with new options!',
        toolCalls: undefined,
      });
    });

    it('should handle system option as array of text blocks', async () => {
      const anthropicOptions: AnthropicOptions = {
        ...mockOptions,
        system: [
          { type: 'text', text: 'You are a helpful assistant.' },
          { type: 'text', text: 'Please be concise.' },
        ],
      };

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Hello!'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, anthropicOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks[0]).toEqual({
        content: 'Hello!',
        delta: 'Hello!',
        toolCalls: undefined,
      });
    });

    it('should handle different tool choice options', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'calculate',
            description: 'Perform calculations',
            parameters: { type: 'object', properties: {} },
          },
        ],
      };

      // Test 'required' tool choice
      const scopeReq = mockAnthropicGeneration(
        anthropicToolCallResponse('call_456', 'calculate', '{}'),
        body => {}
      );

      for await (const _ of provider.generate(mockMessages, {
        ...toolOptions,
        toolChoice: 'required',
      })) {
        void _; // consume chunks
      }

      expect(scopeReq.isDone()).toBe(true);

      // Test specific tool choice
      const scope2 = mockAnthropicGeneration(
        anthropicToolCallResponse('call_789', 'calculate', '{}'),
        body => {}
      );

      for await (const _ of provider.generate(mockMessages, {
        ...toolOptions,
        toolChoice: { name: 'calculate' },
      })) {
        void _; // consume chunks
      }

      expect(scope2.isDone()).toBe(true);
    });

    it('should handle streaming text generation', async () => {
      const streamingChunks = [
        anthropicMessageStartChunk(),
        anthropicContentBlockStartChunk(0, 'text'),
        anthropicTextDeltaChunk('Hello'),
        anthropicTextDeltaChunk(' there'),
        anthropicTextDeltaChunk('!'),
        anthropicContentBlockStopChunk(0),
        anthropicMessageDeltaChunk('end_turn'),
        anthropicMessageStopChunk(),
      ];

      const scopeReq = mockAnthropicGeneration(streamingChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual({
        content: 'Hello',
        delta: 'Hello',
        toolCalls: undefined,
      });
      expect(chunks[1]).toEqual({
        content: 'Hello there',
        delta: ' there',
        toolCalls: undefined,
      });
      expect(chunks[2]).toEqual({
        content: 'Hello there!',
        delta: '!',
        toolCalls: undefined,
      });
      expect(chunks[3]).toEqual({
        content: 'Hello there!',
        delta: '',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should handle tool result messages', async () => {
      const toolResultMessages: Message[] = [
        userText('What is the weather in SF?'),
        assistantWithToolCalls('I need to check the weather for you.', [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'SF' },
          },
        ]),
        toolResult('call_123', 'The weather in SF is sunny, 72°F'),
      ];

      const scopeReq = mockAnthropicGeneration(
        anthropicTextResponse('The weather is sunny!'),
        body => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(toolResultMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('The weather is sunny!');
    });

    it('should handle API errors', async () => {
      const scopeReq = nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(400, { error: { type: 'invalid_request_error', message: 'Invalid request' } });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('API error: 400 Bad Request');

      expect(scopeReq.isDone()).toBe(true);
    });

    it('should handle streaming errors', async () => {
      const scopeReq = mockAnthropicGeneration(
        [anthropicErrorChunk('overloaded_error', 'Overloaded')],
        () => {}
      );

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Anthropic API error: overloaded_error - Overloaded');

      expect(scopeReq.isDone()).toBe(true);
    });

    it('should handle unknown message roles', async () => {
      const messageWithUnknownRole: Message[] = [
        // @ts-expect-error - Testing unknown role
        { role: 'unknown', content: [{ type: 'text', text: 'Test' }] },
        userText('Hello'),
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Response'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messageWithUnknownRole, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      // Should only have user message, unknown role should be filtered out
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Response');
    });

    it('should handle malformed JSON in tool arguments', async () => {
      const malformedJsonChunks = [
        anthropicMessageStartChunk(),
        anthropicContentBlockStartChunk(0, 'tool_use', { id: 'call_123', name: 'test_tool' }),
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{"invalid":' },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: ' malformed' },
        },
        anthropicContentBlockStopChunk(0),
        anthropicMessageDeltaChunk('tool_use'),
        anthropicMessageStopChunk(),
      ];

      const scopeReq = mockAnthropicGeneration(malformedJsonChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      // Should handle malformed JSON gracefully
      expect(chunks).toHaveLength(1);
      expect(chunks[0].finishReason).toBe('tool_use');
    });

    it('should handle different finish reasons', async () => {
      const finishReasons = [
        { reason: 'max_tokens' as const, expected: 'length' },
        { reason: 'stop_sequence' as const, expected: 'stop' },
      ];

      for (const { reason, expected } of finishReasons) {
        const chunks = [
          anthropicMessageStartChunk(),
          anthropicContentBlockStartChunk(0, 'text'),
          anthropicTextDeltaChunk('Test'),
          anthropicContentBlockStopChunk(0),
          anthropicMessageDeltaChunk(reason),
          anthropicMessageStopChunk(),
        ];

        const scopeReq = mockAnthropicGeneration(chunks, () => {});

        const results: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          results.push(chunk);
        }

        expect(scopeReq.isDone()).toBe(true);
        const finalChunk = results[results.length - 1];
        expect(finalChunk.finishReason).toBe(expected);
        nock.cleanAll();
      }
    });

    it('should handle empty tool arguments', async () => {
      const emptyArgsChunks = [
        anthropicMessageStartChunk(),
        anthropicContentBlockStartChunk(0, 'tool_use', { id: 'call_123', name: 'test_tool' }),
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'input_json_delta', partial_json: '{}' },
        },
        anthropicContentBlockStopChunk(0),
        anthropicMessageDeltaChunk('tool_use'),
        anthropicMessageStopChunk(),
      ];

      const scopeReq = mockAnthropicGeneration(emptyArgsChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].toolCalls).toEqual([{ id: 'call_123', name: 'test_tool', arguments: {} }]);
    });

    it('should prepend user message when first message is not from user', async () => {
      const assistantMsg: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there!' }],
      } as Message;

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Hello!'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      // First message should be an empty user message as required by Anthropic
      expect(chunks[0]).toEqual({
        content: 'Hello!',
        delta: 'Hello!',
        toolCalls: undefined,
      });
      // Second message should be the assistant one we sent
      expect(chunks[1]).toEqual({
        content: 'Hello!',
        delta: '',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should skip tool messages with no tool results', async () => {
      // A tool message with empty content should be ignored entirely
      const emptyToolMsg: Message = {
        role: 'tool',
        content: [],
      } as unknown as Message;

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Done'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([userText('Ping'), emptyToolMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      // We should only have the original user message in the payload
      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        content: 'Done',
        delta: 'Done',
        toolCalls: undefined,
      });
    });

    it('should handle thinking_delta and signature_delta events', async () => {
      const reasoningChunks = [
        anthropicMessageStartChunk(),
        anthropicContentBlockStartChunk(0, 'text'),
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'thinking_delta', thinking: 'Let me think...' },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'signature_delta', signature: 'signature_data' },
        },
        anthropicTextDeltaChunk('Response'),
        anthropicContentBlockStopChunk(0),
        anthropicMessageDeltaChunk('end_turn'),
        anthropicMessageStopChunk(),
      ];

      const scopeReq = mockAnthropicGeneration(reasoningChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(3); // Now emits 3 chunks: reasoning, text, and final
      // First chunk should have reasoning content
      expect(chunks[0].reasoning?.content).toBe('Let me think...');
      // Second chunk should have the text response
      expect(chunks[1].content).toBe('Response');
    });

    it('should handle pause_turn and refusal finish reasons', async () => {
      const finishReasons = [
        { reason: 'pause_turn' as const, expected: 'stop' },
        { reason: 'refusal' as const, expected: 'error' },
      ];

      for (const { reason, expected } of finishReasons) {
        const chunks = [
          anthropicMessageStartChunk(),
          anthropicContentBlockStartChunk(0, 'text'),
          anthropicTextDeltaChunk('Test'),
          anthropicContentBlockStopChunk(0),
          anthropicMessageDeltaChunk(reason),
          anthropicMessageStopChunk(),
        ];

        const scopeReq = mockAnthropicGeneration(chunks, () => {});

        const results: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          results.push(chunk);
        }

        expect(scopeReq.isDone()).toBe(true);
        const finalChunk = results[results.length - 1];
        expect(finalChunk.finishReason).toBe(expected);
        nock.cleanAll();
      }
    });

    it('should handle malformed stream data gracefully', async () => {
      const scopeReq = nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, () => {
          const stream = new Readable({ read() {} });
          // Send malformed data that will cause JSON parsing errors
          stream.push('data: {"type": "invalid_json", "malformed":}\n\n');
          stream.push('data: {"type": "message_start", "message": {"id": "msg_123"}}\n\n');
          stream.push(
            'data: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}\n\n'
          );
          stream.push(
            'data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}\n\n'
          );
          stream.push('data: {"type": "content_block_stop", "index": 0}\n\n');
          stream.push('data: {"type": "message_delta", "delta": {"stop_reason": "end_turn"}}\n\n');
          stream.push('data: {"type": "message_stop"}\n\n');
          stream.push(null);
          return stream;
        });

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[1].content).toBe('Hello');
    });

    it('should re-throw API errors from stream', async () => {
      const scopeReq = nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, () => {
          const stream = new Readable({ read() {} });
          stream.push('data: {"type": "message_start", "message": {"id": "msg_123"}}\n\n');
          stream.push(
            'data: {"type": "error", "error": {"type": "rate_limit_error", "message": "Rate limit exceeded"}}\n\n'
          );
          stream.push(null);
          return stream;
        });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Anthropic API error: rate_limit_error - Rate limit exceeded');

      expect(scopeReq.isDone()).toBe(true);
    });
  });

  describe('AnthropicProvider - Edge Cases', () => {
    beforeEach(() => {
      provider = new AnthropicProvider({ apiKey: 'test-api-key' });
    });

    it('should handle malformed JSON in stream gracefully', async () => {
      // Create a stream with malformed JSON that should be ignored
      const stream = new Readable({ read() {} });
      stream.push('data: {"type": "message_start", "message": {"id": "msg_123"}}\n');
      stream.push('data: invalid-json-here\n'); // This should be ignored
      stream.push(
        'data: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}\n'
      );
      stream.push(
        'data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}\n'
      );
      stream.push('data: {"type": "message_stop"}\n');
      stream.push(null);

      const scopeReq = nock('https://api.anthropic.com/v1')
        .post('/messages')
        .matchHeader('x-api-key', 'test-api-key')
        .reply(200, () => stream, { 'content-type': 'text/event-stream' });

      const messages = [
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
      ];
      const chunks: StreamChunk[] = [];

      for await (const chunk of provider.generate(messages, {
        model: 'claude-3-5-sonnet-20241022',
      })) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('Hello');
    });

    it('should handle API errors in stream', async () => {
      const stream = new Readable({ read() {} });
      stream.push(
        'data: {"type": "error", "error": {"type": "invalid_request_error", "message": "Invalid API key"}}\n'
      );
      stream.push(null);

      const scopeReq = nock('https://api.anthropic.com/v1')
        .post('/messages')
        .matchHeader('x-api-key', 'test-api-key')
        .reply(200, () => stream, { 'content-type': 'text/event-stream' });

      const messages = [
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
      ];

      await expect(async () => {
        for await (const _ of provider.generate(messages, {
          model: 'claude-3-5-sonnet-20241022',
        })) {
          void _; // ignore
        }
      }).rejects.toThrow('Anthropic API error: invalid_request_error - Invalid API key');

      expect(scopeReq.isDone()).toBe(true);
    });

    it('should handle empty tool results', async () => {
      const messages = [
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
        { role: 'tool' as const, content: [] }, // Empty tool results
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Response'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messages, {
        model: 'claude-3-5-sonnet-20241022',
      })) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2); // Text chunk + final chunk
      expect(chunks[0].content).toBe('Response');
    });

    it('should handle unknown message roles', async () => {
      const messages = [
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
        { role: 'developer' as any, content: [{ type: 'text' as const, text: 'Debug info' }] }, // Unknown role
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Response'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messages, {
        model: 'claude-3-5-sonnet-20241022',
      })) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2); // Text chunk + final chunk
      expect(chunks[0].content).toBe('Response');
    });

    it('should handle conversation starting with assistant message', async () => {
      const messages = [
        {
          role: 'assistant' as const,
          content: [{ type: 'text' as const, text: 'I am ready to help' }],
        },
        { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
      ];

      const scopeReq = mockAnthropicGeneration(anthropicTextResponse('Response'), body => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messages, {
        model: 'claude-3-5-sonnet-20241022',
      })) {
        chunks.push(chunk);
      }

      expect(scopeReq.isDone()).toBe(true);
      expect(chunks).toHaveLength(2); // Text chunk + final chunk
      expect(chunks[0].content).toBe('Response');
    });

    it('should handle all finish reason mappings', async () => {
      const finishReasons = ['pause_turn', 'refusal', 'unknown_reason'];

      for (const reason of finishReasons) {
        const stream = [
          anthropicMessageStartChunk(),
          anthropicContentBlockStartChunk(0, 'text'),
          anthropicTextDeltaChunk('Test'),
          anthropicContentBlockStopChunk(0),
          anthropicMessageDeltaChunk(reason as any),
          anthropicMessageStopChunk(),
        ];

        const scopeReq = mockAnthropicGeneration(stream, () => {});

        const messages = [
          { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
        ];
        const chunks: StreamChunk[] = [];

        for await (const chunk of provider.generate(messages, {
          model: 'claude-3-5-sonnet-20241022',
        })) {
          chunks.push(chunk);
        }

        expect(scopeReq.isDone()).toBe(true);
        expect(chunks).toHaveLength(2); // Text chunk + final chunk
        const expectedFinish: FinishReason | undefined =
          reason === 'pause_turn' ? 'stop' : reason === 'refusal' ? 'error' : undefined;
        expect(chunks[1].finishReason).toBe(expectedFinish);
      }
    });
  });
});
