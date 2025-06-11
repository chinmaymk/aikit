import { GoogleGeminiProvider } from '../../src/providers/google';
import type { Message, GoogleGenerationOptions, GoogleConfig, StreamChunk } from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  systemText,
  userImage,
  assistantWithToolCalls,
  toolResult as toolResultMsg,
} from '../../src/createFuncs';
import { googleTextChunk, googleStopChunk, googleToolCallChunk } from '../helpers/googleChunks';

/**
 * Helper to create a chunked SSE response body for the Google Gemini streaming API.
 */
function createGoogleSSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  chunks.forEach(chunk => {
    stream.push(`data: ${JSON.stringify(chunk)}\n`);
  });
  stream.push(null); // end of stream
  return stream;
}

/**
 * Set up nock to intercept the Google Gemini request and return the provided chunks.
 */
function mockGoogleGeneration(
  model: string,
  expectedChunks: any[],
  captureBody: (body: any) => void
): nock.Scope {
  return nock('https://generativelanguage.googleapis.com')
    .post(`/v1beta/models/${model}:streamGenerateContent`, body => {
      captureBody(body);
      return true;
    })
    .query(true) // Accept any query parameters (API key, alt=sse)
    .reply(200, () => createGoogleSSEStream(expectedChunks), {
      'Content-Type': 'text/event-stream',
    });
}

describe('GoogleGeminiProvider', () => {
  const mockConfig: GoogleConfig = {
    apiKey: 'test-api-key',
  };

  let provider: GoogleGeminiProvider;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    provider = new GoogleGeminiProvider(mockConfig);
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('constructor', () => {
    it('should initialize with correct models', () => {
      expect(provider.models).toEqual([
        'gemini-2.5-pro-preview-06-05',
        'gemini-2.5-pro-preview-05-06',
        'gemini-2.5-pro-preview-03-25',
        'gemini-2.5-flash-preview-05-20',
        'gemini-2.5-flash-preview-native-audio-dialog',
        'gemini-2.5-flash-exp-native-audio-thinking-dialog',
        'gemini-2.5-flash-preview-tts',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.0-flash-live-001',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.0-pro',
        'gemini-pro',
      ]);
    });
  });

  describe('generate', () => {
    const mockMessages: Message[] = [userText('Hello')];

    const mockOptions: GoogleGenerationOptions = {
      model: 'gemini-1.5-pro',
      maxTokens: 100,
      temperature: 0.7,
    };

    it('should call Google API with correct parameters', async () => {
      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Hello!'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody).toMatchObject({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      });
    });

    it('should handle system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        systemText('You are a helpful assistant'),
        ...mockMessages,
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Hi!'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.systemInstruction).toBe('You are a helpful assistant');
      expect(requestBody.contents).toEqual([
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ]);
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        userImage('What is in this image?', 'data:image/jpeg;base64,iVBORw0KGgo='),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('I see an image'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.contents[0].parts).toEqual([
        { text: 'What is in this image?' },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: 'iVBORw0KGgo=',
          },
        },
      ]);
    });

    it('should handle tools configuration', async () => {
      const toolOptions: GoogleGenerationOptions = {
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
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleToolCallChunk('get_weather', { location: 'SF' })],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.tools).toEqual([
        {
          functionDeclarations: [
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
        },
      ]);
    });

    it('should handle assistant messages with tool calls', async () => {
      const messagesWithToolCalls: Message[] = [
        userText('What is the weather in SF?'),
        assistantWithToolCalls('I will check the weather for you.', {
          id: 'call_123',
          name: 'get_weather',
          arguments: { location: 'SF' },
        }),
        toolResultMsg('call_123', 'Sunny, 72°F'),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('The weather is sunny'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithToolCalls, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.contents).toHaveLength(3);

      // Check assistant message with tool call
      expect(requestBody.contents[1]).toEqual({
        role: 'model',
        parts: [
          { text: 'I will check the weather for you.' },
          { functionCall: { name: 'get_weather', args: { location: 'SF' } } },
        ],
      });

      // Check tool result
      expect(requestBody.contents[2]).toEqual({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: 'call',
              response: { result: 'Sunny, 72°F' },
            },
          },
        ],
      });
    });

    it('should process streaming response correctly', async () => {
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Hello'), googleTextChunk(' there!'), googleStopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toMatchObject({
        content: 'Hello',
        delta: 'Hello',
      });
      expect(chunks[1]).toMatchObject({
        content: 'Hello there!',
        delta: ' there!',
      });
      expect(chunks[2]).toMatchObject({
        finishReason: 'stop',
      });
    });

    it('should handle all generation options', async () => {
      const fullOptions: GoogleGenerationOptions = {
        model: 'gemini-1.5-pro',
        maxTokens: 200,
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        stopSequences: ['END'],
        candidateCount: 1,
      };

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, fullOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.generationConfig).toEqual({
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 200,
        stopSequences: ['END'],
        candidateCount: 1,
      });
    });
  });
});
