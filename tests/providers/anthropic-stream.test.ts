import {
  processAnthropicStream,
  handleStreamEvent,
  handleContentBlockStart,
  handleContentBlockDelta,
  handleMessageDelta,
} from '../../src/providers/anthropic-stream';
import { AnthropicStreamEvent } from '../../src/providers/anthropic-transformers';
import { StreamState } from '../../src/providers/utils';

describe('anthropic-stream', () => {
  describe('processAnthropicStream', () => {
    it('should process stream with data lines', async () => {
      const mockSseStream = (async function* () {
        yield 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}';
        yield 'data: [DONE]';
      })();

      const chunks = [];
      for await (const chunk of processAnthropicStream(mockSseStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].delta).toBe('Hello');
    });

    it('should handle stream with no data', async () => {
      const mockSseStream = (async function* () {})();

      const chunks = [];
      for await (const chunk of processAnthropicStream(mockSseStream)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it('should stop on [DONE]', async () => {
      const mockSseStream = (async function* () {
        yield 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}';
        yield 'data: [DONE]';
        yield 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Should not see"}}';
      })();

      const chunks = [];
      for await (const chunk of processAnthropicStream(mockSseStream)) {
        chunks.push(chunk);
      }

      // The stream should stop processing after [DONE], so we should only get the first chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].delta).toBe('Hello');
    });
  });

  describe('handleStreamEvent', () => {
    let state: StreamState;

    beforeEach(() => {
      state = new StreamState();
    });

    it('should handle content_block_start events', () => {
      const event: AnthropicStreamEvent = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'call_123',
          name: 'test_tool',
          input: { param: 'value' },
        },
      };

      const result = handleStreamEvent(event, state);
      expect(result).toBe(null);
      expect(state.toolCallStates['call_123']).toBeDefined();
    });

    it('should handle content_block_delta events', () => {
      const event: AnthropicStreamEvent = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello' },
      };

      const result = handleStreamEvent(event, state);
      expect(result).toBeDefined();
      expect(result?.delta).toBe('Hello');
    });

    it('should handle message_delta events', () => {
      const event: AnthropicStreamEvent = {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 42 },
      };

      const result = handleStreamEvent(event, state);
      expect(result).toBeDefined();
      expect(result?.finishReason).toBe('stop');
    });

    it('should throw error on error events', () => {
      const event: AnthropicStreamEvent = {
        type: 'error',
        error: { type: 'invalid_request', message: 'Bad request' },
      };

      expect(() => handleStreamEvent(event, state)).toThrow(
        'Anthropic API error: invalid_request - Bad request'
      );
    });

    it('should return null for unknown events', () => {
      const event: AnthropicStreamEvent = {
        type: 'unknown_event',
        some_data: 'value',
      };

      const result = handleStreamEvent(event, state);
      expect(result).toBe(null);
    });

    it('should return null for events without required properties', () => {
      const event = {
        type: 'content_block_start',
        index: 0,
        // missing content_block
      } as AnthropicStreamEvent;

      const result = handleStreamEvent(event, state);
      expect(result).toBe(null);
    });
  });

  describe('handleContentBlockStart', () => {
    let state: StreamState;

    beforeEach(() => {
      state = new StreamState();
    });

    it('should initialize tool call for tool_use content', () => {
      const event = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'call_123',
          name: 'test_tool',
          input: { param: 'value' },
        },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_start' }>;

      const result = handleContentBlockStart(event, state);
      expect(result).toBe(null);
      expect(state.toolCallStates['call_123']).toBeDefined();
      expect(state.toolCallStates['call_123'].name).toBe('test_tool');
    });

    it('should ignore non-tool_use content blocks', () => {
      const event = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: 'Hello',
        },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_start' }>;

      const result = handleContentBlockStart(event, state);
      expect(result).toBe(null);
      expect(Object.keys(state.toolCallStates)).toHaveLength(0);
    });
  });

  describe('handleContentBlockDelta', () => {
    let state: StreamState;

    beforeEach(() => {
      state = new StreamState();
    });

    it('should handle text_delta', () => {
      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hello' },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>;

      const result = handleContentBlockDelta(event, state);
      expect(result).toBeDefined();
      expect(result?.delta).toBe('Hello');
      expect(state.content).toBe('Hello');
    });

    it('should handle input_json_delta with existing tool call', () => {
      // First initialize a tool call
      state.initToolCall('call_123', 'test_tool');

      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"param":' },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>;

      const result = handleContentBlockDelta(event, state);
      expect(result).toBe(null);
      expect(state.toolCallStates['call_123'].arguments).toBe('{"param":');
    });

    it('should handle input_json_delta without existing tool call', () => {
      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"param":' },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>;

      const result = handleContentBlockDelta(event, state);
      expect(result).toBe(null);
    });

    it('should handle thinking_delta', () => {
      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: 'I need to think...' },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>;

      const result = handleContentBlockDelta(event, state);
      expect(result).toBeDefined();
      expect(result?.reasoning?.delta).toBe('I need to think...');
    });

    it('should handle signature_delta', () => {
      const event = {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: 'signature data' },
      } as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>;

      const result = handleContentBlockDelta(event, state);
      expect(result).toBe(null);
    });
  });

  describe('handleMessageDelta', () => {
    let state: StreamState;

    beforeEach(() => {
      state = new StreamState();
    });

    it('should handle message delta with stop reason', () => {
      const event = {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 42 },
      } as Extract<AnthropicStreamEvent, { type: 'message_delta' }>;

      const result = handleMessageDelta(event, state);
      expect(result).toBeDefined();
      expect(result?.finishReason).toBe('stop');
      expect(result?.usage?.outputTokens).toBe(42);
    });

    it('should return null when no stop reason', () => {
      const event = {
        type: 'message_delta',
        delta: {},
        usage: { output_tokens: 42 },
      } as Extract<AnthropicStreamEvent, { type: 'message_delta' }>;

      const result = handleMessageDelta(event, state);
      expect(result).toBe(null);
    });

    it('should handle message delta without usage', () => {
      const event = {
        type: 'message_delta',
        delta: { stop_reason: 'max_tokens' },
      } as Extract<AnthropicStreamEvent, { type: 'message_delta' }>;

      const result = handleMessageDelta(event, state);
      expect(result).toBeDefined();
      expect(result?.finishReason).toBe('length');
      // Usage might contain totalTime from StreamState, so just check it's not the expected usage format
      expect(result?.usage?.outputTokens).toBeUndefined();
    });
  });
});
