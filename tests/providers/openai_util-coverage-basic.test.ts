import { OpenAIMessageTransformer, OpenAIRequestBuilder } from '../../src/providers/openai_util';
import type { Message, OpenAIOptions, OpenAIResponsesOptions } from '../../src/types';

describe('OpenAI Utils - Basic Coverage Tests', () => {
  describe('OpenAIMessageTransformer edge cases', () => {
    it('should handle unsupported message roles in chat completions', () => {
      const messages = [
        {
          role: 'developer' as any,
          content: [{ type: 'text' as const, text: 'Test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toChatCompletions(messages)).toThrow(
        "Unsupported message role 'developer' for OpenAI Chat provider"
      );
    });

    it('should handle unsupported message roles in responses', () => {
      const messages = [
        {
          role: 'developer' as any,
          content: [{ type: 'text' as const, text: 'Test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toResponses(messages)).toThrow(
        "Unsupported message role 'developer' for OpenAI Responses provider"
      );
    });

    it('should handle content parts that are not text or image in chat', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'tool_result', toolCallId: 'call_123', result: 'result' } as any,
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);
      expect(result[0].content).toHaveLength(1); // Only text should be included
    });

    it('should handle content parts that are not text or image in responses', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'tool_result', toolCallId: 'call_123', result: 'result' } as any,
          ],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);
      const firstResult = result[0];
      if ('content' in firstResult) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(firstResult.content).toHaveLength(1); // Only text should be included
      }
    });

    it('should handle assistant messages without tool calls in responses', () => {
      const messages: Message[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ];

      const result = OpenAIMessageTransformer.toResponses(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: [{ type: 'input_text', text: 'Hello' }],
      });
    });

    it('should handle empty text content extraction', () => {
      const messages: Message[] = [
        {
          role: 'system',
          content: [], // Empty content
        },
      ];

      const result = OpenAIMessageTransformer.toChatCompletions(messages);
      expect(result[0].content).toBe('');
    });
  });

  describe('OpenAIRequestBuilder tool choice formatting', () => {
    it('should handle undefined tool choice for chat', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: undefined,
        } as OpenAIOptions
      );

      // When toolChoice is undefined, tool_choice should be set to 'auto' or be undefined
      expect(params.tool_choice === 'auto' || params.tool_choice === undefined).toBe(true);
    });

    it('should handle string tool choice for chat', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: 'required',
        } as OpenAIOptions
      );

      expect(params.tool_choice).toBe('required');
    });

    it('should handle object tool choice for chat', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'specific_tool', description: 'test', parameters: {} }],
          toolChoice: { name: 'specific_tool' },
        } as OpenAIOptions
      );

      expect(params.tool_choice).toEqual({
        type: 'function',
        function: { name: 'specific_tool' },
      });
    });

    it('should handle undefined tool choice for responses', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: undefined,
        } as OpenAIResponsesOptions
      );

      // When toolChoice is undefined, tool_choice should be set to 'auto' or be undefined
      expect(params.tool_choice === 'auto' || params.tool_choice === undefined).toBe(true);
    });

    it('should handle "none" tool choice for responses', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: 'none',
        } as OpenAIResponsesOptions
      );

      expect(params.tool_choice).toBe('auto'); // "none" maps to "auto" for responses
    });

    it('should handle string tool choice for responses', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: 'required',
        } as OpenAIResponsesOptions
      );

      expect(params.tool_choice).toBe('required');
    });

    it('should handle object tool choice for responses', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'specific_tool', description: 'test', parameters: {} }],
          toolChoice: { name: 'specific_tool' },
        } as OpenAIResponsesOptions
      );

      expect(params.tool_choice).toEqual({
        type: 'function',
        name: 'specific_tool',
      });
    });

    it('should handle no tool choice with tools present', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          tools: [{ name: 'test', description: 'test', parameters: {} }],
        } as OpenAIOptions
      );

      expect(params.tool_choice === 'auto' || params.tool_choice === undefined).toBe(true);
    });
  });
});
