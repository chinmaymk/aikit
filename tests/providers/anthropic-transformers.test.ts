import {
  transformMessages,
  transformMessage,
  buildContentBlocks,
  formatToolChoice,
  mapFinishReason,
  extractUsageFromAnthropicEvent,
  AnthropicMessage,
  AnthropicStreamEvent,
} from '../../src/providers/anthropic-transformers';
import type { Message } from '../../src/types';

describe('anthropic-transformers', () => {
  describe('transformMessages', () => {
    it('should transform basic messages', () => {
      const messages: Message[] = [
        { role: 'system', content: [{ type: 'text', text: 'You are helpful' }] },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
      ];

      const result = transformMessages(messages);
      expect(result.systemMessage).toBe('You are helpful');
      expect(result.anthropicMessages).toHaveLength(2);
      expect(result.anthropicMessages[0].role).toBe('user');
      expect(result.anthropicMessages[1].role).toBe('assistant');
    });

    it('should handle multiple system messages', () => {
      const messages: Message[] = [
        { role: 'system', content: [{ type: 'text', text: 'First system' }] },
        { role: 'system', content: [{ type: 'text', text: 'Second system' }] },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ];

      const result = transformMessages(messages);
      expect(result.systemMessage).toBe('First system\n\nSecond system');
      expect(result.anthropicMessages).toHaveLength(1);
    });

    it('should handle empty system messages', () => {
      const messages: Message[] = [
        { role: 'system', content: [] },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ];

      const result = transformMessages(messages);
      expect(result.systemMessage).toBe('');
      expect(result.anthropicMessages).toHaveLength(1);
    });
  });

  describe('transformMessage', () => {
    it('should transform tool messages to user messages', () => {
      const message: Message = {
        role: 'tool',
        content: [
          { type: 'tool_result', toolCallId: 'call_123', result: 'Tool output' },
          { type: 'tool_result', toolCallId: 'call_456', result: 'Another output' },
        ],
      };

      const result = transformMessage(message) as AnthropicMessage[];
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].content[0]).toEqual({
        type: 'tool_result',
        tool_use_id: 'call_123',
        content: 'Tool output',
      });
    });

    it('should transform user messages', () => {
      const message: Message = {
        role: 'user',
        content: [{ type: 'text', text: 'Hello world' }],
      };

      const result = transformMessage(message) as AnthropicMessage;
      expect(result.role).toBe('user');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({ type: 'text', text: 'Hello world' });
    });

    it('should transform assistant messages', () => {
      const message: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi there' }],
      };

      const result = transformMessage(message) as AnthropicMessage;
      expect(result.role).toBe('assistant');
      expect(result.content).toHaveLength(1);
    });

    it('should return null for empty content blocks', () => {
      const message: Message = {
        role: 'user',
        content: [],
      };

      const result = transformMessage(message);
      expect(result).toBeNull();
    });

    it('should throw error for unsupported role', () => {
      const message = {
        role: 'unsupported',
        content: [{ type: 'text', text: 'test' }],
      } as unknown as Message;

      expect(() => transformMessage(message)).toThrow(
        "Unsupported message role 'unsupported' for Anthropic provider"
      );
    });
  });

  describe('buildContentBlocks', () => {
    it('should build text content blocks', () => {
      const message: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'First text' },
          { type: 'text', text: 'Second text' },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: 'text', text: 'First text\nSecond text' });
    });

    it('should skip empty text', () => {
      const message: Message = {
        role: 'user',
        content: [{ type: 'text', text: '   ' }],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(0);
    });

    it('should build image content blocks', () => {
      const message: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this' },
          {
            type: 'image',
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('text');
      expect(result[1].type).toBe('image');
      expect(result[1]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        },
      });
    });

    it('should build tool use content blocks for assistant', () => {
      const message: Message = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Using a tool' }],
        toolCalls: [
          {
            id: 'call_123',
            name: 'test_tool',
            arguments: { param: 'value' },
          },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('text');
      expect(result[1]).toEqual({
        type: 'tool_use',
        id: 'call_123',
        name: 'test_tool',
        input: { param: 'value' },
      });
    });

    it('should skip invalid image URLs', () => {
      const message: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Invalid image' },
          { type: 'image', image: 'invalid-url' },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    });
  });

  describe('formatToolChoice', () => {
    it('should default to auto', () => {
      expect(formatToolChoice(undefined)).toEqual({ type: 'auto' });
    });

    it('should handle string values', () => {
      expect(formatToolChoice('auto')).toEqual({ type: 'auto' });
    });

    it('should handle object values', () => {
      expect(formatToolChoice({ name: 'test_tool' })).toEqual({
        type: 'tool',
        name: 'test_tool',
      });
    });
  });

  describe('mapFinishReason', () => {
    it('should map known finish reasons', () => {
      expect(mapFinishReason('end_turn')).toBe('stop');
      expect(mapFinishReason('max_tokens')).toBe('length');
      expect(mapFinishReason('stop_sequence')).toBe('stop');
      expect(mapFinishReason('tool_use')).toBe('tool_use');
      expect(mapFinishReason('pause_turn')).toBe('stop');
      expect(mapFinishReason('refusal')).toBe('error');
    });

    it('should return undefined for unknown reasons', () => {
      expect(mapFinishReason('unknown')).toBeUndefined();
      expect(mapFinishReason(undefined)).toBeUndefined();
    });
  });

  describe('extractUsageFromAnthropicEvent', () => {
    it('should extract usage from message delta', () => {
      const event: Extract<AnthropicStreamEvent, { type: 'message_delta' }> = {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 42 },
      };

      const result = extractUsageFromAnthropicEvent(event);
      expect(result).toEqual({ outputTokens: 42 });
    });

    it('should return undefined when no usage', () => {
      const event: Extract<AnthropicStreamEvent, { type: 'message_delta' }> = {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
      };

      const result = extractUsageFromAnthropicEvent(event);
      expect(result).toBeUndefined();
    });

    it('should handle zero output tokens', () => {
      const event: Extract<AnthropicStreamEvent, { type: 'message_delta' }> = {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 0 },
      };

      const result = extractUsageFromAnthropicEvent(event);
      expect(result).toEqual({ outputTokens: 0 });
    });
  });
});
