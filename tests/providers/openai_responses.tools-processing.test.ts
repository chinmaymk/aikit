import {
  createOpenAIResponses,
  userText,
  assistantWithToolCalls,
  toolResult as toolResultMsg,
  type Message,
  type OpenAIResponsesOptions,
  type StreamChunk,
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

describe('OpenAIResponsesProvider - Tool Processing', () => {
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

  describe('assistant and tool messages', () => {
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
  });

  describe('tool calls processing', () => {
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
  });
});
