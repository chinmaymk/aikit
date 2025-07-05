import { OpenAIStreamProcessor } from '../../src/providers/openai_stream';
import { StreamState } from '../../src/providers/utils';
import { describe, it, expect } from '@jest/globals';

describe('OpenAI Stream Edge Cases', () => {
  describe('handleUsageOnlyChunk edge cases', () => {
    it('should handle usage chunk without returning chunk when usage extraction fails', () => {
      const chunk = {
        usage: {
          // Empty usage object that would result in no extracted usage
        },
        choices: [], // Empty choices array
      };
      const state = new StreamState();

      // This should trigger the usage-only path but return null due to no extracted usage
      const result = (OpenAIStreamProcessor as any).handleUsageOnlyChunk(chunk, state);
      expect(result).toBeNull();
    });

    it('should handle chunk with usage and valid extracted usage', () => {
      const chunk = {
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        choices: [], // Empty choices array
      };
      const state = new StreamState();

      const result = (OpenAIStreamProcessor as any).handleUsageOnlyChunk(chunk, state);
      expect(result).not.toBeNull();
      expect(result.finishReason).toBe('stop');
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        totalTime: expect.any(Number),
      });
    });
  });

  describe('processChatChoiceDelta edge cases', () => {
    it('should handle reasoning delta', () => {
      const delta = { reasoning: 'This is reasoning content' };
      const choice = {};
      const chunk = {};
      const state = new StreamState();

      const result = (OpenAIStreamProcessor as any).processChatChoiceDelta(
        delta,
        choice,
        chunk,
        state
      );
      expect(result).not.toBeNull();
      expect(result.reasoning).toEqual({
        content: 'This is reasoning content',
        delta: 'This is reasoning content',
      });
    });

    it('should return null when no conditions match', () => {
      const delta = {}; // Empty delta
      const choice = {}; // No finish_reason
      const chunk = {};
      const state = new StreamState();

      const result = (OpenAIStreamProcessor as any).processChatChoiceDelta(
        delta,
        choice,
        chunk,
        state
      );
      expect(result).toBeNull();
    });

    it('should handle tool calls without finish reason', () => {
      const delta = {
        tool_calls: [
          {
            index: 0,
            id: 'call_123',
            function: {
              name: 'test_function',
              arguments: '{"param": "value"}',
            },
          },
        ],
      };
      const choice = {}; // No finish_reason
      const chunk = {};
      const state = new StreamState();

      const result = (OpenAIStreamProcessor as any).processChatChoiceDelta(
        delta,
        choice,
        chunk,
        state
      );
      expect(result).not.toBeNull();
      expect(result.delta).toBe('');
    });
  });

  describe('Responses API edge cases', () => {
    it('should handle item added with non-function_call type', () => {
      const event = {
        item: {
          type: 'text', // Not function_call
          content: 'some content',
        },
        output_index: 0,
      };
      const state = new StreamState();

      const result = (OpenAIStreamProcessor as any).handleItemAdded(event, state);
      expect(result).toBeNull();
    });

    it('should handle arguments delta with missing call_id', () => {
      const event = {
        delta: 'some args',
        output_index: 0,
        // No call_id
      };
      const state = new StreamState();
      // No outputIndexToCallId mapping

      const result = (OpenAIStreamProcessor as any).handleArgumentsDelta(event, state);
      expect(result).toBeNull();
    });

    it('should handle arguments delta with valid call_id', () => {
      const event = {
        call_id: 'call_123',
        delta: 'some args',
        output_index: 0,
      };
      const state = new StreamState();
      state.initToolCall('call_123', 'test_function');

      const result = (OpenAIStreamProcessor as any).handleArgumentsDelta(event, state);
      expect(result).not.toBeNull();
      expect(result.delta).toBe('');
    });

    it('should handle arguments done with missing call_id', () => {
      const event = {
        arguments: '{"param": "value"}',
        output_index: 0,
        // No call_id
      };
      const state = new StreamState();
      // No outputIndexToCallId mapping

      const result = (OpenAIStreamProcessor as any).handleArgumentsDone(event, state);
      expect(result).toBeNull();
    });

    it('should handle arguments done with missing tool call state', () => {
      const event = {
        call_id: 'call_123',
        arguments: '{"param": "value"}',
        output_index: 0,
      };
      const state = new StreamState();
      // No tool call state initialized

      const result = (OpenAIStreamProcessor as any).handleArgumentsDone(event, state);
      expect(result).toBeNull();
    });

    it('should handle arguments done with valid state', () => {
      const event = {
        call_id: 'call_123',
        arguments: '{"param": "value"}',
        output_index: 0,
      };
      const state = new StreamState();
      state.initToolCall('call_123', 'test_function');

      const result = (OpenAIStreamProcessor as any).handleArgumentsDone(event, state);
      expect(result).not.toBeNull();
      expect(result.delta).toBe('');
      expect(state.toolCallStates['call_123'].arguments).toBe('{"param": "value"}');
    });
  });

  describe('processChatToolCallDeltas edge cases', () => {
    it('should handle tool call deltas with various scenarios', () => {
      const deltaToolCalls = [
        {
          index: 0,
          id: 'call_123',
          function: {
            name: 'test_function',
            arguments: '{"param": "value"}',
          },
        },
        {
          index: 1,
          // No id, should use existing mapping
          function: {
            arguments: 'more args',
          },
        },
        {
          index: 2,
          id: 'call_456',
          function: {
            name: 'another_function',
          },
        },
      ];

      const state = new StreamState();
      state.outputIndexToCallId[1] = 'call_existing';
      state.initToolCall('call_existing', 'existing_function');

      // This should not throw and should process all deltas
      expect(() => {
        (OpenAIStreamProcessor as any).processChatToolCallDeltas(deltaToolCalls, state);
      }).not.toThrow();

      // Verify state was updated correctly
      expect(state.outputIndexToCallId[0]).toBe('call_123');
      expect(state.outputIndexToCallId[2]).toBe('call_456');
      expect(state.toolCallStates['call_123']).toBeDefined();
      expect(state.toolCallStates['call_456']).toBeDefined();
    });

    it('should handle tool call deltas with missing index', () => {
      const deltaToolCalls = [
        {
          // No index, should default to 0
          id: 'call_123',
          function: {
            name: 'test_function',
          },
        },
      ];

      const state = new StreamState();

      expect(() => {
        (OpenAIStreamProcessor as any).processChatToolCallDeltas(deltaToolCalls, state);
      }).not.toThrow();

      expect(state.outputIndexToCallId[0]).toBe('call_123');
    });
  });

  describe('extractUsageFromChunk edge cases', () => {
    it('should return undefined for chunk without usage', () => {
      const chunk = {};

      const result = (OpenAIStreamProcessor as any).extractUsageFromChunk(chunk);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty usage object', () => {
      const chunk = {
        usage: {}, // Empty usage
      };

      const result = (OpenAIStreamProcessor as any).extractUsageFromChunk(chunk);
      expect(result).toBeUndefined();
    });

    it('should extract all usage fields when present', () => {
      const chunk = {
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          completion_tokens_details: {
            reasoning_tokens: 5,
          },
          prompt_tokens_details: {
            cached_tokens: 3,
          },
        },
      };

      const result = (OpenAIStreamProcessor as any).extractUsageFromChunk(chunk);
      expect(result).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        reasoningTokens: 5,
        cacheTokens: 3,
      });
    });

    it('should extract partial usage fields', () => {
      const chunk = {
        usage: {
          prompt_tokens: 10,
          // Missing other fields
        },
      };

      const result = (OpenAIStreamProcessor as any).extractUsageFromChunk(chunk);
      expect(result).toEqual({
        inputTokens: 10,
      });
    });
  });

  describe('Stream processing integration edge cases', () => {
    it('should handle chunks with no choices in stream', async () => {
      const lineStream = (async function* () {
        yield 'data: {"usage":{"prompt_tokens":10,"completion_tokens":5}}';
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      })();

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(lineStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].usage).toBeDefined();
      expect(chunks[1].delta).toBe('Hello');
    });

    it('should handle empty choices array in stream', async () => {
      const lineStream = (async function* () {
        yield 'data: {"choices":[]}';
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      })();

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(lineStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].delta).toBe('Hello');
    });

    it('should handle invalid JSON gracefully in stream', async () => {
      const lineStream = (async function* () {
        yield 'data: invalid json';
        yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      })();

      const chunks = [];
      for await (const chunk of OpenAIStreamProcessor.processChatStream(lineStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].delta).toBe('Hello');
    });
  });
});
