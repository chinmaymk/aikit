import { OpenAIMessageTransformer, OpenAIRequestBuilder } from '../../src/providers/openai_util';
import type { Message, ToolCall, Tool } from '../../src/types';

describe('OpenAIUtil', () => {
  describe('OpenAIMessageTransformer', () => {
    describe('toChatCompletions', () => {
      it('should handle system messages', () => {
        const messages: Message[] = [
          {
            role: 'system',
            content: [{ type: 'text', text: 'You are a helpful assistant' }],
          },
        ];

        const result = OpenAIMessageTransformer.toChatCompletions(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'system',
          content: 'You are a helpful assistant',
        });
      });

      it('should handle user messages with text and images', () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello' },
              { type: 'image', image: 'data:image/png;base64,iVBOR' },
            ],
          },
        ];

        const result = OpenAIMessageTransformer.toChatCompletions(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBOR' } },
          ],
        });
      });

      it('should handle assistant messages without tool calls', () => {
        const messages: Message[] = [
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hello there!' }],
          },
        ];

        const result = OpenAIMessageTransformer.toChatCompletions(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'assistant',
          content: 'Hello there!',
        });
      });

      it('should handle assistant messages with tool calls', () => {
        const toolCalls: ToolCall[] = [
          {
            id: 'call_123',
            name: 'get_weather',
            arguments: { location: 'New York' },
          },
        ];

        const messages: Message[] = [
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'Let me check the weather' }],
            toolCalls,
          },
        ];

        const result = OpenAIMessageTransformer.toChatCompletions(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'assistant',
          content: 'Let me check the weather',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: '{"location":"New York"}',
              },
            },
          ],
        });
      });

      it('should handle tool messages', () => {
        const messages: Message[] = [
          {
            role: 'tool',
            content: [
              {
                type: 'tool_result',
                toolCallId: 'call_123',
                result: 'Sunny, 75°F',
              },
            ],
          },
        ];

        const result = OpenAIMessageTransformer.toChatCompletions(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'tool',
          tool_call_id: 'call_123',
          content: 'Sunny, 75°F',
        });
      });

      it('should throw error for unsupported roles', () => {
        const messages: Message[] = [
          {
            role: 'developer' as any,
            content: [{ type: 'text', text: 'Test' }],
          },
        ];

        expect(() => OpenAIMessageTransformer.toChatCompletions(messages)).toThrow(
          "Unsupported message role 'developer' for OpenAI Chat provider"
        );
      });
    });

    describe('toResponses', () => {
      it('should handle system messages', () => {
        const messages: Message[] = [
          {
            role: 'system',
            content: [{ type: 'text', text: 'You are helpful' }],
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'system',
          content: [{ type: 'input_text', text: 'You are helpful' }],
        });
      });

      it('should handle user messages with mixed content', () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Look at this' },
              { type: 'image', image: 'data:image/png;base64,iVBOR' },
            ],
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'user',
          content: [
            { type: 'input_text', text: 'Look at this' },
            { type: 'input_image', image_url: 'data:image/png;base64,iVBOR' },
          ],
        });
      });

      it('should handle assistant messages with tool calls', () => {
        const toolCalls: ToolCall[] = [
          {
            id: 'call_123',
            name: 'search',
            arguments: { query: 'test' },
          },
        ];

        const messages: Message[] = [
          {
            role: 'assistant',
            content: [],
            toolCalls,
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'function_call',
          call_id: 'call_123',
          name: 'search',
          arguments: '{"query":"test"}',
        });
      });

      it('should handle assistant messages without tool calls', () => {
        const messages: Message[] = [
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          role: 'assistant',
          content: [{ type: 'input_text', text: 'Response' }],
        });
      });

      it('should handle tool result messages', () => {
        const messages: Message[] = [
          {
            role: 'tool',
            content: [
              {
                type: 'tool_result',
                toolCallId: 'call_123',
                result: 'Result data',
              },
            ],
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'function_call_output',
          call_id: 'call_123',
          output: 'Result data',
        });
      });

      it('should throw error for unsupported roles', () => {
        const messages: Message[] = [
          {
            role: 'developer' as any,
            content: [{ type: 'text', text: 'Test' }],
          },
        ];

        expect(() => OpenAIMessageTransformer.toResponses(messages)).toThrow(
          "Unsupported message role 'developer' for OpenAI Responses provider"
        );
      });
    });

    describe('error handling', () => {
      it('should throw error for unsupported roles in toChatCompletions', () => {
        const messages: Message[] = [
          {
            role: 'developer' as any,
            content: [{ type: 'text', text: 'Test' }],
          },
        ];

        expect(() => OpenAIMessageTransformer.toChatCompletions(messages)).toThrow(
          "Unsupported message role 'developer' for OpenAI Chat provider"
        );
      });

      it('should throw error for unsupported roles in toResponses', () => {
        const messages: Message[] = [
          {
            role: 'developer' as any,
            content: [{ type: 'text', text: 'Test' }],
          },
        ];

        expect(() => OpenAIMessageTransformer.toResponses(messages)).toThrow(
          "Unsupported message role 'developer' for OpenAI Responses provider"
        );
      });
    });

    describe('content type handling', () => {
      it('should handle mixed content types in buildResponsesContentParts', () => {
        const messages: Message[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Look at this' },
              { type: 'image', image: 'data:image/png;base64,iVBOR' },
            ],
          },
        ];

        const result = OpenAIMessageTransformer.toResponses(messages);

        expect(result[0]).toEqual({
          role: 'user',
          content: [
            { type: 'input_text', text: 'Look at this' },
            { type: 'input_image', image_url: 'data:image/png;base64,iVBOR' },
          ],
        });
      });
    });
  });

  describe('OpenAIRequestBuilder', () => {
    describe('buildChatCompletionParams', () => {
      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      it('should build basic params', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.model).toBe('gpt-4o');
        expect(result.stream).toBe(true);
        expect(result.messages).toHaveLength(1);
      });

      it('should include reasoning when provided', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          reasoning: { effort: 'high' as const },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.reasoning).toEqual({ effort: 'high' });
      });

      it('should handle optional parameters', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          user: 'user123',
          logprobs: true,
          topLogprobs: 5,
          seed: 12345,
          responseFormat: { type: 'json_object' as const },
          logitBias: { '1234': 10 },
          n: 2,
          modalities: ['text' as const, 'audio' as const],
          audio: { voice: 'alloy' as const, format: 'wav' as const },
          maxCompletionTokens: 1000,
          prediction: { type: 'content' as const, content: 'predicted' },
          webSearchOptions: { searchContextSize: 'medium' as const },
          streamOptions: { includeUsage: true },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.user).toBe('user123');
        expect(result.logprobs).toBe(true);
        expect(result.top_logprobs).toBe(5);
        expect(result.seed).toBe(12345);
        expect(result.response_format).toEqual({ type: 'json_object' });
        expect(result.logit_bias).toEqual({ '1234': 10 });
        expect(result.n).toBe(2);
        expect(result.stream_options).toEqual({ include_usage: true });
      });

      it('should handle tools and tool choice', () => {
        const tools: Tool[] = [
          {
            name: 'get_weather',
            description: 'Get weather info',
            parameters: { type: 'object', properties: {} },
          },
        ];

        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools,
          toolChoice: 'auto' as const,
          parallelToolCalls: false,
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.tools).toHaveLength(1);
        expect(result.tool_choice).toBe('auto');
        expect(result.parallel_tool_calls).toBe(false);
      });

      it('should handle specific tool choice', () => {
        const tools: Tool[] = [
          {
            name: 'get_weather',
            description: 'Get weather info',
            parameters: { type: 'object', properties: {} },
          },
        ];

        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools,
          toolChoice: { name: 'get_weather' },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.tool_choice).toEqual({
          type: 'function',
          function: { name: 'get_weather' },
        });
      });

      it('should skip tools when none provided', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.tools).toBeUndefined();
        expect(result.tool_choice).toBeUndefined();
      });
    });

    describe('buildResponsesParams', () => {
      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      it('should build basic params', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildResponsesParams(messages, options);

        expect(result.model).toBe('gpt-4o');
        expect(result.stream).toBe(true);
        expect(result.input).toHaveLength(1);
      });

      it('should handle all optional parameters', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          background: true,
          include: ['reasoning.encrypted_content'],
          instructions: 'Be helpful',
          metadata: { user: 'test' },
          parallelToolCalls: true,
          previousResponseId: 'prev_123',
          reasoning: { effort: 'medium' as const },
          serviceTier: 'flex' as const,
          store: false,
          text: { format: { type: 'json_object' as const } },
          truncation: 'disabled' as const,
          user: 'user123',
        };

        const result = OpenAIRequestBuilder.buildResponsesParams(messages, options);

        expect(result.background).toBe(true);
        expect(result.include).toEqual(['reasoning.encrypted_content']);
        expect(result.instructions).toBe('Be helpful');
        expect(result.metadata).toEqual({ user: 'test' });
        expect(result.parallel_tool_calls).toBe(true);
        expect(result.previous_response_id).toBe('prev_123');
        expect(result.reasoning).toEqual({ effort: 'medium' });
        expect(result.service_tier).toBe('flex');
        expect(result.store).toBe(false);
        expect(result.text).toEqual({ format: { type: 'json_object' } });
        expect(result.truncation).toBe('disabled');
        expect(result.user).toBe('user123');
      });
    });

    describe('tool choice formatting', () => {
      it('should not set tool_choice when undefined in tool choice formatting', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: undefined,
        };

        const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.tool_choice).toBeUndefined();
      });

      it('should format string tool choice', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: 'none' as const,
        };

        const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.tool_choice).toBe('none');
      });
    });

    describe('buildEmbeddingParams', () => {
      it('should build basic embedding params', () => {
        const texts = ['Hello', 'World'];
        const options = {
          model: 'text-embedding-3-small',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildEmbeddingParams(texts, options);

        expect(result.model).toBe('text-embedding-3-small');
        expect(result.input).toEqual(['Hello', 'World']);
      });

      it('should handle optional embedding parameters', () => {
        const texts = ['Hello'];
        const options = {
          model: 'text-embedding-3-large',
          apiKey: 'test-key',
          dimensions: 1024,
          encodingFormat: 'float' as const,
          user: 'user123',
        };

        const result = OpenAIRequestBuilder.buildEmbeddingParams(texts, options);

        expect(result.dimensions).toBe(1024);
        expect(result.encoding_format).toBe('float');
        expect(result.user).toBe('user123');
      });
    });

    describe('optional parameter handling', () => {
      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      it('should handle all optional chat parameters when defined', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          user: 'user123',
          logprobs: true,
          topLogprobs: 5,
          seed: 12345,
          responseFormat: { type: 'json_object' as const },
          logitBias: { '1234': 10 },
          n: 2,
          modalities: ['text' as const, 'audio' as const],
          audio: { voice: 'alloy' as const, format: 'wav' as const },
          maxCompletionTokens: 1000,
          prediction: { type: 'content' as const, content: 'predicted' },
          webSearchOptions: { searchContextSize: 'medium' as const },
          streamOptions: { includeUsage: true },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.user).toBe('user123');
        expect(result.logprobs).toBe(true);
        expect(result.top_logprobs).toBe(5);
        expect(result.seed).toBe(12345);
        expect(result.response_format).toEqual({ type: 'json_object' });
        expect(result.logit_bias).toEqual({ '1234': 10 });
        expect(result.n).toBe(2);
        expect(result.stream_options).toEqual({ include_usage: true });
      });

      it('should handle all optional responses parameters when defined', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          background: true,
          include: ['reasoning.encrypted_content'],
          instructions: 'Be helpful',
          metadata: { user: 'test' },
          parallelToolCalls: true,
          previousResponseId: 'prev_123',
          reasoning: { effort: 'medium' as const },
          serviceTier: 'flex' as const,
          store: false,
          text: { format: { type: 'json_object' as const } },
          truncation: 'disabled' as const,
          user: 'user123',
        };

        const result = OpenAIRequestBuilder.buildResponsesParams(messages, options);

        expect(result.background).toBe(true);
        expect(result.include).toEqual(['reasoning.encrypted_content']);
        expect(result.instructions).toBe('Be helpful');
        expect(result.metadata).toEqual({ user: 'test' });
        expect(result.parallel_tool_calls).toBe(true);
        expect(result.previous_response_id).toBe('prev_123');
        expect(result.reasoning).toEqual({ effort: 'medium' });
        expect(result.service_tier).toBe('flex');
        expect(result.store).toBe(false);
        expect(result.text).toEqual({ format: { type: 'json_object' } });
        expect(result.truncation).toBe('disabled');
        expect(result.user).toBe('user123');
      });

      it('should skip optional parameters when undefined', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          // All optional parameters are undefined
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);

        expect(result.user).toBeUndefined();
        expect(result.logprobs).toBeUndefined();
        expect(result.top_logprobs).toBeUndefined();
        expect(result.seed).toBeUndefined();
        expect(result.response_format).toBeUndefined();
        expect(result.logit_bias).toBeUndefined();
        expect(result.n).toBeUndefined();
        expect(result.stream_options).toBeUndefined();
      });
    });

    describe('tool choice edge cases', () => {
      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      it('should not set tool_choice when undefined', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: undefined,
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.tool_choice).toBeUndefined();
      });

      it('should handle object tool choice for chat', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'get_weather', description: 'test', parameters: {} }],
          toolChoice: { name: 'get_weather' },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.tool_choice).toEqual({
          type: 'function',
          function: { name: 'get_weather' },
        });
      });

      it('should handle object tool choice for responses', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'search', description: 'test', parameters: {} }],
          toolChoice: { name: 'search' },
        };

        const result = OpenAIRequestBuilder.buildResponsesParams(messages, options);
        expect(result.tool_choice).toEqual({
          type: 'function',
          name: 'search',
        });
      });

      it('should handle "none" tool choice differently for responses', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          tools: [{ name: 'test', description: 'test', parameters: {} }],
          toolChoice: 'none' as const,
        };

        const chatResult = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        const responsesResult = OpenAIRequestBuilder.buildResponsesParams(messages, options);

        expect(chatResult.tool_choice).toBe('none');
        expect(responsesResult.tool_choice).toBe('auto'); // "none" becomes "auto" for responses
      });
    });

    describe('reasoning parameter handling', () => {
      const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];

      it('should include reasoning when provided in chat params', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
          reasoning: { effort: 'high' as const },
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.reasoning).toEqual({ effort: 'high' });
      });

      it('should not include reasoning when not provided', () => {
        const options = {
          model: 'gpt-4o',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildChatCompletionParams(messages, options);
        expect(result.reasoning).toBeUndefined();
      });
    });

    describe('embedding parameters', () => {
      it('should handle all optional embedding parameters', () => {
        const texts = ['Hello'];
        const options = {
          model: 'text-embedding-3-large',
          apiKey: 'test-key',
          dimensions: 1024,
          encodingFormat: 'float' as const,
          user: 'user123',
        };

        const result = OpenAIRequestBuilder.buildEmbeddingParams(texts, options);

        expect(result.model).toBe('text-embedding-3-large');
        expect(result.input).toEqual(['Hello']);
        expect(result.dimensions).toBe(1024);
        expect(result.encoding_format).toBe('float');
        expect(result.user).toBe('user123');
      });

      it('should skip undefined embedding parameters', () => {
        const texts = ['Hello'];
        const options = {
          model: 'text-embedding-3-small',
          apiKey: 'test-key',
        };

        const result = OpenAIRequestBuilder.buildEmbeddingParams(texts, options);

        expect(result.dimensions).toBeUndefined();
        expect(result.encoding_format).toBeUndefined();
        expect(result.user).toBeUndefined();
      });
    });
  });
});
