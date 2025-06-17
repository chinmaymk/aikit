import { type Message, type Content } from '@chinmaymk/aikit';
import { MessageTransformer } from '@chinmaymk/aikit/providers/utils';

describe('Message Transformation', () => {
  describe('MessageTransformer utilities', () => {
    describe('extractTextContent', () => {
      it('should extract single text content', () => {
        const content: Content[] = [{ type: 'text', text: 'Hello world' }];
        expect(MessageTransformer.extractTextContent(content)).toBe('Hello world');
      });

      it('should return first text content when multiple exist', () => {
        const content: Content[] = [
          { type: 'text', text: 'First text' },
          { type: 'text', text: 'Second text' },
        ];
        expect(MessageTransformer.extractTextContent(content)).toBe('First text');
      });

      it('should return empty string when no text content', () => {
        const content: Content[] = [{ type: 'image', image: 'data:image/png;base64,abc' }];
        expect(MessageTransformer.extractTextContent(content)).toBe('');
      });
    });

    describe('groupContentByType', () => {
      it('should group mixed content correctly', () => {
        const content: Content[] = [
          { type: 'text', text: 'Hello' },
          { type: 'image', image: 'data:image/png;base64,abc' },
          { type: 'tool_result', toolCallId: 'call1', result: 'result1' },
          { type: 'text', text: 'World' },
        ];

        const grouped = MessageTransformer.groupContentByType(content);
        expect(grouped.text).toHaveLength(2);
        expect(grouped.images).toHaveLength(1);
        expect(grouped.toolResults).toHaveLength(1);
        expect(grouped.text[0].text).toBe('Hello');
        expect(grouped.text[1].text).toBe('World');
      });
    });
  });

  describe('Role handling across providers', () => {
    const testMessages: Message[] = [
      {
        role: 'system',
        content: [{ type: 'text', text: 'System message 1' }],
      },
      {
        role: 'system',
        content: [{ type: 'text', text: 'System message 2' }],
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'User text 1' },
          { type: 'text', text: 'User text 2' },
        ],
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Assistant response' }],
        toolCalls: [
          {
            id: 'call1',
            name: 'test_tool',
            arguments: { param: 'value' },
          },
        ],
      },
      {
        role: 'tool',
        content: [{ type: 'tool_result', toolCallId: 'call1', result: 'Tool result' }],
      },
    ];

    it('should handle multiple text blocks correctly', () => {
      const userMessage = testMessages.find(m => m.role === 'user');
      const grouped = MessageTransformer.groupContentByType(userMessage!.content);

      expect(grouped.text).toHaveLength(2);
      expect(grouped.text[0].text).toBe('User text 1');
      expect(grouped.text[1].text).toBe('User text 2');

      // Combined text should join with newlines
      const combinedText = grouped.text.map(t => t.text).join('\n');
      expect(combinedText).toBe('User text 1\nUser text 2');
    });

    it('should handle multiple system messages', () => {
      const systemMessages = testMessages.filter(m => m.role === 'system');
      expect(systemMessages).toHaveLength(2);

      const combinedSystem = systemMessages
        .map(m => MessageTransformer.extractTextContent(m.content))
        .join('\n\n');

      expect(combinedSystem).toBe('System message 1\n\nSystem message 2');
    });

    it('should handle tool calls and results', () => {
      const assistantMessage = testMessages.find(m => m.role === 'assistant');
      const toolMessage = testMessages.find(m => m.role === 'tool');

      expect(assistantMessage!.toolCalls).toHaveLength(1);
      expect(assistantMessage!.toolCalls![0].id).toBe('call1');

      const toolResult = MessageTransformer.groupContentByType(toolMessage!.content);
      expect(toolResult.toolResults).toHaveLength(1);
      expect(toolResult.toolResults[0].toolCallId).toBe('call1');
    });
  });

  describe('Content handling improvements', () => {
    it('should handle mixed content with tool results in user messages', () => {
      const mixedContent: Content[] = [
        { type: 'text', text: 'First text block' },
        { type: 'tool_result', toolCallId: 'call1', result: 'Some result' },
        { type: 'text', text: 'Second text block' },
        { type: 'image', image: 'data:image/png;base64,abc123' },
      ];

      const grouped = MessageTransformer.groupContentByType(mixedContent);

      expect(grouped.text).toHaveLength(2);
      expect(grouped.text[0].text).toBe('First text block');
      expect(grouped.text[1].text).toBe('Second text block');

      expect(grouped.toolResults).toHaveLength(1);
      expect(grouped.toolResults[0].toolCallId).toBe('call1');
      expect(grouped.toolResults[0].result).toBe('Some result');

      expect(grouped.images).toHaveLength(1);
      expect(grouped.images[0].image).toBe('data:image/png;base64,abc123');
    });

    it('should preserve text block structure and not combine them inappropriately', () => {
      const structuredContent: Content[] = [
        { type: 'text', text: 'Question: What is 2+2?' },
        { type: 'text', text: 'Answer: 4' },
        { type: 'text', text: 'Explanation: Basic arithmetic' },
      ];

      const grouped = MessageTransformer.groupContentByType(structuredContent);

      // Should preserve individual text blocks
      expect(grouped.text).toHaveLength(3);
      expect(grouped.text[0].text).toBe('Question: What is 2+2?');
      expect(grouped.text[1].text).toBe('Answer: 4');
      expect(grouped.text[2].text).toBe('Explanation: Basic arithmetic');
    });

    it('should handle empty and whitespace-only text blocks', () => {
      const mixedWhitespaceContent: Content[] = [
        { type: 'text', text: 'Valid text' },
        { type: 'text', text: '   ' }, // whitespace only
        { type: 'text', text: '' }, // empty
        { type: 'text', text: 'Another valid text' },
      ];

      const grouped = MessageTransformer.groupContentByType(mixedWhitespaceContent);

      // Should include all text blocks, even empty ones (transformers should handle filtering)
      expect(grouped.text).toHaveLength(4);
      expect(grouped.text[0].text).toBe('Valid text');
      expect(grouped.text[1].text).toBe('   ');
      expect(grouped.text[2].text).toBe('');
      expect(grouped.text[3].text).toBe('Another valid text');
    });
  });

  describe('Content validation', () => {
    it('should validate data URLs correctly', () => {
      expect(MessageTransformer.parseJson('{"valid": true}', { valid: false })).toEqual({
        valid: true,
      });
      expect(MessageTransformer.parseJson('invalid json', { valid: false })).toEqual({
        valid: false,
      });
    });

    it('should handle empty content arrays', () => {
      const emptyContent: Content[] = [];
      const grouped = MessageTransformer.groupContentByType(emptyContent);

      expect(grouped.text).toHaveLength(0);
      expect(grouped.images).toHaveLength(0);
      expect(grouped.toolResults).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const whitespaceContent: Content[] = [
        { type: 'text', text: '   ' },
        { type: 'text', text: '\n\t' },
      ];

      const grouped = MessageTransformer.groupContentByType(whitespaceContent);
      expect(grouped.text).toHaveLength(2);

      const combinedText = grouped.text.map(t => t.text).join('\n');
      expect(combinedText.trim()).toBe('');
    });
  });
});
