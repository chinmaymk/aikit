import { AnthropicProvider } from '../../src/providers/anthropic';
import type { Message, GenerationOptions, AnthropicConfig, StreamChunk } from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  systemText,
  userImage,
  assistantWithToolCalls,
  toolResult as toolResultMsg,
} from '../../src/createFuncs';
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
  return nock('https://api.anthropic.com')
    .post('/v1/messages', body => {
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
  const mockConfig: AnthropicConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.anthropic.com',
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
    const mockMessages: Message[] = [userText('Hello')];

    const mockOptions: GenerationOptions = {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 100,
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
        assistantWithToolCalls('I need to check the weather for you.', {
          id: 'call_123',
          name: 'get_weather',
          arguments: { location: 'SF' },
        }),
        toolResultMsg('call_123', 'The weather in SF is sunny, 72°F'),
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
      }).rejects.toThrow('Anthropic API error: Overloaded');

      expect(scope.isDone()).toBe(true);
    });
  });
});
