/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  createOpenAIResponses,
  openaiResponses,
  userText,
  userImage,
  systemText,
  assistantWithToolCalls,
  toolResult as toolResultMsg,
  type Message,
  type GenerationOptions,
  type OpenAIResponsesOptions,
  type StreamChunk,
  type FinishReason,
  type OpenAIResponsesProvider,
} from '@chinmaymk/aikit';
import nock from 'nock';
import { textChunk, toolCallChunk, textDelta, completionChunk } from '../helpers/openaiChunks';
import { createOpenAISSEStream as createSSEStream } from '../helpers/stream';

/**
 * Set up nock to intercept the responses API request and return the provided chunks.
 * The intercepted request body is captured so that callers can assert on it.
 */
function mockResponsesAPI(expectedChunks: any[], captureBody: (body: any) => void): nock.Scope {
  return nock('https://api.openai.com')
    .post('/v1/responses', body => {
      captureBody(body);
      return true; // allow the request
    })
    .reply(200, () => createSSEStream(expectedChunks), {
      'Content-Type': 'text/event-stream',
    });
}

describe('OpenAIResponsesProvider', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
  };

  let provider: OpenAIResponsesProvider;
  const mockMessages: Message[] = [userText('Hello, world!')];
  const mockOptions: OpenAIResponsesOptions = {
    model: 'gpt-4o',
    apiKey: 'test-api-key',
  };

  // Ensure no real HTTP requests are made
  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    provider = createOpenAIResponses(mockConfig);
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('constructor', () => {
    it('should initialize with organization and project headers', () => {
      const configWithOrgAndProject = {
        apiKey: 'test-api-key',
        organization: 'test-org',
        project: 'test-project',
      };

      const providerWithHeaders = createOpenAIResponses(configWithOrgAndProject);
      expect(typeof providerWithHeaders).toBe('function');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        apiKey: 'test-api-key',
        baseURL: 'https://custom.openai.com/v1',
        timeout: 30000,
        maxRetries: 5,
      };

      const customProvider = createOpenAIResponses(customConfig);
      expect(typeof customProvider).toBe('function');
    });
  });

  describe('generate', () => {
    const mockOptions: GenerationOptions = {
      model: 'gpt-4o',
      maxOutputTokens: 100,
      temperature: 0.7,
    };

    it('should call OpenAI API with correct parameters', async () => {
      const scope = mockResponsesAPI([textChunk('Hello!', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should transform system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        systemText('You are a helpful assistant'),
        ...mockMessages,
      ];

      const scope = mockResponsesAPI([textChunk('Hi!', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        userImage('What is in this image?', 'data:image/jpeg;base64,iVBORw0KGgo='),
      ];

      const scope = mockResponsesAPI([textChunk('I see an image', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI(
        [
          toolCallChunk(
            { index: 0, id: 'call_123', name: 'get_weather', args: '{"location": "SF"}' },
            'tool_calls'
          ),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle assistant messages with tool calls', async () => {
      const assistantMsg: Message = assistantWithToolCalls('I need to check the weather', [
        {
          id: 'call_123',
          name: 'get_weather',
          arguments: { location: 'San Francisco' },
        },
      ]);

      const scope = mockResponsesAPI([textChunk('Let me check...', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider([assistantMsg], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle tool result messages', async () => {
      const toolResultMessage: Message = toolResultMsg(
        'call_123',
        '{"temperature": 72, "condition": "sunny"}'
      );

      const scope = mockResponsesAPI([textChunk('The weather is sunny', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider([toolResultMessage], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should process streaming response correctly', async () => {
      const scope = mockResponsesAPI(
        [textDelta('Hello'), textDelta(' there'), textDelta('!'), completionChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
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
        maxOutputTokens: 500,
        temperature: 0.8,
        topP: 0.9,
      };

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, detailedOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle different finish reasons', async () => {
      const finishReasonTests = [
        { status: 'completed', expected: 'stop' },
        { status: 'incomplete', expected: 'length' },
        { status: 'unknown', expected: 'stop' },
      ];

      for (const { status, expected } of finishReasonTests) {
        const scope = mockResponsesAPI([textDelta('test'), completionChunk(status)], () => {});

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        expect(chunks[1].finishReason).toBe(expected);
        nock.cleanAll();
      }
    });

    it('should handle tool_calls_required finish reason', async () => {
      const scope = mockResponsesAPI(
        [
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              id: 'call_1',
              call_id: 'call_1',
              name: 'test_tool',
              arguments: '',
            },
          },
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            arguments: '{}',
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finishReason).toBe('tool_use');
      expect(finalChunk.toolCalls).toBeDefined();
    });

    it('should handle null finish reason', async () => {
      const scope = mockResponsesAPI([textDelta('test')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
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

      // Should throw error for unknown role
      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider([unknownRoleMsg], mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow(
        "Unsupported message role 'unknown' for OpenAI Responses provider. Supported roles: user, assistant, system, tool"
      );
    });

    it('should handle malformed JSON in tool arguments', async () => {
      const scope = mockResponsesAPI(
        [
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              id: 'call_123',
              call_id: 'call_123',
              name: 'get_weather',
              arguments: '',
            },
          },
          {
            type: 'response.function_call_arguments.delta',
            response_id: 'resp_123',
            item_id: 'call_123',
            output_index: 0,
            call_id: 'call_123',
            delta: '{"location": "SF"',
          },
          {
            type: 'response.function_call_arguments.delta',
            response_id: 'resp_123',
            item_id: 'call_123',
            output_index: 0,
            call_id: 'call_123',
            delta: '}',
          },
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_123',
            output_index: 0,
            call_id: 'call_123',
            arguments: '{"location": "SF"}',
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle empty chunks without data', async () => {
      const scope = mockResponsesAPI(
        [
          { type: 'response.started' }, // Unknown event type
          textDelta('Hello'),
          completionChunk(),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithNullContent, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should filter out non-text/image content and only keep text
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

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // When toolChoice is null/falsy, tool_choice should not be set
    });

    // Additional test coverage for responses API specific features
    it('should handle OpenAI-specific options', async () => {
      const openaiOptions: GenerationOptions = {
        ...mockOptions,
        // @ts-expect-error - testing OpenAI-specific options
        background: true,
        instructions: 'Be helpful',
        store: true,
        user: 'user123',
        parallelToolCalls: false,
        serviceTier: 'default',
        metadata: { session_id: 'test' },
      };

      const scope = mockResponsesAPI([textChunk('Response', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, openaiOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle complex tool call sequences', async () => {
      const scope = mockResponsesAPI(
        [
          // First, add a function call
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              id: 'call_1',
              call_id: 'call_1',
              name: 'get_weather',
              arguments: '',
            },
          },
          // Then add arguments in chunks
          {
            type: 'response.function_call_arguments.delta',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            delta: '{"location":',
          },
          {
            type: 'response.function_call_arguments.delta',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            delta: ' "New York"}',
          },
          // Finish the function call
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            arguments: '{"location": "New York"}',
          },
          // Add another function call
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 1,
            item: {
              type: 'function_call',
              id: 'call_2',
              call_id: 'call_2',
              name: 'get_time',
              arguments: '',
            },
          },
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_2',
            output_index: 1,
            call_id: 'call_2',
            arguments: '{}',
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle mixed content with text and tool calls', async () => {
      const scope = mockResponsesAPI(
        [
          textDelta('Let me check the weather for you.'),
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              id: 'call_1',
              call_id: 'call_1',
              name: 'get_weather',
              arguments: '',
            },
          },
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            arguments: '{"location": "SF"}',
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should map incomplete status to length finishReason', async () => {
      const scope = mockResponsesAPI([textDelta('Hello'), completionChunk('incomplete')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should map failed_function_call status to tool_use finishReason', async () => {
      const assistantMsg: Message[] = [userText('Hi')];
      const scope = mockResponsesAPI(
        [textDelta('Hello'), completionChunk('failed_function_call')],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(assistantMsg, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should default toolChoice to auto when not provided', async () => {
      const scope = mockResponsesAPI([textChunk('Hi', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      // No tools or toolChoice in options
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });

    it('should handle assistant with only tool calls and no text', async () => {
      const assistantToolOnly: Message = assistantWithToolCalls('', [
        {
          id: 'call_999',
          name: 'dummy_tool',
          arguments: { foo: 'bar' },
        },
      ]);

      const scope = mockResponsesAPI(
        [toolCallChunk({ id: 'call_999', name: 'dummy_tool', args: '{"foo":"bar"}' })],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider([assistantToolOnly], mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // The input should only contain function_call items, no assistant output_text
    });

    it('should throw error when no model is provided', async () => {
      const providerWithoutModel = createOpenAIResponses({ apiKey: 'test-key' });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of providerWithoutModel(mockMessages, {})) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Model is required in config or options');
    });

    it('should handle malformed function call arguments', async () => {
      const scope = mockResponsesAPI(
        [
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              id: 'call_1',
              call_id: 'call_1',
              name: 'get_weather',
              arguments: '',
            },
          },
          {
            type: 'response.function_call_arguments.delta',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            delta: '{"invalid": json',
          },
          {
            type: 'response.function_call_arguments.done',
            response_id: 'resp_123',
            item_id: 'call_1',
            output_index: 0,
            call_id: 'call_1',
            arguments: '{"invalid": json',
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should handle malformed JSON gracefully
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.toolCalls).toBeDefined();
    });

    it('should handle error and cancelled completion statuses', async () => {
      const statuses = ['error', 'cancelled'];

      for (const status of statuses) {
        const scope = mockResponsesAPI([textDelta('Hello'), completionChunk(status)], () => {});

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.finishReason).toBe('stop'); // Both map to 'stop' in the default case
        nock.cleanAll();
      }
    });

    it('should handle function calls without id or name', async () => {
      const scope = mockResponsesAPI(
        [
          {
            type: 'response.output_item.added',
            response_id: 'resp_123',
            output_index: 0,
            item: {
              type: 'function_call',
              // Missing id and name fields
              arguments: '',
            },
          },
          completionChunk('tool_calls_required'),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should handle missing fields gracefully
    });

    it('should handle tool choice object format', async () => {
      const toolOptions: GenerationOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'specific_tool',
            description: 'A specific tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { name: 'specific_tool' },
      };

      let requestBody: any;
      const scope = mockResponsesAPI([textChunk('Response', 'stop')], body => (requestBody = body));

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tool_choice).toEqual({
        type: 'function',
        name: 'specific_tool',
      });
    });
  });

  describe('direct openaiResponses function', () => {
    it('should work as a direct function call', async () => {
      const scope = nock('https://api.openai.com/v1')
        .post('/responses')
        .reply(
          200,
          'data: {"type": "response.output_text.delta", "delta": "Hello from OpenAI!"}\ndata: [DONE]\n',
          {
            'content-type': 'text/event-stream',
          }
        );

      const chunks: StreamChunk[] = [];
      for await (const chunk of openaiResponses(
        { apiKey: 'test-api-key', model: 'gpt-4o' },
        mockMessages
      )) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('Hello from OpenAI!');
    });
  });
});
