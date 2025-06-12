import { OpenAIProvider } from '../../src/providers/openai';
import type { Message, GenerationOptions, OpenAIConfig, StreamChunk } from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  systemText,
  userImage,
  assistantWithToolCalls,
  toolResult as toolResultMsg,
} from '../../src/createFuncs';
import { textChunk, stopChunk, toolCallChunk } from '../helpers/openaiChunks';

/**
 * Helper to create a chunked SSE response body for the OpenAI streaming API.
 */
function createSSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  chunks.forEach(chunk => {
    stream.push(`data: ${JSON.stringify(chunk)}\n`);
  });
  stream.push('data: [DONE]\n');
  stream.push(null); // end of stream
  return stream;
}

/**
 * Set up nock to intercept the chat completion request and return the provided chunks.
 * The intercepted request body is captured so that callers can assert on it.
 */
function mockChatCompletion(expectedChunks: any[], captureBody: (body: any) => void): nock.Scope {
  return nock('https://api.openai.com')
    .post('/v1/chat/completions', body => {
      captureBody(body);
      return true; // allow the request
    })
    .reply(200, () => createSSEStream(expectedChunks), {
      'Content-Type': 'text/event-stream',
    });
}

describe('OpenAIProvider', () => {
  const mockConfig: OpenAIConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
  };

  let provider: OpenAIProvider;

  // Ensure no real HTTP requests are made
  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    provider = new OpenAIProvider(mockConfig);
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('constructor', () => {
    it('should initialize with organization and project headers', () => {
      const configWithOrgAndProject: OpenAIConfig = {
        apiKey: 'test-api-key',
        organization: 'test-org',
        project: 'test-project',
      };

      const providerWithHeaders = new OpenAIProvider(configWithOrgAndProject);
      expect(providerWithHeaders).toBeInstanceOf(OpenAIProvider);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: OpenAIConfig = {
        apiKey: 'test-api-key',
        baseURL: 'https://custom.openai.com/v1',
        timeout: 30000,
        maxRetries: 5,
      };

      const customProvider = new OpenAIProvider(customConfig);
      expect(customProvider).toBeInstanceOf(OpenAIProvider);
    });
  });

  describe('generate', () => {
    const mockMessages: Message[] = [userText('Hello')];

    const mockOptions: GenerationOptions = {
      model: 'gpt-4o',
      maxTokens: 100,
      temperature: 0.7,
    };

    it('should call OpenAI API with correct parameters', async () => {
      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Hello!'), stopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody).toMatchObject({
        model: 'gpt-4o',
        stream: true,
        max_tokens: 100,
        temperature: 0.7,
      });

      // Verify the user message using concise matchers
      expect(requestBody.messages).toEqual([
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ]);
    });

    it('should transform system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        systemText('You are a helpful assistant'),
        ...mockMessages,
      ];

      let requestBody: any;
      const scope = mockChatCompletion([textChunk('Hi!', 'stop')], body => (requestBody = body));

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages).toEqual([
        { role: 'system', content: 'You are a helpful assistant' },
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ]);
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        userImage('What is in this image?', 'data:image/jpeg;base64,iVBORw0KGgo='),
      ];

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('I see an image', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages[0].content).toEqual([
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

      let requestBody: any;
      const scope = mockChatCompletion(
        [
          toolCallChunk(
            { index: 0, id: 'call_123', name: 'get_weather', args: '{"location": "SF"}' },
            'tool_calls'
          ),
        ],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tools).toEqual([
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
      expect(requestBody.tool_choice).toBe('auto');
    });

    it('should handle assistant messages with tool calls', async () => {
      const assistantMsg: Message = assistantWithToolCalls('I need to check the weather', {
        id: 'call_123',
        name: 'get_weather',
        arguments: { location: 'San Francisco' },
      });

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Let me check...', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages[0]).toEqual({
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
      const toolResult: Message = toolResultMsg(
        'call_123',
        '{"temperature": 72, "condition": "sunny"}'
      );

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('The weather is sunny', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([toolResult], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages[0]).toEqual({
        role: 'tool',
        tool_call_id: 'call_123',
        content: '{"temperature": 72, "condition": "sunny"}',
      });
    });

    it('should process streaming response correctly', async () => {
      const scope = mockChatCompletion(
        [textChunk('Hello'), textChunk(' there'), textChunk('!'), stopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, detailedOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody).toMatchObject({
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.8,
        top_p: 0.9,
        stop: ['END', 'STOP'],
        stream: true,
      });
    });

    it('should handle tool choice none', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: 'none',
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual('none');
    });

    it('should handle tool choice auto', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: 'auto',
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual('auto');
    });

    it('should handle tool choice required', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: 'required',
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual('required');
    });

    it('should handle tool choice with specific tool', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { name: 'specific_tool' },
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual({
        type: 'function',
        function: { name: 'specific_tool' },
      });
    });

    it('should handle undefined tool choice', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: undefined,
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toBeUndefined();
    });

    it('should handle different finish reasons', async () => {
      const finishReasonTests = [
        { reason: 'length', expected: 'length' },
        { reason: 'tool_calls', expected: 'tool_use' },
        { reason: 'stop', expected: 'stop' },
        { reason: 'unknown', expected: 'stop' },
      ];

      for (const { reason, expected } of finishReasonTests) {
        const scope = mockChatCompletion(
          [{ choices: [{ delta: { content: 'test' }, finish_reason: reason }] }],
          () => {}
        );

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        expect(chunks[0].finishReason).toBe(expected);
        nock.cleanAll();
      }
    });

    it('should handle null finish reason', async () => {
      const scope = mockChatCompletion(
        [{ choices: [{ delta: { content: 'test' }, finish_reason: null }] }],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks[0].finishReason).toBeUndefined();
    });

    it('should handle messages with unknown roles', async () => {
      const unknownRoleMsg: Message = {
        role: 'unknown' as any,
        content: [{ type: 'text', text: 'Unknown role' }],
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([unknownRoleMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.messages).toEqual([]);
    });

    it('should handle malformed JSON in tool arguments', async () => {
      const scope = mockChatCompletion(
        [
          toolCallChunk(
            { index: 0, id: 'call_123', name: 'get_weather', args: '{"location": "SF"' },
            null
          ),
          toolCallChunk({ index: 0, args: '}' }, 'tool_calls'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      const last = chunks[chunks.length - 1];
      expect(last.toolCalls).toEqual([
        { id: 'call_123', name: 'get_weather', arguments: { location: 'SF' } },
      ]);
    });

    it('should handle empty chunks without choices', async () => {
      const scope = mockChatCompletion([{}, { choices: [] }, textChunk('Hello', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toMatchObject({ delta: 'Hello', content: 'Hello' });
    });

    it('should handle content with null images gracefully', async () => {
      const messagesWithNullContent: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'tool_result', toolCallId: 'call1', result: 'result' }, // Should be filtered out
          ],
        },
      ];

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithNullContent, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should filter out non-text/image content and only keep text
      expect(requestBody.messages[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
    });

    it('should handle tool choice object with null fallback', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        // @ts-expect-error - testing edge case
        toolChoice: null,
      };

      let requestBody: any;
      const scope = mockChatCompletion(
        [textChunk('Response', 'stop')],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // When toolChoice is null/falsy, tool_choice should not be set
      expect(requestBody.tool_choice).toBeUndefined();
    });
  });
});
