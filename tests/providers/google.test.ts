import { GoogleGeminiProvider } from '../../src/providers/google';
import type { Message, GenerationOptions, GoogleConfig, StreamChunk } from '../../src/types';

// Mock the Google Generative AI SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: jest.fn(),
    }),
  })),
  FunctionCallingMode: {
    AUTO: 'AUTO',
    ANY: 'ANY',
    NONE: 'NONE',
  },
}));

describe('GoogleGeminiProvider', () => {
  let provider: GoogleGeminiProvider;
  let mockGenAI: any;
  let mockModel: any;
  const mockConfig: GoogleConfig = {
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    mockModel = {
      generateContentStream: jest.fn(),
    };
    mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    };
    GoogleGenerativeAI.mockReturnValue(mockGenAI);
    provider = new GoogleGeminiProvider(mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct models', () => {
      expect(provider.models).toEqual([
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro',
        'gemini-pro',
      ]);
    });

    it('should have correct provider configuration', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('generate', () => {
    const mockMessages: Message[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
    ];

    const mockOptions: GenerationOptions = {
      model: 'gemini-1.5-pro',
      maxTokens: 100,
      temperature: 0.7,
    };

    it('should call Google API with correct parameters', async () => {
      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Hello!' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topP: undefined,
          topK: undefined,
          maxOutputTokens: 100,
          stopSequences: undefined,
        },
      });

      expect(mockModel.generateContentStream).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      });
    });

    it('should handle system messages correctly', async () => {
      const messagesWithSystem: Message[] = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are a helpful assistant' }],
        },
        ...mockMessages,
      ];

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Hi!' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithSystem, mockOptions)) {
        chunks.push(chunk);
      }

      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'You are a helpful assistant',
        })
      );

      expect(mockModel.generateContentStream).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      });
    });

    it('should handle multimodal content with images', async () => {
      const messagesWithImage: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', image: 'data:image/jpeg;base64,iVBORw0KGgo=' },
          ],
        },
      ];

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'I see an image' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(messagesWithImage, mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockModel.generateContentStream.mock.calls[0][0];
      expect(call.contents[0].parts).toEqual([
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

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_weather',
                      args: { location: 'SF' },
                    },
                  },
                ],
                role: 'model',
              },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, toolOptions)) {
        chunks.push(chunk);
      }

      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
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
          ],
        })
      );
    });

    it('should handle assistant messages with tool calls', async () => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'I need to check the weather' }],
        toolCalls: [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'San Francisco' },
          },
        ],
      };

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Let me check...' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([assistantMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockModel.generateContentStream.mock.calls[0][0];
      expect(call.contents[0]).toEqual({
        role: 'model',
        parts: [
          { text: 'I need to check the weather' },
          {
            functionCall: {
              name: 'get_weather',
              args: { location: 'San Francisco' },
            },
          },
        ],
      });
    });

    it('should handle tool result messages', async () => {
      const toolResultMessage: Message = {
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'get_weather_123',
            result: '{"temperature": 72, "condition": "sunny"}',
          },
        ],
      };

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'The weather is sunny' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([toolResultMessage], mockOptions)) {
        chunks.push(chunk);
      }

      const call = mockModel.generateContentStream.mock.calls[0][0];
      expect(call.contents[0]).toEqual({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: 'get',
              response: {
                result: '{"temperature": 72, "condition": "sunny"}',
              },
            },
          },
        ],
      });
    });

    it('should process streaming response correctly', async () => {
      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Hello' }], role: 'model' },
              finishReason: null,
            },
          ],
        },
        {
          candidates: [
            {
              content: { parts: [{ text: ' there' }], role: 'model' },
              finishReason: null,
            },
          ],
        },
        {
          candidates: [
            {
              content: { parts: [{ text: '!' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, mockOptions)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toMatchObject({ delta: 'Hello', content: 'Hello' });
      expect(chunks[1]).toMatchObject({ delta: ' there', content: 'Hello there' });
      expect(chunks[2]).toMatchObject({
        delta: '!',
        content: 'Hello there!',
        finishReason: 'stop',
      });
    });

    it('should handle all generation options', async () => {
      const detailedOptions: GenerationOptions = {
        model: 'gemini-1.5-pro',
        maxTokens: 500,
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        stopSequences: ['END', 'STOP'],
      };

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Response' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate(mockMessages, detailedOptions)) {
        chunks.push(chunk);
      }

      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 500,
          stopSequences: ['END', 'STOP'],
        },
      });
    });

    it('should handle messages with unknown roles', async () => {
      const unknownRoleMessage: Message = {
        role: 'unknown' as any,
        content: [{ type: 'text', text: 'Unknown role message' }],
      };

      const mockStreamResult = createMockGoogleStream([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Response' }], role: 'model' },
              finishReason: 'STOP',
            },
          ],
        },
      ]);

      mockModel.generateContentStream.mockResolvedValue(mockStreamResult);

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([unknownRoleMessage], mockOptions)) {
        chunks.push(chunk);
      }

      // Should skip the unknown role message and generate with empty contents array
      const call = mockModel.generateContentStream.mock.calls[0][0];
      expect(call.contents).toEqual([]);
    });
  });
});

// Helper function to create mock Google streaming results
function createMockGoogleStream(responses: any[]) {
  return {
    stream: {
      async *[Symbol.asyncIterator]() {
        for (const response of responses) {
          yield response;
        }
      },
    },
  };
}
