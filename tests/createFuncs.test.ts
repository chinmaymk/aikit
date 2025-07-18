import {
  userText,
  systemText,
  assistantText,
  userImage,
  userMultipleImages,
  userContent,
  assistantWithToolCalls,
  toolResult,
  textContent,
  imageContent,
  toolResultContent,
  createTool,
  collectDeltas,
  processStream,
  printStream,
  type Content,
} from '@chinmaymk/aikit';
import { OpenAIClientFactory } from '@chinmaymk/aikit/providers/openai_client';
import { createOpenAI } from '@chinmaymk/aikit';

describe('Utils', () => {
  describe('Message Creation Helpers', () => {
    it('should create user messages', () => {
      expect(userText('Hello')).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });

    it('should create system messages', () => {
      expect(systemText('You are helpful')).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are helpful' }],
      });
    });

    it('should create assistant messages', () => {
      expect(assistantText('How can I help?')).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'How can I help?' }],
      });
    });

    it('should create user messages with images', () => {
      expect(userImage('What is this?', 'image_data')).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', image: 'image_data' },
        ],
      });
    });

    it('should create user messages with multiple images', () => {
      const images = ['img1', 'img2'];
      expect(userMultipleImages('Compare', images)).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'Compare' },
          { type: 'image', image: 'img1' },
          { type: 'image', image: 'img2' },
        ],
      });
    });

    it('should create messages with custom content', () => {
      const content: Content[] = [{ type: 'text', text: 'Hello' }];
      expect(userContent(content)).toEqual({
        role: 'user',
        content,
      });
    });

    it('should create assistant messages with tool calls', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: {} }];
      expect(assistantWithToolCalls('Let me check', toolCalls)).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'Let me check' }],
        toolCalls,
      });
    });

    it('should create tool result messages', () => {
      expect(toolResult('call_123', 'result')).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_123',
            result: 'result',
          },
        ],
      });
    });
  });

  describe('Content Creation Helpers', () => {
    it('should create text content', () => {
      expect(textContent('Hello')).toEqual({
        type: 'text',
        text: 'Hello',
      });
    });

    it('should create image content', () => {
      expect(imageContent('image_data')).toEqual({
        type: 'image',
        image: 'image_data',
      });
    });

    it('should create tool result content', () => {
      expect(toolResultContent('call_123', 'result')).toEqual({
        type: 'tool_result',
        toolCallId: 'call_123',
        result: 'result',
      });
    });
  });

  describe('Tool Creation', () => {
    it('should create tools with parameters', () => {
      const parameters = {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      };

      expect(createTool('get_weather', 'Get weather', parameters)).toEqual({
        name: 'get_weather',
        description: 'Get weather',
        parameters,
      });
    });

    it('should work with simple parameters', () => {
      const parameters = {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: [],
      };
      expect(createTool('search', 'Search', parameters)).toEqual({
        name: 'search',
        description: 'Search',
        parameters,
      });
    });
  });

  describe('Stream Functions', () => {
    async function* createMockStream(
      chunks: { delta: string; content: string; finishReason?: 'stop' }[]
    ) {
      for (const chunk of chunks) {
        yield chunk;
      }
    }

    it('should collect deltas correctly', async () => {
      const chunks = [
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
      ];

      const result = await collectDeltas(createMockStream(chunks));

      expect(result).toEqual({
        content: 'Hello world',
        finishReason: 'stop',
        toolCalls: undefined,
      });
    });

    it('should process stream with handlers', async () => {
      const chunks = [
        { delta: 'Hello', content: 'Hello' },
        { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
      ];

      const onDelta = jest.fn();
      const result = await processStream(createMockStream(chunks), { onDelta });

      expect(onDelta).toHaveBeenCalledWith('Hello');
      expect(onDelta).toHaveBeenCalledWith(' world');
      expect(result.content).toBe('Hello world');
    });

    it('should print stream to stdout', async () => {
      const originalWrite = process.stdout.write;
      const originalLog = console.log;
      const mockWrite = jest.fn().mockReturnValue(true);
      const mockLog = jest.fn();

      // Mock both process.stdout.write (Node.js) and console.log (browser/fallback)
      process.stdout.write = mockWrite;
      console.log = mockLog;

      try {
        const chunks = [
          { delta: 'Hello', content: 'Hello' },
          { delta: ' world', content: 'Hello world', finishReason: 'stop' as const },
        ];

        await printStream(createMockStream(chunks));

        // In Node.js environment, should use process.stdout.write
        expect(mockWrite).toHaveBeenCalledWith('Hello');
        expect(mockWrite).toHaveBeenCalledWith(' world');
        expect(mockWrite).toHaveBeenCalledWith('\n'); // Final newline from flush
      } finally {
        process.stdout.write = originalWrite;
        console.log = originalLog;
      }
    });
  });

  describe('OpenAI Client Configuration', () => {
    it('should create client with organization and project headers', () => {
      // This test covers lines 13-14 in openai_client.ts
      const config = {
        apiKey: 'test-key',
        organization: 'org-123',
        project: 'proj-456',
        baseURL: 'https://custom.openai.com/v1',
        timeout: 5000,
        maxRetries: 3,
        mutateHeaders: (headers: Record<string, string>) => {
          headers['X-Custom'] = 'value';
        },
      };

      // Import and test the client factory directly
      const client = OpenAIClientFactory.createClient(config);

      expect(client).toBeDefined();
    });

    it('should handle missing API key in createOpenAI', async () => {
      // This covers line 44 in openai_completions.ts
      expect(() => createOpenAI({ apiKey: '' })).toThrow('OpenAI API key is required');
    });

    it('should handle missing model in openai function call', async () => {
      // This covers lines 71-72 in openai_completions.ts
      const provider = createOpenAI({ apiKey: 'test-key' });

      await expect(async () => {
        const generator = provider([{ role: 'user', content: [{ type: 'text', text: 'test' }] }]);
        for await (const chunk of generator) {
          void chunk;
          break;
        }
      }).rejects.toThrow('Model is required in config or options');
    });
  });
});
