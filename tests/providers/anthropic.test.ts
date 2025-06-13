import { AnthropicProvider } from '../../src/providers/anthropic';
import { MessageTransformer } from '../../src/providers/utils';
import type { Message, GenerationOptions, AnthropicOptions, StreamChunk } from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  userImage,
  systemText,
  assistantWithToolCalls,
  toolResult,
} from '../../src/utils';
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
 * Helper to create a chunked SSE response body for the Anthropic streaming API.
 */
function createAnthropicSSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  chunks.forEach(chunk => {
    stream.push(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`);
  });
  stream.push(null); // end of stream
  return stream;
}

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
      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Hello!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody).toMatchObject({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        temperature: 0.7,
        stream: true,
      });
      expect(requestBody.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);
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

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Hi there!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.system).toBe('You are a helpful assistant');
      expect(requestBody.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        userImage('What is in this image?', 'data:image/jpeg;base64,iVBORw0KGgo='),
      ];

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('I see an image'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages[0].content).toEqual([
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

    it('should detect different image MIME types', async () => {
      const testCases = [
        { input: 'data:image/png;base64,abc', expected: 'image/png' },
        { input: 'data:image/gif;base64,abc', expected: 'image/gif' },
        { input: 'data:image/webp;base64,abc', expected: 'image/webp' },
        { input: 'data:image/unknown;base64,abc', expected: 'image/jpeg' }, // fallback
      ];

      for (const { input, expected } of testCases) {
        const messagesWithImage: Message[] = [userImage('Test image', input)];

        let requestBody: any;
        const scope = mockAnthropicGeneration(
          anthropicTextResponse('Image detected'),
          body => (requestBody = body)
        );

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        expect(requestBody.messages[0].content[1].source.media_type).toBe(expected);
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

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Response'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, optionsWithStopSequences)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.stop_sequences).toEqual(['STOP', 'END']);
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

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicToolCallResponse('call_123', 'get_weather', '{"location": "SF"}'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tools).toEqual([
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
      expect(requestBody.tool_choice).toEqual({ type: 'auto' });
      expect(chunks).toHaveLength(1);
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

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Hello with new options!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, anthropicOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.container).toBe('container-123');
      expect(requestBody.mcp_servers).toEqual([
        {
          name: 'test-server',
          type: 'url',
          url: 'https://example.com/mcp',
          authorization_token: 'token123',
          tool_configuration: {
            enabled: true,
            allowed_tools: ['search', 'calculator'],
          },
        },
      ]);
      expect(requestBody.metadata).toEqual({
        user_id: 'user-456',
      });
      expect(requestBody.service_tier).toBe('auto');
      expect(requestBody.thinking).toEqual({
        type: 'enabled',
        budget_tokens: 2048,
      });
      expect(requestBody.system).toBe('You are a helpful assistant.');
    });

    it('should handle system option as array of text blocks', async () => {
      const anthropicOptions: AnthropicOptions = {
        ...mockOptions,
        system: [
          { type: 'text', text: 'You are a helpful assistant.' },
          { type: 'text', text: 'Please be concise.' },
        ],
      };

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Hello!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, anthropicOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.system).toEqual([
        { type: 'text', text: 'You are a helpful assistant.' },
        { type: 'text', text: 'Please be concise.' },
      ]);
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
      let requestBody: any;
      let scope = mockAnthropicGeneration(
        anthropicToolCallResponse('call_456', 'calculate', '{}'),
        body => (requestBody = body)
      );

      for await (const chunk of provider.generate(mockMessages, {
        ...toolOptions,
        toolChoice: 'required',
      })) {
        void chunk; // consume chunks
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual({ type: 'any' });
      nock.cleanAll();

      // Test specific tool choice
      scope = mockAnthropicGeneration(
        anthropicToolCallResponse('call_789', 'calculate', '{}'),
        body => (requestBody = body)
      );

      for await (const chunk of provider.generate(mockMessages, {
        ...toolOptions,
        toolChoice: { name: 'calculate' },
      })) {
        void chunk; // consume chunks
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual({ type: 'tool', name: 'calculate' });
      nock.cleanAll();
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

      const scope = mockAnthropicGeneration(streamingChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('The weather is sunny!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(toolResultMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'What is the weather in SF?' }] },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'I need to check the weather for you.' },
            { type: 'tool_use', id: 'call_123', name: 'get_weather', input: { location: 'SF' } },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'call_123',
              content: 'The weather in SF is sunny, 72°F',
            },
          ],
        },
      ]);
    });

    it('should handle API errors', async () => {
      const scope = nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(400, { error: { type: 'invalid_request_error', message: 'Invalid request' } });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('API error: 400 Bad Request');

      expect(scope.isDone()).toBe(true);
    });

    it('should handle streaming errors', async () => {
      const scope = mockAnthropicGeneration(
        [anthropicErrorChunk('overloaded_error', 'Overloaded')],
        () => {}
      );

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Anthropic API error: overloaded_error - Overloaded');

      expect(scope.isDone()).toBe(true);
    });

    it('should handle unknown message roles', async () => {
      const messageWithUnknownRole: Message[] = [
        // @ts-expect-error - Testing unknown role
        { role: 'unknown', content: [{ type: 'text', text: 'Test' }] },
        userText('Hello'),
      ];

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Response'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messageWithUnknownRole, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should only have user message, unknown role should be filtered out
      expect(requestBody.messages).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ]);
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

      const scope = mockAnthropicGeneration(malformedJsonChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

        const scope = mockAnthropicGeneration(chunks, () => {});

        const results: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          results.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
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

      const scope = mockAnthropicGeneration(emptyArgsChunks, () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].toolCalls).toEqual([{ id: 'call_123', name: 'test_tool', arguments: {} }]);
    });

    it('should prepend user message when first message is not from user', async () => {
      const assistantMsg: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there!' }],
      } as Message;

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Hello!'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // First message should be an empty user message as required by Anthropic
      expect(requestBody.messages[0]).toEqual({ role: 'user', content: [] });
      // Second message should be the assistant one we sent
      expect(requestBody.messages[1]).toMatchObject({ role: 'assistant' });
    });

    it('should skip tool messages with no tool results', async () => {
      // A tool message with empty content should be ignored entirely
      const emptyToolMsg: Message = {
        role: 'tool',
        content: [],
      } as unknown as Message;

      let requestBody: any;
      const scope = mockAnthropicGeneration(
        anthropicTextResponse('Done'),
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([userText('Ping'), emptyToolMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // We should only have the original user message in the payload
      expect(requestBody.messages).toHaveLength(1);
      expect(requestBody.messages[0].role).toBe('user');
    });
  });
});
