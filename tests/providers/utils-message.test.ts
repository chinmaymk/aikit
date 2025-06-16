import { type Content, type ToolCall } from '@chinmaymk/aikit';

// Import the utilities directly from the providers/utils file
import { MessageTransformer } from '../../src/providers/utils';

describe('Provider Utils - Message Transformation', () => {
  describe('MessageTransformer', () => {
    describe('extractTextContent', () => {
      it('should extract text from text content', () => {
        const content: Content[] = [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'World' },
        ];
        const result = MessageTransformer.extractTextContent(content);
        expect(result).toBe('Hello');
      });

      it('should return empty string for non-text content', () => {
        const content: Content[] = [{ type: 'image', image: 'data:image/png;base64,abc' }];
        const result = MessageTransformer.extractTextContent(content);
        expect(result).toBe('');
      });

      it('should handle empty content array', () => {
        const result = MessageTransformer.extractTextContent([]);
        expect(result).toBe('');
      });
    });

    describe('groupContentByType', () => {
      it('should group content by type', () => {
        const content: Content[] = [
          { type: 'text', text: 'Hello' },
          { type: 'image', image: 'data:image/png;base64,abc' },
          { type: 'tool_result', toolCallId: '1', result: 'result' },
          { type: 'text', text: 'World' },
        ];

        const result = MessageTransformer.groupContentByType(content);
        expect(result.text).toHaveLength(2);
        expect(result.images).toHaveLength(1);
        expect(result.toolResults).toHaveLength(1);
      });

      it('should handle empty content array', () => {
        const result = MessageTransformer.groupContentByType([]);
        expect(result.text).toHaveLength(0);
        expect(result.images).toHaveLength(0);
        expect(result.toolResults).toHaveLength(0);
      });
    });

    describe('extractBase64Data', () => {
      it('should extract base64 data from data URL', () => {
        const dataUrl =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const result = MessageTransformer.extractBase64Data(dataUrl);
        expect(result).toBe(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        );
      });

      it('should return original string for invalid data URL', () => {
        const dataUrl = 'invalid-url';
        const result = MessageTransformer.extractBase64Data(dataUrl);
        expect(result).toBe('invalid-url');
      });
    });

    describe('parseJson', () => {
      it('should parse valid JSON', () => {
        const jsonString = '{"key": "value"}';
        const result = MessageTransformer.parseJson(jsonString, {});
        expect(result).toEqual({ key: 'value' });
      });

      it('should return fallback for invalid JSON', () => {
        const jsonString = 'invalid-json';
        const fallback = { default: true };
        const result = MessageTransformer.parseJson(jsonString, fallback);
        expect(result).toEqual(fallback);
      });

      it('should handle empty string', () => {
        const result = MessageTransformer.parseJson('', null);
        expect(result).toBeNull();
      });
    });

    describe('detectImageMimeType', () => {
      it('should detect PNG mime type', () => {
        const dataUrl = 'data:image/png;base64,abc';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/png');
      });

      it('should detect JPEG mime type', () => {
        const dataUrl = 'data:image/jpeg;base64,abc';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/jpeg');
      });

      it('should detect WebP mime type', () => {
        const dataUrl = 'data:image/webp;base64,abc';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/webp');
      });

      it('should detect GIF mime type', () => {
        const dataUrl = 'data:image/gif;base64,abc';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/gif');
      });

      it('should return default for unknown mime type', () => {
        const dataUrl = 'data:image/unknown;base64,abc';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/jpeg');
      });

      it('should handle invalid data URL', () => {
        const dataUrl = 'invalid-url';
        const result = MessageTransformer.detectImageMimeType(dataUrl);
        expect(result).toBe('image/jpeg');
      });
    });

    describe('createStreamChunk', () => {
      it('should create stream chunk with content and delta', () => {
        const chunk = MessageTransformer.createStreamChunk('Hello', ' World');
        expect(chunk.content).toBe('Hello');
        expect(chunk.delta).toBe(' World');
        expect(chunk.toolCalls).toBeUndefined();
        expect(chunk.finishReason).toBeUndefined();
      });

      it('should create stream chunk with tool calls', () => {
        const toolCalls: ToolCall[] = [{ id: '1', name: 'test', arguments: { key: 'value' } }];
        const chunk = MessageTransformer.createStreamChunk(
          'Hello',
          ' World',
          toolCalls,
          'tool_use'
        );
        expect(chunk.content).toBe('Hello');
        expect(chunk.delta).toBe(' World');
        expect(chunk.toolCalls).toEqual(toolCalls);
        expect(chunk.finishReason).toBe('tool_use');
      });

      it('should create stream chunk with reasoning', () => {
        const reasoning = { content: 'thinking...', delta: 'more' };
        const chunk = MessageTransformer.createStreamChunk(
          'Hello',
          ' World',
          undefined,
          'stop',
          reasoning
        );
        expect(chunk.content).toBe('Hello');
        expect(chunk.delta).toBe(' World');
        expect(chunk.reasoning).toEqual(reasoning);
        expect(chunk.finishReason).toBe('stop');
      });
    });
  });
});
