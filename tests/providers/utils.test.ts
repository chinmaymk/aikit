import { type Content, type ToolCall } from '@chinmaymk/aikit';
import { MessageTransformer, StreamUtils, ValidationUtils } from '@chinmaymk/aikit/providers/utils';

describe('MessageTransformer', () => {
  describe('extractTextContent', () => {
    it('should extract text from content array', () => {
      const content: Content[] = [
        { type: 'text', text: 'Hello world' },
        { type: 'image', image: 'data:image/png;base64,abc123' },
      ];
      expect(MessageTransformer.extractTextContent(content)).toBe('Hello world');
    });

    it('should return empty string when no text content', () => {
      const content: Content[] = [{ type: 'image', image: 'data:image/png;base64,abc123' }];
      expect(MessageTransformer.extractTextContent(content)).toBe('');
    });

    it('should return empty string for empty content array', () => {
      expect(MessageTransformer.extractTextContent([])).toBe('');
    });
  });

  describe('groupContentByType', () => {
    it('should group content by type', () => {
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

    it('should handle empty content array', () => {
      const grouped = MessageTransformer.groupContentByType([]);
      expect(grouped.text).toHaveLength(0);
      expect(grouped.images).toHaveLength(0);
      expect(grouped.toolResults).toHaveLength(0);
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

    it('should handle JPEG data URLs', () => {
      const dataUrl =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
      const result = MessageTransformer.extractBase64Data(dataUrl);
      expect(result).toBe(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A'
      );
    });
  });

  describe('parseJson', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"key": "value", "number": 42}';
      const result = MessageTransformer.parseJson(validJson, {});
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should return fallback for invalid JSON', () => {
      const invalidJson = '{"key": invalid}';
      const fallback = { error: true };
      const result = MessageTransformer.parseJson(invalidJson, fallback);
      expect(result).toEqual(fallback);
    });

    it('should return fallback for empty string', () => {
      const result = MessageTransformer.parseJson('', null);
      expect(result).toBeNull();
    });

    it('should work with different types', () => {
      const arrayJson = '[1, 2, 3]';
      const result = MessageTransformer.parseJson(arrayJson, []);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('detectImageMimeType', () => {
    it('should detect JPEG from data URL', () => {
      const jpegUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
      expect(MessageTransformer.detectImageMimeType(jpegUrl)).toBe('image/jpeg');
    });

    it('should detect JPG from data URL', () => {
      const jpgUrl = 'data:image/jpg;base64,/9j/4AAQSkZJRg...';
      expect(MessageTransformer.detectImageMimeType(jpgUrl)).toBe('image/jpeg');
    });

    it('should detect PNG from data URL', () => {
      const pngUrl = 'data:image/png;base64,iVBORw0KGgo...';
      expect(MessageTransformer.detectImageMimeType(pngUrl)).toBe('image/png');
    });

    it('should detect GIF from data URL', () => {
      const gifUrl = 'data:image/gif;base64,R0lGODlh...';
      expect(MessageTransformer.detectImageMimeType(gifUrl)).toBe('image/gif');
    });

    it('should detect WebP from data URL', () => {
      const webpUrl = 'data:image/webp;base64,UklGRj4...';
      expect(MessageTransformer.detectImageMimeType(webpUrl)).toBe('image/webp');
    });

    it('should fallback to JPEG for unknown formats', () => {
      const unknownUrl = 'data:image/unknown;base64,abc123';
      expect(MessageTransformer.detectImageMimeType(unknownUrl)).toBe('image/jpeg');
    });

    it('should fallback to JPEG for malformed URLs', () => {
      const malformedUrl = 'not-a-data-url';
      expect(MessageTransformer.detectImageMimeType(malformedUrl)).toBe('image/jpeg');
    });
  });

  describe('createStreamChunk', () => {
    it('should create basic stream chunk', () => {
      const chunk = MessageTransformer.createStreamChunk('Hello world', 'world');
      expect(chunk).toEqual({
        content: 'Hello world',
        delta: 'world',
        toolCalls: undefined,
        finishReason: undefined,
      });
    });

    it('should create stream chunk with tool calls', () => {
      const toolCalls: ToolCall[] = [
        { id: 'call1', name: 'test_tool', arguments: { param: 'value' } },
      ];
      const chunk = MessageTransformer.createStreamChunk('Content', 'delta', toolCalls);
      expect(chunk).toEqual({
        content: 'Content',
        delta: 'delta',
        toolCalls,
        finishReason: undefined,
      });
    });

    it('should create stream chunk with finish reason', () => {
      const chunk = MessageTransformer.createStreamChunk('Final content', '', undefined, 'stop');
      expect(chunk).toEqual({
        content: 'Final content',
        delta: '',
        toolCalls: undefined,
        finishReason: 'stop',
      });
    });

    it('should create complete stream chunk', () => {
      const toolCalls: ToolCall[] = [{ id: 'call1', name: 'tool', arguments: {} }];
      const chunk = MessageTransformer.createStreamChunk('Complete', 'ete', toolCalls, 'tool_use');
      expect(chunk).toEqual({
        content: 'Complete',
        delta: 'ete',
        toolCalls,
        finishReason: 'tool_use',
      });
    });
  });
});

describe('StreamUtils', () => {
  describe('parseStreamEvent', () => {
    it('should parse valid JSON stream event', () => {
      const jsonData = '{"type": "text_delta", "delta": "hello"}';
      const result = StreamUtils.parseStreamEvent<{ type: string; delta: string }>(jsonData);
      expect(result).toEqual({ type: 'text_delta', delta: 'hello' });
    });

    it('should return null for invalid JSON', () => {
      const invalidData = '{invalid json}';
      const result = StreamUtils.parseStreamEvent(invalidData);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = StreamUtils.parseStreamEvent('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = StreamUtils.parseStreamEvent('   \t\n  ');
      expect(result).toBeNull();
    });

    it('should return null for [DONE] marker', () => {
      const result = StreamUtils.parseStreamEvent('[DONE]');
      expect(result).toBeNull();
    });

    it('should return null for [DONE] with whitespace', () => {
      const result = StreamUtils.parseStreamEvent('  [DONE]  ');
      expect(result).toBeNull();
    });
  });

  describe('isStreamDone', () => {
    it('should return true for [DONE] marker', () => {
      expect(StreamUtils.isStreamDone('[DONE]')).toBe(true);
    });

    it('should return true for [DONE] with whitespace', () => {
      expect(StreamUtils.isStreamDone('  [DONE]  ')).toBe(true);
    });

    it('should return false for other data', () => {
      expect(StreamUtils.isStreamDone('{"type": "event"}')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(StreamUtils.isStreamDone('')).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(StreamUtils.isStreamDone('[DONE] extra')).toBe(false);
    });
  });
});

describe('ValidationUtils', () => {
  describe('isValidDataUrl', () => {
    it('should return true for valid PNG data URL', () => {
      const validUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAY=';
      expect(ValidationUtils.isValidDataUrl(validUrl)).toBe(true);
    });

    it('should return true for valid JPEG data URL', () => {
      const validUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD=';
      expect(ValidationUtils.isValidDataUrl(validUrl)).toBe(true);
    });

    it('should return false for non-image data URL', () => {
      const nonImageUrl = 'data:text/plain;base64,SGVsbG8gd29ybGQ=';
      expect(ValidationUtils.isValidDataUrl(nonImageUrl)).toBe(false);
    });

    it('should return false for URL without base64', () => {
      const urlWithoutBase64 = 'data:image/png;charset=utf-8,text';
      expect(ValidationUtils.isValidDataUrl(urlWithoutBase64)).toBe(false);
    });

    it('should return false for non-data URL', () => {
      const httpUrl = 'https://example.com/image.png';
      expect(ValidationUtils.isValidDataUrl(httpUrl)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(ValidationUtils.isValidDataUrl('')).toBe(false);
    });
  });

  describe('isValidToolCall', () => {
    it('should return true for valid tool call', () => {
      const validToolCall = { id: 'call_123', name: 'test_function', arguments: {} };
      expect(ValidationUtils.isValidToolCall(validToolCall)).toBe(true);
    });

    it('should return true for tool call with extra properties', () => {
      const toolCallWithExtra = {
        id: 'call_456',
        name: 'another_function',
        arguments: { param: 'value' },
        extra: 'property',
      };
      expect(ValidationUtils.isValidToolCall(toolCallWithExtra)).toBe(true);
    });

    it('should return false for tool call without id', () => {
      const toolCallWithoutId = { name: 'function', arguments: {} };
      expect(ValidationUtils.isValidToolCall(toolCallWithoutId)).toBe(false);
    });

    it('should return false for tool call without name', () => {
      const toolCallWithoutName = { id: 'call_789', arguments: {} };
      expect(ValidationUtils.isValidToolCall(toolCallWithoutName)).toBe(false);
    });

    it('should return false for tool call with non-string id', () => {
      const toolCallWithNumericId = { id: 123, name: 'function', arguments: {} };
      expect(ValidationUtils.isValidToolCall(toolCallWithNumericId)).toBe(false);
    });

    it('should return false for tool call with non-string name', () => {
      const toolCallWithNumericName = { id: 'call_999', name: 123, arguments: {} };
      expect(ValidationUtils.isValidToolCall(toolCallWithNumericName)).toBe(false);
    });

    it('should return false for null', () => {
      expect(ValidationUtils.isValidToolCall(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(ValidationUtils.isValidToolCall(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(ValidationUtils.isValidToolCall('string')).toBe(false);
      expect(ValidationUtils.isValidToolCall(123)).toBe(false);
      expect(ValidationUtils.isValidToolCall(true)).toBe(false);
    });
  });
});
