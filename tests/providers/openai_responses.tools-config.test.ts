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
import { textChunk, toolCallChunk } from '../helpers/openaiChunks';
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

describe('OpenAIResponsesProvider - Tools Configuration', () => {
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

  describe('tools configuration', () => {
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
  });
});
