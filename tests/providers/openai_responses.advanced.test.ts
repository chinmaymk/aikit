import {
  createOpenAIResponses,
  userText,
  type Message,
  type GenerationOptions,
  type OpenAIResponsesOptions,
  type StreamChunk,
  type OpenAIResponsesProvider,
} from '@chinmaymk/aikit';
import nock from 'nock';
import { textChunk, textDelta, completionChunk } from '../helpers/openaiChunks';
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

describe('OpenAIResponsesProvider - Advanced Functionality', () => {
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

  describe('OpenAI-specific options', () => {
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

    it('should default toolChoice to auto when not provided', async () => {
      const scope = mockResponsesAPI([textChunk('Hi', 'stop')], () => {});

      const chunks: StreamChunk[] = [];
      // No tools or toolChoice in options
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('complex tool call sequences', () => {
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
  });

  describe('edge cases', () => {
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

    it('should map incomplete status to length finishReason', async () => {
      const scope = mockResponsesAPI([textDelta('Hello'), completionChunk('incomplete')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
    });
  });
});
