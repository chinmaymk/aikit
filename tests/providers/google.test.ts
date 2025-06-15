import {
  createGoogle,
  google,
  userText,
  systemText,
  userImage,
  assistantWithToolCalls,
  toolResult,
  type Message,
  type GenerationOptions,
  type GoogleOptions,
  type StreamChunk,
  type FinishReason,
  type GoogleProvider,
} from '@chinmaymk/aikit';
import nock from 'nock';
import { googleTextChunk, googleStopChunk, googleToolCallChunk } from '../helpers/googleChunks';
import { createGoogleSSEStream } from '../helpers/stream';

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

describe('GoogleProvider', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    timeout: 30000,
  };

  let provider: GoogleProvider;
  const mockMessages: Message[] = [userText('Hello')];
  const mockOptions: GoogleOptions = {
    model: 'gemini-1.5-pro',
    apiKey: 'test-api-key',
  };

  beforeAll(() => {
    nock.disableNetConnect();
  });

  beforeEach(() => {
    provider = createGoogle(mockConfig);
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  describe('generate', () => {
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
      for await (const chunk of provider(mockMessages, mockOptions)) {
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
      for await (const chunk of provider(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.systemInstruction).toEqual({
        parts: [{ text: 'You are a helpful assistant' }],
      });
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
      for await (const chunk of provider(messagesWithImage, mockOptions)) {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(messagesWithToolCalls, mockOptions)) {
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
              name: 'get_weather',
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
      for await (const chunk of provider(mockMessages, mockOptions)) {
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
        for await (const chunk of provider(mockMessages, mockOptions)) {
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
      for await (const chunk of provider(mockMessages, mockOptions)) {
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
      for await (const chunk of provider(mockMessages, fullOptions)) {
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
      const invalidMessage = {
        role: 'unknown' as any,
        content: [{ type: 'text' as const, text: 'test' }],
      };

      let requestBody: any;
      mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of provider([invalidMessage], mockOptions)) {
          chunks.push(chunk);
        }
      }).rejects.toThrow("Unsupported message role 'unknown' for Google provider");
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
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
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should handle empty tool call gracefully
      expect(chunks).toHaveLength(2);
    });

    it('should fallback to image/jpeg for unknown image MIME types', async () => {
      const messagesWithUnknownImage: Message[] = [
        userImage('Check image', 'data:image/unknown-format;base64,abc123'),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Looks like an image'), googleStopChunk()],
        body => (requestBody = body)
      );

      for await (const _ of provider(messagesWithUnknownImage, mockOptions)) {
        void _; // consume stream
      }

      expect(scope.isDone()).toBe(true);
      const parts = requestBody.contents[0].parts;
      // Second part should be the image inlineData with default mimeType image/jpeg
      expect(parts[1].inlineData.mimeType).toBe('image/jpeg');
    });

    it('should throw error when no model is provided', async () => {
      const providerWithoutModel = createGoogle({ apiKey: 'test-key' });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of providerWithoutModel(mockMessages, {})) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Model is required in config or options');
    });

    it('should handle safety-related finish reasons', async () => {
      const safetyReasons = ['SAFETY', 'RECITATION', 'OTHER'];

      for (const reason of safetyReasons) {
        const chunk = {
          candidates: [
            {
              finishReason: reason,
              content: { parts: [{ text: 'stopped for safety' }] },
            },
          ],
        };

        const scope = mockGoogleGeneration('gemini-1.5-pro', [chunk], () => {});

        const chunks: StreamChunk[] = [];
        for await (const chunk of provider(mockMessages, mockOptions)) {
          chunks.push(chunk);
        }

        expect(scope.isDone()).toBe(true);
        expect(chunks[0].finishReason).toBe('stop'); // All safety reasons map to 'stop'
        nock.cleanAll();
      }
    });

    it('should handle tool results with empty responses', async () => {
      const emptyToolResults: Message[] = [
        userText('Call tool'),
        assistantWithToolCalls('I will call the tool.', [
          { id: 'call_123', name: 'test_tool', arguments: { param: 'value' } },
        ]),
        toolResult('call_123', ''), // Empty tool result
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Got empty result'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(emptyToolResults, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should include the empty function response
      const toolResponseContent = requestBody.contents.find((c: any) => c.role === 'function');
      expect(toolResponseContent.parts[0].functionResponse.response).toEqual({ result: '' });
    });

    it('should handle tool choice with specific function name', async () => {
      const toolOptions: GoogleOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'specific_tool',
            description: 'Specific tool',
            parameters: { type: 'object', properties: {} },
          },
        ],
        toolChoice: { name: 'specific_tool' } as any,
      };

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toEqual({
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: ['specific_tool'],
        },
      });
    });

    it('should handle tool choice "required"', async () => {
      const toolOptions: GoogleOptions = {
        ...mockOptions,
        tools: [
          {
            name: 'required_tool',
            description: 'Required tool',
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toEqual({
        functionCallingConfig: { mode: 'ANY' },
      });
    });

    it('should handle tool choice "none"', async () => {
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
      for await (const chunk of provider(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.toolConfig).toEqual({
        functionCallingConfig: { mode: 'NONE' },
      });
    });

    it('should handle images with unknown MIME types', async () => {
      const messagesWithUnknownImage: Message[] = [
        userImage('What is this?', 'data:application/unknown;base64,iVBORw0KGgo='),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('I see an image'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithUnknownImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      const imagePart = requestBody.contents[0].parts.find((part: any) => part.inlineData);
      // Image may be filtered out or processed with fallback MIME type
      if (imagePart?.inlineData) {
        expect(imagePart.inlineData.mimeType).toBe('image/jpeg');
      } else {
        // Image was likely filtered out due to unknown MIME type
        expect(requestBody.contents[0].parts).toHaveLength(1);
        expect(requestBody.contents[0].parts[0].text).toBe('What is this?');
      }
    });

    it('should handle images with no MIME type prefix', async () => {
      const messagesWithNoMimeImage: Message[] = [
        userImage('What is this?', 'data:notimage/test;base64,iVBORw0KGgo='),
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('I see an image'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithNoMimeImage, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      const imagePart2 = requestBody.contents[0].parts.find((part: any) => part.inlineData);
      // Image may be filtered out or processed with fallback MIME type
      if (imagePart2?.inlineData) {
        expect(imagePart2.inlineData.mimeType).toBe('image/jpeg');
      } else {
        // Image was likely filtered out due to invalid MIME type
        expect(requestBody.contents[0].parts).toHaveLength(1);
        expect(requestBody.contents[0].parts[0].text).toBe('What is this?');
      }
    });

    it('should handle chunks with usage but no candidates', async () => {
      const usageOnlyChunk = {
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
          cachedContentTokenCount: 2,
        },
      };

      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [usageOnlyChunk, googleTextChunk('Response'), googleStopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks[0].usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        cacheTokens: 2,
      });
    });

    it('should handle combined text content from multiple text parts', async () => {
      const messagesWithMultipleText: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part' },
          ],
        },
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithMultipleText, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.contents[0].parts[0].text).toBe('First part\nSecond part');
    });

    it('should handle empty text content', async () => {
      const messagesWithEmptyText: Message[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: '   ' }], // whitespace only
        },
      ];

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(messagesWithEmptyText, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      // Should not include text part if it's empty after trimming
      expect(requestBody.contents[0].parts).toEqual([]);
    });

    it('should handle generation config with all options', async () => {
      const fullOptions: GoogleOptions = {
        ...mockOptions,
        presencePenalty: 0.1,
        frequencyPenalty: 0.2,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
        seed: 12345,
        responseLogprobs: true,
        logprobs: 5,
        audioTimestamp: false,
      };

      let requestBody: any;
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Response'), googleStopChunk()],
        body => (requestBody = body)
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, fullOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(requestBody.generationConfig).toMatchObject({
        presencePenalty: 0.1,
        frequencyPenalty: 0.2,
        responseMimeType: 'application/json',
        responseSchema: { type: 'object' },
        seed: 12345,
        responseLogprobs: true,
        logprobs: 5,
        audioTimestamp: false,
      });
    });

    it('should handle missing API key in config', () => {
      expect(() => {
        createGoogle({ apiKey: '' } as any);
      }).toThrow('Google API key is required');
    });

    it('should handle missing model in options', async () => {
      const providerWithoutModel = createGoogle({ apiKey: 'test-key' });

      await expect(async () => {
        const chunks: StreamChunk[] = [];
        for await (const chunk of providerWithoutModel(mockMessages, {})) {
          chunks.push(chunk);
        }
      }).rejects.toThrow('Model is required in config or options');
    });

    it('should handle usage metadata with missing fields', async () => {
      const partialUsageChunk = {
        usageMetadata: {
          promptTokenCount: 10,
          // Missing other fields
        },
      };

      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [partialUsageChunk, googleTextChunk('Response'), googleStopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks[0].usage).toEqual({
        inputTokens: 10,
      });
    });

    it('should handle finish reason mapping edge cases', async () => {
      const unknownFinishChunk = {
        candidates: [
          {
            finishReason: 'SOME_UNKNOWN_REASON',
            content: { parts: [{ text: 'test' }] },
          },
        ],
      };

      const scope = mockGoogleGeneration('gemini-1.5-pro', [unknownFinishChunk], () => {});

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks[0].finishReason).toBe('stop'); // default mapping
    });
  });

  describe('direct google function', () => {
    it('should work as a direct function call', async () => {
      const scope = mockGoogleGeneration(
        'gemini-1.5-pro',
        [googleTextChunk('Hello from Google!'), googleStopChunk()],
        () => {}
      );

      const chunks: StreamChunk[] = [];
      for await (const chunk of google(mockMessages, {
        apiKey: 'test-api-key',
        model: 'gemini-1.5-pro',
      })) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Hello from Google!');
      expect(chunks[1].finishReason).toBe('stop');
    });
  });
});
