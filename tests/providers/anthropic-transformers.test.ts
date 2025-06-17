import {
  transformMessages,
  transformMessage,
  buildContentBlocks,
  AnthropicMessage,
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
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'text', text: 'First text' });
      expect(result[1]).toEqual({ type: 'text', text: 'Second text' });
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
          { type: 'text', text: 'Look at this' },
          { type: 'image', image: 'invalid-url' },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    });

    it('should handle tool results in non-tool messages', () => {
      const message: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Check this result:' },
          { type: 'tool_result', toolCallId: 'call_123', result: 'Analysis data' },
          { type: 'text', text: 'What should we do next?' },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'text', text: 'Check this result:' });
      expect(result[1]).toEqual({ type: 'text', text: 'What should we do next?' });
    });

    it('should handle mixed content with all types', () => {
      const message: Message = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Processing...' },
          { type: 'tool_result', toolCallId: 'call_456', result: 'Data processed' },
          {
            type: 'image',
            image:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          },
        ],
        toolCalls: [
          {
            id: 'call_789',
            name: 'analyze',
            arguments: { data: 'test' },
          },
        ],
      };

      const result = buildContentBlocks(message);
      expect(result).toHaveLength(3);

      // Text block
      expect(result[0]).toEqual({ type: 'text', text: 'Processing...' });

      // Image block
      expect(result[1]).toEqual({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        },
      });

      // Tool use block from toolCalls
      expect(result[2]).toEqual({
        type: 'tool_use',
        id: 'call_789',
        name: 'analyze',
        input: { data: 'test' },
      });
    });
  });
});
