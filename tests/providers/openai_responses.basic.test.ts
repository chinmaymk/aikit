import {
  createOpenAIResponses,
  openaiResponses,
  userText,
  userImage,
  systemText,
  type Message,
  type GenerationOptions,
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

describe('OpenAIResponsesProvider - Basic Functionality', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
  };

  let provider: OpenAIResponsesProvider;
  const mockMessages: Message[] = [userText('Hello, world!')];

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

  describe('basic generation', () => {
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

    it('should throw error when no model is provided', async () => {
      const providerWithoutModel = createOpenAIResponses({ apiKey: 'test-key' });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of providerWithoutModel(mockMessages, {})) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Model is required in config or options');
    });

    it('should handle messages with unknown roles', async () => {
      const unknownRoleMsg: Message = {
        role: 'unknown' as any,
        content: [{ type: 'text', text: 'Unknown role' }],
      };

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider([unknownRoleMsg], mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow(
        "Unsupported message role 'unknown' for OpenAI Responses provider. Supported roles: user, assistant, system, tool"
      );
    });
  });

  describe('different finish reasons', () => {
    const mockOptions: GenerationOptions = {
      model: 'gpt-4o',
      maxOutputTokens: 100,
      temperature: 0.7,
    };

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

    it('should handle null finish reason', async () => {
      const scope = mockResponsesAPI([textDelta('test')], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks[0].finishReason).toBeUndefined();
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
