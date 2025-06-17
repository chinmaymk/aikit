import {
  formatToolChoice,
  mapFinishReason,
  extractUsageFromAnthropicEvent,
  AnthropicStreamEvent,
} from '../../src/providers/anthropic-transformers';

describe('anthropic-transformers utils', () => {
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
