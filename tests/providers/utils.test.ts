import {
  type Content,
  type TextContent,
  type ImageContent,
  type ToolResultContent,
  type ToolCall,
  type FinishReason,
  type Tool,
  type StreamChunk,
} from '@chinmaymk/aikit';

// Import the utilities directly from the providers/utils file
import {
  MessageTransformer,
  StreamUtils,
  StreamState,
  ValidationUtils,
  RequestBuilder,
  ResponseProcessor,
} from '../../src/providers/utils';

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
      const chunk = MessageTransformer.createStreamChunk('Hello', ' World', toolCalls, 'tool_use');
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

describe('StreamUtils', () => {
  describe('parseStreamEvent', () => {
    it('should parse valid JSON data', () => {
      const data = '{"key": "value"}';
      const result = StreamUtils.parseStreamEvent(data);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return null for invalid JSON', () => {
      const data = 'invalid-json';
      const result = StreamUtils.parseStreamEvent(data);
      expect(result).toBeNull();
    });

    it('should handle data without colon', () => {
      const data = 'invalid-format';
      const result = StreamUtils.parseStreamEvent(data);
      expect(result).toBeNull();
    });

    it('should handle empty data', () => {
      const data = '';
      const result = StreamUtils.parseStreamEvent(data);
      expect(result).toBeNull();
    });
  });

  describe('isStreamDone', () => {
    it('should return true for [DONE] marker', () => {
      const data = '[DONE]';
      const result = StreamUtils.isStreamDone(data);
      expect(result).toBe(true);
    });

    it('should return false for regular data', () => {
      const data = '{"key": "value"}';
      const result = StreamUtils.isStreamDone(data);
      expect(result).toBe(false);
    });

    it('should handle case insensitive DONE marker', () => {
      const data = '[done]';
      const result = StreamUtils.isStreamDone(data);
      expect(result).toBe(false);
    });
  });
});

describe('StreamState', () => {
  let streamState: StreamState;

  beforeEach(() => {
    streamState = new StreamState();
  });

  describe('addContentDelta', () => {
    it('should add content delta', () => {
      streamState.addContentDelta('Hello');
      streamState.addContentDelta(' World');
      expect(streamState.content).toBe('Hello World');
    });
  });

  describe('addReasoningDelta', () => {
    it('should add reasoning delta', () => {
      const result1 = streamState.addReasoningDelta('Think');
      expect(result1.content).toBe('Think');
      expect(result1.delta).toBe('Think');
      expect(streamState.reasoning).toBe('Think');

      const result2 = streamState.addReasoningDelta('ing');
      expect(result2.content).toBe('Thinking');
      expect(result2.delta).toBe('ing');
      expect(streamState.reasoning).toBe('Thinking');
    });
  });

  describe('getFinalReasoning', () => {
    it('should return final reasoning when exists', () => {
      streamState.addReasoningDelta('Final thought');
      const result = streamState.getFinalReasoning();
      expect(result).toEqual({
        content: 'Final thought',
        delta: '',
      });
    });

    it('should return undefined when no reasoning', () => {
      const result = streamState.getFinalReasoning();
      expect(result).toBeUndefined();
    });
  });

  describe('initToolCall', () => {
    it('should initialize tool call', () => {
      streamState.initToolCall('call_1', 'testTool');
      expect(streamState.toolCallStates['call_1']).toEqual({
        name: 'testTool',
        arguments: '',
      });
      expect(streamState.hasToolCalls).toBe(true);
    });
  });

  describe('addToolCallArgs', () => {
    it('should add arguments to existing tool call', () => {
      streamState.initToolCall('call_1', 'testTool');
      streamState.addToolCallArgs('call_1', '{"key":');
      streamState.addToolCallArgs('call_1', '"value"}');
      expect(streamState.toolCallStates['call_1'].arguments).toBe('{"key":"value"}');
    });

    it('should ignore arguments for non-existent tool call', () => {
      streamState.addToolCallArgs('nonexistent', '{"key":"value"}');
      expect(streamState.toolCallStates['nonexistent']).toBeUndefined();
    });
  });

  describe('finalizeToolCalls', () => {
    it('should finalize tool calls', () => {
      streamState.initToolCall('call_1', 'testTool');
      streamState.addToolCallArgs('call_1', '{"key":"value"}');
      streamState.initToolCall('call_2', 'anotherTool');
      streamState.addToolCallArgs('call_2', '{"param":"data"}');

      const result = streamState.finalizeToolCalls();
      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({
        id: 'call_1',
        name: 'testTool',
        arguments: { key: 'value' },
      });
      expect(result![1]).toEqual({
        id: 'call_2',
        name: 'anotherTool',
        arguments: { param: 'data' },
      });
    });

    it('should return undefined when no tool calls', () => {
      const result = streamState.finalizeToolCalls();
      expect(result).toBeUndefined();
    });

    it('should handle invalid JSON in arguments', () => {
      streamState.initToolCall('call_1', 'testTool');
      streamState.addToolCallArgs('call_1', 'invalid-json');

      const result = streamState.finalizeToolCalls();
      expect(result![0]).toEqual({
        id: 'call_1',
        name: 'testTool',
        arguments: {},
      });
    });
  });

  describe('createChunk', () => {
    it('should create chunk with content and delta', () => {
      streamState.addContentDelta('Hello');
      const chunk = streamState.createChunk(' World');
      expect(chunk.content).toBe('Hello');
      expect(chunk.delta).toBe(' World');
    });

    it('should create chunk with finalized tool calls', () => {
      streamState.addContentDelta('Hello');
      streamState.initToolCall('call_1', 'testTool');
      streamState.addToolCallArgs('call_1', '{"key":"value"}');

      const chunk = streamState.createChunk(' World', 'tool_use');
      expect(chunk.content).toBe('Hello');
      expect(chunk.delta).toBe(' World');
      expect(chunk.finishReason).toBe('tool_use');
      expect(chunk.toolCalls).toHaveLength(1);
    });

    it('should create chunk with reasoning', () => {
      streamState.addContentDelta('Hello');
      streamState.addReasoningDelta('Thinking');

      const chunk = streamState.createChunk(' World', 'stop');
      expect(chunk.content).toBe('Hello');
      expect(chunk.delta).toBe(' World');
      expect(chunk.finishReason).toBe('stop');
      expect(chunk.reasoning).toEqual({
        content: 'Thinking',
        delta: '',
      });
    });
  });
});

describe('ValidationUtils', () => {
  describe('isValidDataUrl', () => {
    it('should validate correct data URLs', () => {
      const validUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      expect(ValidationUtils.isValidDataUrl(validUrl)).toBe(true);
    });

    it('should reject invalid data URLs', () => {
      expect(ValidationUtils.isValidDataUrl('http://example.com/image.png')).toBe(false);
      expect(ValidationUtils.isValidDataUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
      expect(ValidationUtils.isValidDataUrl('data:image/png;charset=utf-8,text')).toBe(false);
      expect(ValidationUtils.isValidDataUrl('')).toBe(false);
    });
  });

  describe('isValidToolCall', () => {
    it('should validate correct tool calls', () => {
      const validToolCall = {
        id: 'call_123',
        name: 'test_function',
        arguments: { key: 'value' },
      };
      expect(ValidationUtils.isValidToolCall(validToolCall)).toBe(true);
    });

    it('should reject invalid tool calls', () => {
      expect(ValidationUtils.isValidToolCall(null)).toBe(false);
      expect(ValidationUtils.isValidToolCall(undefined)).toBe(false);
      expect(ValidationUtils.isValidToolCall('string')).toBe(false);
      expect(ValidationUtils.isValidToolCall({})).toBe(false);
      expect(ValidationUtils.isValidToolCall({ id: 'call_123' })).toBe(false);
      expect(ValidationUtils.isValidToolCall({ name: 'test_function' })).toBe(false);
      expect(ValidationUtils.isValidToolCall({ id: 123, name: 'test_function' })).toBe(false);
      expect(ValidationUtils.isValidToolCall({ id: 'call_123', name: 456 })).toBe(false);
    });
  });
});

describe('RequestBuilder', () => {
  describe('addOptionalParams', () => {
    it('should add optional parameters when they exist', () => {
      const params: Record<string, unknown> = { baseParam: 'base' };
      const options = { temperature: 0.7, maxTokens: 100, missing: undefined };
      const mappings = { temperature: 'temp', maxTokens: 'max_tokens', missing: 'missing_param' };

      RequestBuilder.addOptionalParams(params, options, mappings);

      expect(params).toEqual({
        baseParam: 'base',
        temp: 0.7,
        max_tokens: 100,
      });
    });

    it('should not add parameters when they are undefined', () => {
      const params: Record<string, unknown> = { baseParam: 'base' };
      const options = { temperature: undefined };
      const mappings = { temperature: 'temp' };

      RequestBuilder.addOptionalParams(params, options, mappings);

      expect(params).toEqual({ baseParam: 'base' });
    });
  });

  describe('formatTools', () => {
    const tools: Tool[] = [
      {
        name: 'test_function',
        description: 'A test function',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' },
          },
        },
      },
    ];

    it('should format tools for OpenAI format', () => {
      const result = RequestBuilder.formatTools(tools, 'openai');
      expect(result).toEqual([
        {
          type: 'function',
          function: {
            name: 'test_function',
            description: 'A test function',
            parameters: {
              type: 'object',
              properties: {
                param1: { type: 'string' },
              },
            },
          },
        },
      ]);
    });

    it('should format tools for responses format', () => {
      const result = RequestBuilder.formatTools(tools, 'responses');
      expect(result).toEqual([
        {
          type: 'function',
          name: 'test_function',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {
              param1: { type: 'string' },
            },
          },
        },
      ]);
    });
  });

  describe('formatToolChoice', () => {
    it('should return "auto" for undefined tool choice', () => {
      expect(RequestBuilder.formatToolChoice(undefined, 'openai')).toBe('auto');
      expect(RequestBuilder.formatToolChoice(undefined, 'responses')).toBe('auto');
    });

    it('should handle string tool choices for OpenAI format', () => {
      expect(RequestBuilder.formatToolChoice('none', 'openai')).toBe('none');
      expect(RequestBuilder.formatToolChoice('required', 'openai')).toBe('required');
    });

    it('should handle string tool choices for responses format', () => {
      expect(RequestBuilder.formatToolChoice('none', 'responses')).toBe('auto');
      expect(RequestBuilder.formatToolChoice('required', 'responses')).toBe('required');
    });

    it('should handle object tool choices for OpenAI format', () => {
      const toolChoice = { name: 'test_function' };
      const result = RequestBuilder.formatToolChoice(toolChoice, 'openai');
      expect(result).toEqual({
        type: 'function',
        function: { name: 'test_function' },
      });
    });

    it('should handle object tool choices for responses format', () => {
      const toolChoice = { name: 'test_function' };
      const result = RequestBuilder.formatToolChoice(toolChoice, 'responses');
      expect(result).toEqual({
        type: 'function',
        name: 'test_function',
      });
    });
  });
});

describe('ResponseProcessor', () => {
  describe('mapFinishReason', () => {
    it('should map known finish reasons', () => {
      const mapping = {
        stop: 'stop' as FinishReason,
        length: 'length' as FinishReason,
        tool_calls: 'tool_use' as FinishReason,
      };

      expect(ResponseProcessor.mapFinishReason('stop', mapping)).toBe('stop');
      expect(ResponseProcessor.mapFinishReason('length', mapping)).toBe('length');
      expect(ResponseProcessor.mapFinishReason('tool_calls', mapping)).toBe('tool_use');
    });

    it('should return default for unknown finish reasons', () => {
      const mapping = {
        stop: 'stop' as FinishReason,
      };

      expect(ResponseProcessor.mapFinishReason('unknown', mapping)).toBe('stop');
    });
  });

  describe('processStreamLines', () => {
    async function* createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
      for (const item of items) {
        yield item;
      }
    }

    it('should process stream lines and extract data', async () => {
      const lines = createAsyncIterable(['line1', 'line2', 'line3']);
      const extractFn = (line: string) => (line === 'line2' ? { data: line } : null);

      const results = [];
      for await (const result of ResponseProcessor.processStreamLines(lines, extractFn)) {
        results.push(result);
      }

      expect(results).toEqual([{ data: 'line2' }]);
    });

    it('should handle empty stream', async () => {
      const lines = createAsyncIterable([]);
      const extractFn = (line: string) => ({ data: line });

      const results = [];
      for await (const result of ResponseProcessor.processStreamLines(lines, extractFn)) {
        results.push(result);
      }

      expect(results).toEqual([]);
    });

    it('should handle extract function returning null for all lines', async () => {
      const lines = createAsyncIterable(['line1', 'line2', 'line3']);
      const extractFn = () => null;

      const results = [];
      for await (const result of ResponseProcessor.processStreamLines(lines, extractFn)) {
        results.push(result);
      }

      expect(results).toEqual([]);
    });
  });
});
