import { GoogleGeminiProvider } from '../../src/providers/google';
import type { Message, GoogleOptions, StreamChunk } from '../../src/types';
import nock from 'nock';
import { Readable } from 'node:stream';
import {
  userText,
  systemText,
  userImage,
  assistantWithToolCalls,
  toolResult,
} from '../../src/utils';
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
  const mockConfig: GoogleOptions = {
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

  describe('constructor', () => {});

  describe('generate', () => {
    const mockMessages: Message[] = [userText('Hello')];

    const mockOptions: GoogleOptions = {
      model: 'gemini-1.5-pro',
      maxOutputTokens: 100,
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
      const toolOptions: GoogleOptions = {
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

    it('should handle tool choice none', async () => {
      const toolOptions: GoogleOptions = {
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
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toBeDefined();
      expect(requestBody.toolConfig.functionCallingConfig.mode).toBe('NONE');
    });

    it('should handle tool choice required', async () => {
      const toolOptions: GoogleOptions = {
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
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toBeDefined();
      expect(requestBody.toolConfig.functionCallingConfig.mode).toBe('ANY');
    });

    it('should handle tool choice with specific tool', async () => {
      const toolOptions: GoogleOptions = {
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
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toBeDefined();
      expect(requestBody.toolConfig.functionCallingConfig.mode).toBe('ANY');
      expect(requestBody.toolConfig.functionCallingConfig.allowedFunctionNames).toEqual([
        'specific_tool',
      ]);
    });

    it('should handle tool choice with undefined/default', async () => {
      const toolOptions: GoogleOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        // toolChoice is undefined
      };

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // When toolChoice is undefined, toolConfig might not be set at all
      expect(requestBody.toolConfig?.functionCallingConfig?.mode || 'AUTO').toBe('AUTO');
    });

    it('should handle assistant messages with tool calls', async () => {
      const messagesWithToolCalls: Message[] = [
        userText('What is the weather in SF?'),
        assistantWithToolCalls('I will check the weather for you.', [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'SF' },
          },
        ]),
        toolResult('call_123', 'Sunny, 72°F'),
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
              name: 'call_123',
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

    it('should handle different finish reasons', async () => {
      const finishReasonTests = [
        { reason: 'MAX_TOKENS', expected: 'length' },
        { reason: 'TOOL_CODE_EXECUTED', expected: 'tool_use' },
        { reason: 'UNKNOWN_REASON', expected: 'stop' },
      ];

      for (const { reason, expected } of finishReasonTests) {
        const customChunk = {
          candidates: [
            {
              finishReason: reason,
              content: { parts: [{ text: 'test' }] },
            },
          ],
        };

        const scope = mockGoogleGeneration('gemini-1.5-pro', [customChunk], () => {});

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider.generate(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        expect(chunks[0].finishReason).toBe(expected);
      }
    });

    it('should handle empty or invalid chunks gracefully', async () => {
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [
          {}, // empty chunk
          { candidates: [] }, // no candidates
          { candidates: [{}] }, // candidate without content
          { candidates: [{ content: {} }] }, // content without parts
          googleTextChunk('valid'),
          googleStopChunk(),
        ],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should only get the valid chunks
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('valid');
      expect(chunks[1].finishReason).toBe('stop');
    });

    it('should handle all generation options', async () => {
      const fullOptions: GoogleOptions = {
        model: 'gemini-1.5-pro',
        maxOutputTokens: 200,
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

    it('should handle messages with unknown roles', async () => {
      const messagesWithUnknownRole: Message[] = [
        // @ts-expect-error - testing edge case
        { role: 'unknown', content: [{ type: 'text', text: 'test' }] },
        userText('Hello'),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithUnknownRole, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should filter out unknown role and only include user message
      expect(requestBody.contents).toHaveLength(1);
      expect(requestBody.contents[0].role).toBe('user');
    });

    it('should handle tool choice edge cases', async () => {
      // Test the fallback case for ToolChoiceHandler
      const toolOptions: GoogleOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: 'invalid_value' as any,
      };

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should fall back to AUTO mode
      expect(requestBody.toolConfig.functionCallingConfig.mode).toBe('AUTO');
    });

    it('should handle empty tool calls in streaming response', async () => {
      const chunkWithEmptyToolCall = {
        candidates: [
          {
            content: {
              parts: [{ functionCall: { name: '', args: {} } }],
            },
          },
        ],
      };

      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [chunkWithEmptyToolCall, googleStopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should handle empty tool call gracefully
      expect(chunks).toHaveLength(2);
    });

    it('should fallback to image/jpeg for unknown image MIME types', async () => {
      const messagesWithUnknownImage: Message[] = [
        userImage('Check image', 'data:application/octet-stream;base64,abc123'),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Looks like an image'), googleStopChunk()],
        body => (requestBody = body)
      );

      for await (const _ of provider.generate(messagesWithUnknownImage, mockOptions)) {
        void _; // consume stream
      }

      expect(scope.isDone()).toBe(true);
      const parts = requestBody.contents[0].parts;
      // Second part should be the image inlineData with default mimeType image/jpeg
      expect(parts[1].inlineData.mimeType).toBe('image/jpeg');
    });
  });
});
