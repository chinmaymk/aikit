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

// Additional tests for RequestBuilder
import { RequestBuilder } from '../../src/providers/utils';

import { StreamUtils } from '../../src/providers/utils';

describe('Provider Utils - StreamUtils', () => {
  it('should parse valid stream event JSON', () => {
    const validJson = '{"type": "chunk", "data": "test"}';
    const result = StreamUtils.parseStreamEvent(validJson);
    expect(result).toEqual({ type: 'chunk', data: 'test' });
  });

  it('should return null for empty or [DONE] data', () => {
    expect(StreamUtils.parseStreamEvent('')).toBeNull();
    expect(StreamUtils.parseStreamEvent('   ')).toBeNull();
    expect(StreamUtils.parseStreamEvent('[DONE]')).toBeNull();
    expect(StreamUtils.parseStreamEvent('  [DONE]  ')).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const invalidJson = '{"invalid": json}';
    const result = StreamUtils.parseStreamEvent(invalidJson);
    expect(result).toBeNull();
  });

  it('should detect stream done marker', () => {
    expect(StreamUtils.isStreamDone('[DONE]')).toBe(true);
    expect(StreamUtils.isStreamDone('  [DONE]  ')).toBe(true);
    expect(StreamUtils.isStreamDone('{"data": "test"}')).toBe(false);
  });
});

describe('Provider Utils - RequestBuilder edge cases', () => {
  it('should handle undefined tool choice', () => {
    expect(RequestBuilder.formatToolChoice(undefined, 'openai')).toBe('auto');
    expect(RequestBuilder.formatToolChoice(undefined, 'responses')).toBe('auto');
  });

  it('should handle all string tool choice values', () => {
    // Test all possible string values for different formats
    expect(RequestBuilder.formatToolChoice('auto', 'openai')).toBe('auto');
    expect(RequestBuilder.formatToolChoice('required', 'openai')).toBe('required');
    expect(RequestBuilder.formatToolChoice('auto', 'responses')).toBe('auto');
    expect(RequestBuilder.formatToolChoice('required', 'responses')).toBe('required');
  });

  it('should handle object tool choice for all formats', () => {
    const toolChoice = { name: 'test_function' };

    const openaiResult = RequestBuilder.formatToolChoice(toolChoice, 'openai');
    expect(openaiResult).toEqual({
      type: 'function',
      function: { name: 'test_function' },
    });

    const responsesResult = RequestBuilder.formatToolChoice(toolChoice, 'responses');
    expect(responsesResult).toEqual({
      type: 'function',
      name: 'test_function',
    });
  });

  it('should add optional params correctly with all mappings', () => {
    const params: Record<string, unknown> = { existing: 'value' };
    const options = {
      opt1: 'test1',
      opt2: undefined,
      opt3: 'test3',
      opt4: null,
      opt5: 0,
      opt6: false,
    };
    const mappings = {
      opt1: 'param1',
      opt2: 'param2',
      opt3: 'param3',
      opt4: 'param4',
      opt5: 'param5',
      opt6: 'param6',
    } as Record<keyof typeof options, string>;

    RequestBuilder.addOptionalParams(params, options, mappings);

    expect(params.existing).toBe('value');
    expect(params.param1).toBe('test1');
    expect(params.param2).toBeUndefined(); // undefined values are not added
    expect(params.param3).toBe('test3');
    expect(params.param4).toBeNull(); // null values are added
    expect(params.param5).toBe(0); // falsy but defined values are added
    expect(params.param6).toBe(false); // falsy but defined values are added
  });
});

import { StreamState } from '../../src/providers/utils';

describe('Provider Utils - StreamState comprehensive', () => {
  it('should handle first token timing correctly for reasoning', () => {
    const state = new StreamState();

    // Add empty/whitespace reasoning first - should not set timing
    state.addReasoningDelta('   ');
    expect(state.getTimeToFirstToken()).toBeUndefined();

    // Add meaningful reasoning content - should set timing
    const reasoning = state.addReasoningDelta('meaningful reasoning');
    expect(reasoning).toEqual({
      delta: 'meaningful reasoning',
      content: '   meaningful reasoning',
    });
    expect(state.getTimeToFirstToken()).toBeDefined();
  });

  it('should handle addToolCallArgs for non-existent tool call', () => {
    const state = new StreamState();

    // Try to add args to non-existent tool call - should not crash
    state.addToolCallArgs('non-existent-id', '{"key": "value"}');

    const toolCalls = state.finalizeToolCalls();
    expect(toolCalls).toBeUndefined();
  });

  it('should handle createChunk with comprehensive timing data', () => {
    const state = new StreamState();

    // Add some content to set first token timing
    state.addContentDelta('test content');

    // Wait a bit to ensure timing difference
    setTimeout(() => {
      const chunk = state.createChunk('delta', 'stop', { inputTokens: 10, outputTokens: 5 });

      expect(chunk.usage).toBeDefined();
      expect(chunk.usage?.inputTokens).toBe(10);
      expect(chunk.usage?.outputTokens).toBe(5);
      expect(chunk.usage?.timeToFirstToken).toBeDefined();
      expect(chunk.usage?.totalTime).toBeDefined();
    }, 1);
  });
});
