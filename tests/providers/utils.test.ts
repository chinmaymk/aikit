import {
  MessageTransformer,
  ToolFormatter,
  ToolChoiceHandler,
  FinishReasonMapper,
} from '../../src/providers/utils';
import type { Content, Tool } from '../../src/types';

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
});

describe('ToolFormatter', () => {
  const mockTool: Tool = {
    name: 'get_weather',
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
      },
    },
  };

  describe('formatForOpenAI', () => {
    it('should format tools for OpenAI API', () => {
      const result = ToolFormatter.formatForOpenAI([mockTool]);
      expect(result).toEqual([
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          },
        },
      ]);
    });
  });

  describe('formatForAnthropic', () => {
    it('should format tools for Anthropic API', () => {
      const result = ToolFormatter.formatForAnthropic([mockTool]);
      expect(result).toEqual([
        {
          name: 'get_weather',
          description: 'Get weather information',
          input_schema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
          },
        },
      ]);
    });
  });

  describe('formatForGoogle', () => {
    it('should format tools for Google API', () => {
      const result = ToolFormatter.formatForGoogle([mockTool]);
      expect(result).toEqual([
        {
          functionDeclarations: [mockTool],
        },
      ]);
    });
  });
});

describe('ToolChoiceHandler', () => {
  describe('formatForOpenAI', () => {
    it('should handle string tool choice', () => {
      expect(ToolChoiceHandler.formatForOpenAI('auto')).toBe('auto');
      expect(ToolChoiceHandler.formatForOpenAI('none')).toBe('none');
    });

    it('should handle object tool choice', () => {
      const result = ToolChoiceHandler.formatForOpenAI({ name: 'get_weather' });
      expect(result).toEqual({
        type: 'function',
        function: { name: 'get_weather' },
      });
    });
  });

  describe('formatForAnthropic', () => {
    it('should handle string tool choices', () => {
      expect(ToolChoiceHandler.formatForAnthropic('required')).toEqual({ type: 'any' });
      expect(ToolChoiceHandler.formatForAnthropic('auto')).toEqual({ type: 'auto' });
      expect(ToolChoiceHandler.formatForAnthropic('none')).toEqual({ type: 'auto' });
    });

    it('should handle object tool choice', () => {
      const result = ToolChoiceHandler.formatForAnthropic({ name: 'get_weather' });
      expect(result).toEqual({
        type: 'tool',
        name: 'get_weather',
      });
    });
  });

  describe('formatForGoogle', () => {
    it('should handle string tool choices', () => {
      expect(ToolChoiceHandler.formatForGoogle('required')).toEqual({
        functionCallingConfig: { mode: 'ANY' },
      });
      expect(ToolChoiceHandler.formatForGoogle('auto')).toEqual({
        functionCallingConfig: { mode: 'AUTO' },
      });
      expect(ToolChoiceHandler.formatForGoogle('none')).toEqual({
        functionCallingConfig: { mode: 'NONE' },
      });
    });

    it('should handle undefined tool choice', () => {
      const result = ToolChoiceHandler.formatForGoogle(undefined);
      expect(result).toEqual({
        functionCallingConfig: { mode: 'AUTO' },
      });
    });
  });
});

describe('FinishReasonMapper', () => {
  describe('mapOpenAI', () => {
    it('should map OpenAI finish reasons', () => {
      expect(FinishReasonMapper.mapOpenAI('stop')).toBe('stop');
      expect(FinishReasonMapper.mapOpenAI('length')).toBe('length');
      expect(FinishReasonMapper.mapOpenAI('tool_calls')).toBe('tool_use');
      expect(FinishReasonMapper.mapOpenAI('unknown')).toBe('stop');
      expect(FinishReasonMapper.mapOpenAI(null)).toBe('stop');
    });
  });

  describe('mapGoogle', () => {
    it('should map Google finish reasons', () => {
      expect(FinishReasonMapper.mapGoogle('STOP')).toBe('stop');
      expect(FinishReasonMapper.mapGoogle('MAX_TOKENS')).toBe('length');
      expect(FinishReasonMapper.mapGoogle('UNKNOWN')).toBe('stop');
    });
  });
});
