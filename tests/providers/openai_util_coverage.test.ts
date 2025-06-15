import {
  OpenAIMessageTransformer,
  OpenAIRequestBuilder,
  OpenAIStreamProcessor,
  OpenAIEmbeddingUtils,
  OpenAIClientFactory,
} from '../../src/providers/openai_util';
import type { Message, OpenAIOptions, OpenAIResponsesOptions } from '../../src/types';

describe('OpenAIUtil Branch Coverage Tests', () => {
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

      // When toolChoice is not specified, tool_choice may be undefined or set to 'auto'
      expect(params.tool_choice === 'auto' || params.tool_choice === undefined).toBe(true);
    });
  });

  describe('OpenAIStreamProcessor edge cases', () => {
    it('should handle chunks with usage but no choices', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        totalTime: expect.any(Number),
      });
    });

    it('should handle chunks with usage but empty choices array', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"choices": [], "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].usage).toBeDefined();
    });

    it('should handle chunks with reasoning deltas', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"choices": [{"delta": {"reasoning": "I need to think..."}}]}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].reasoning).toBeDefined();
    });

    it('should handle tool calls without finish reason', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"choices": [{"delta": {"tool_calls": [{"index": 0, "id": "call_123", "function": {"name": "test_tool", "arguments": "{}"}}]}}]}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe('');
    });

    it('should handle tool call deltas without ID initially', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"choices": [{"delta": {"tool_calls": [{"index": 0, "function": {"name": "test_tool"}}]}}]}';
        yield 'data: {"choices": [{"delta": {"tool_calls": [{"index": 0, "id": "call_123", "function": {"arguments": "{\\"test\\": true}"}}]}}]}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle usage chunk extraction with detailed tokens', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"choices": [{"finish_reason": "stop"}], "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15, "completion_tokens_details": {"reasoning_tokens": 3}, "prompt_tokens_details": {"cached_tokens": 2}}}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        reasoningTokens: 3,
        cacheTokens: 2,
        totalTime: expect.any(Number),
      });
    });
  });

  describe('OpenAIStreamProcessor responses events', () => {
    it('should handle response.output_item.added with non-function_call type', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "response.output_item.added", "output_index": 0, "item": {"type": "text"}}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0); // Should return null for non-function_call
    });

    it('should handle response.function_call_arguments.delta without call_id', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "response.function_call_arguments.delta", "output_index": 0, "delta": "test"}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0); // Should return null without call_id
    });

    it('should handle response.function_call_arguments.done without call_id', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "response.function_call_arguments.done", "output_index": 0, "arguments": "{}"}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0); // Should return null without call_id
    });

    it('should handle response.function_call_arguments.done without tool call state', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "response.function_call_arguments.done", "call_id": "nonexistent", "arguments": "{}"}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0); // Should return null without tool call state
    });

    it('should handle unknown response event types', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "unknown.event.type", "data": "test"}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0); // Should return null for unknown events
    });

    it('should handle response.function_call_arguments.done with fallback arguments', async () => {
      const mockLineStream = async function* () {
        yield 'data: {"type": "response.output_item.added", "output_index": 0, "item": {"type": "function_call", "call_id": "call_123", "name": "test_tool"}}';
        yield 'data: {"type": "response.function_call_arguments.done", "call_id": "call_123"}';
        yield 'data: [DONE]';
      };

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processResponsesStream(mockLineStream())) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAIEmbeddingUtils edge cases', () => {
    it('should handle empty texts array', () => {
      expect(() => OpenAIEmbeddingUtils.validateRequest([])).toThrow(
        'At least one text must be provided'
      );
    });

    it('should handle too many texts', () => {
      const texts = new Array(2049).fill('test');
      expect(() => OpenAIEmbeddingUtils.validateRequest(texts)).toThrow(
        'OpenAI embedding API supports up to 2048 texts per request'
      );
    });

    it('should handle non-string text at specific index', () => {
      expect(() => OpenAIEmbeddingUtils.validateRequest(['valid', 123 as any, 'another'])).toThrow(
        'Text at index 1 must be a string'
      );
    });

    it('should handle response without usage', () => {
      const response = {
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        model: 'text-embedding-3-small',
        usage: undefined,
      };

      const result = OpenAIEmbeddingUtils.transformResponse(response as any);
      expect(result.usage).toBeUndefined();
    });
  });

  describe('OpenAIClientFactory', () => {
    it('should create client with organization and project headers', () => {
      const config = {
        apiKey: 'test-key',
        organization: 'org-123',
        project: 'proj-456',
        baseURL: 'https://custom.api.com',
        timeout: 30000,
        maxRetries: 3,
      };

      const client = OpenAIClientFactory.createClient(config);
      expect(client).toBeDefined();
    });

    it('should create client without optional headers', () => {
      const config = {
        apiKey: 'test-key',
      };

      const client = OpenAIClientFactory.createClient(config);
      expect(client).toBeDefined();
    });
  });
});
