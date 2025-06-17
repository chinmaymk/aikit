import { OpenAIMessageTransformer, OpenAIRequestBuilder } from '../../src/providers/openai_util';
import type { Message, OpenAIOptions, OpenAIResponsesOptions } from '../../src/types';

describe('OpenAI Utils - Basic Coverage Tests', () => {
  describe('OpenAIMessageTransformer edge cases', () => {
    it('should handle unsupported message roles in chat completions', () => {
      const messages = [
        {
          role: 'unknown' as any,
          content: [{ type: 'text' as const, text: 'Test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toChatCompletions(messages)).toThrow(
        "Unsupported message role 'unknown' for OpenAI Chat provider"
      );
    });

    it('should handle unsupported message roles in responses', () => {
      const messages = [
        {
          role: 'unknown' as any,
          content: [{ type: 'text' as const, text: 'Test' }],
        },
      ];

      expect(() => OpenAIMessageTransformer.toResponses(messages)).toThrow(
        "Unsupported message role 'unknown' for OpenAI Responses provider"
      );
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

  describe('OpenAIRequestBuilder parameter handling', () => {
    it('should handle all optional chat parameters', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          model: 'gpt-4',
          user: 'test-user',
          logprobs: true,
          topLogprobs: 5,
          seed: 12345,
          responseFormat: { type: 'json_object' },
          logitBias: { '123': 0.5 },
          n: 3,
          modalities: ['text'],
          audio: { voice: 'alloy', format: 'mp3' },
          maxCompletionTokens: 1000,
          prediction: { type: 'content', content: 'test' },
          webSearchOptions: { search: true },
          includeUsage: true,
        } as OpenAIOptions
      );

      expect(params.user).toBe('test-user');
      expect(params.logprobs).toBe(true);
      expect(params.top_logprobs).toBe(5);
      expect(params.seed).toBe(12345);
      expect(params.response_format).toEqual({ type: 'json_object' });
      expect(params.logit_bias).toEqual({ '123': 0.5 });
      expect(params.n).toBe(3);
      expect((params as any).modalities).toEqual(['text']);
      expect((params as any).audio).toEqual({ voice: 'alloy', format: 'mp3' });
      expect((params as any).max_completion_tokens).toBe(1000);
      expect((params as any).prediction).toEqual({ type: 'content', content: 'test' });
      expect((params as any).web_search_options).toEqual({ search: true });
      expect(params.stream_options).toEqual({ include_usage: true });
    });

    it('should handle all optional responses parameters', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          model: 'gpt-4',
          background: 'test background',
          include: ['reasoning'],
          instructions: 'test instructions',
          metadata: { key: 'value' },
          parallelToolCalls: false,
          previousResponseId: 'prev-123',
          reasoning: 'detailed',
          serviceTier: 'scale',
          store: true,
          text: 'test text',
          truncation: { type: 'truncate' },
          user: 'test-user',
        } as unknown as OpenAIResponsesOptions
      );

      expect(params.background).toBe('test background');
      expect(params.include).toEqual(['reasoning']);
      expect(params.instructions).toBe('test instructions');
      expect(params.metadata).toEqual({ key: 'value' });
      expect(params.parallel_tool_calls).toBe(false);
      expect(params.previous_response_id).toBe('prev-123');
      expect(params.reasoning).toBe('detailed');
      expect(params.service_tier).toBe('scale');
      expect(params.store).toBe(true);
      expect(params.text).toBe('test text');
      expect(params.truncation).toEqual({ type: 'truncate' });
      expect(params.user).toBe('test-user');
    });

    it('should handle empty tools array', () => {
      const params = OpenAIRequestBuilder.buildChatCompletionParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          model: 'gpt-4',
          tools: [],
        } as OpenAIOptions
      );

      expect(params.tools).toBeUndefined();
      expect(params.tool_choice).toBeUndefined();
    });

    it('should handle empty tools array for responses', () => {
      const params = OpenAIRequestBuilder.buildResponsesParams(
        [{ role: 'user', content: [{ type: 'text', text: 'test' }] }],
        {
          model: 'gpt-4',
          tools: [],
        } as OpenAIResponsesOptions
      );

      expect(params.tools).toBeUndefined();
      expect(params.tool_choice).toBeUndefined();
    });

    it('should handle embeddings parameters', () => {
      const params = OpenAIRequestBuilder.buildEmbeddingParams(['text1', 'text2'], {
        model: 'text-embedding-3-small',
        dimensions: 512,
        encodingFormat: 'float',
        user: 'test-user',
      });

      expect(params.model).toBe('text-embedding-3-small');
      expect(params.input).toEqual(['text1', 'text2']);
      expect(params.dimensions).toBe(512);
      expect(params.encoding_format).toBe('float');
      expect(params.user).toBe('test-user');
    });
  });
});
