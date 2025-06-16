import { OpenAIMessageTransformer } from '../../src/providers/openai_transformers';
import type { Message } from '../../src/types';

describe('OpenAI Message Transformer', () => {
  describe('toChatCompletions', () => {
    it('should transform system messages', () => {
      const messages: Message[] = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are a helpful assistant.' }],
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);

      expect(result).toEqual([
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ]);
    });

    it('should transform tool messages', () => {
      const messages: Message[] = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool_result',
              toolCallId: 'call_123',
              result: 'Function completed successfully',
            },
            { type: 'tool_result', toolCallId: 'call_456', result: 'Another result' },
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);

      expect(result).toEqual([
        {
          role: 'tool',
          tool_call_id: 'call_123',
          content: 'Function completed successfully',
        },
        {
          role: 'tool',
          tool_call_id: 'call_456',
          content: 'Another result',
        },
      ]);
    });

    it('should transform user messages with text and images', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', image: 'data:image/jpeg;base64,abc123' },
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
          ],
        },
      ]);
    });

    it('should transform assistant messages with tool calls', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'I will call a function for you.' }],
          toolCalls: [
            {
              id: 'call_123',
              name: 'get_weather',
              arguments: { location: 'New York' },
            },
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: 'I will call a function for you.',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ location: 'New York' }),
              },
            },
          ],
        },
      ]);
    });

    it('should throw error for unsupported message role', () => {
      const messages: Message[] = [
        {
          role: 'unknown' as any,
          content: [{ type: 'text', text: 'test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toChatCompletions(messages)).toThrow(
        "Unsupported message role 'unknown' for OpenAI Chat provider"
      );
    });
  });

  describe('toResponses', () => {
    it('should transform system messages', () => {
      const messages: Message[] = [
        {
          role: 'system',
          content: [{ type: 'text', text: 'You are a helpful assistant.' }],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);

      expect(result).toEqual([
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are a helpful assistant.',
            },
          ],
        },
      ]);
    });

    it('should transform tool messages', () => {
      const messages: Message[] = [
        {
          role: 'tool',
          content: [{ type: 'tool_result', toolCallId: 'call_123', result: 'Function completed' }],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);

      expect(result).toEqual([
        {
          type: 'function_call_output',
          call_id: 'call_123',
          output: 'Function completed',
        },
      ]);
    });

    it('should transform user messages with text and images', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image' },
            { type: 'image', image: 'data:image/png;base64,xyz789' },
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Analyze this image' },
            { type: 'input_image', image_url: 'data:image/png;base64,xyz789' },
          ],
        },
      ]);
    });

    it('should transform assistant messages with tool calls', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'I will help you with that.' }],
          toolCalls: [
            {
              id: 'call_456',
              name: 'search_web',
              arguments: { query: 'latest news' },
            },
            {
              id: 'call_789',
              name: 'get_time',
              arguments: {},
            },
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);

      expect(result).toEqual([
        {
          type: 'function_call',
          call_id: 'call_456',
          name: 'search_web',
          arguments: JSON.stringify({ query: 'latest news' }),
        },
        {
          type: 'function_call',
          call_id: 'call_789',
          name: 'get_time',
          arguments: JSON.stringify({}),
        },
      ]);
    });

    it('should transform assistant messages without tool calls', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello, how can I help you today?' }],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: [{ type: 'input_text', text: 'Hello, how can I help you today?' }],
        },
      ]);
    });

    it('should throw error for unsupported message role', () => {
      const messages: Message[] = [
        {
          role: 'invalid' as any,
          content: [{ type: 'text', text: 'test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toResponses(messages)).toThrow(
        "Unsupported message role 'invalid' for OpenAI Responses provider"
      );
    });
  });

  describe('private methods', () => {
    it('should extract all text content correctly', () => {
      const content = [
        { type: 'text' as const, text: 'First line' },
        { type: 'text' as const, text: 'Second line' },
        { type: 'image' as const, image: 'data:image/jpeg;base64,abc' },
      ];

      const result = OpenAIMessageTransformer['extractAllTextContent'](content);
      expect(result).toBe('First line\nSecond line');
    });

    it('should handle empty text content', () => {
      const content = [{ type: 'image' as const, image: 'data:image/jpeg;base64,abc' }];

      const result = OpenAIMessageTransformer['extractAllTextContent'](content);
      expect(result).toBe('');
    });

    it('should build chat content parts correctly', () => {
      const content = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'image' as const, image: 'data:image/jpeg;base64,abc' },
        { type: 'text' as const, text: 'World' },
      ];

      const result = OpenAIMessageTransformer['buildChatContentParts'](content);

      expect(result).toEqual([
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
        { type: 'text', text: 'World' },
      ]);
    });

    it('should build responses content parts correctly', () => {
      const content = [
        { type: 'text' as const, text: 'Analyze this' },
        { type: 'image' as const, image: 'data:image/png;base64,xyz' },
      ];

      const result = OpenAIMessageTransformer['buildResponsesContentParts'](content);

      expect(result).toEqual([
        { type: 'input_text', text: 'Analyze this' },
        { type: 'input_image', image_url: 'data:image/png;base64,xyz' },
      ]);
    });
  });
});
