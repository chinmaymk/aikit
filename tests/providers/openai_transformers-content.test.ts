import { OpenAIMessageTransformer } from '../../src/providers/openai_transformers';

describe('OpenAI Message Transformer - Content Handling', () => {
  describe('content part building', () => {
    it('should build chat content parts correctly', () => {
      const content = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'image' as const, image: 'data:image/jpeg;base64,abc' },
        { type: 'text' as const, text: 'World' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.chatContentBuilders
      );

      expect(result).toEqual([
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
      ]);
    });

    it('should build responses content parts correctly', () => {
      const content = [
        { type: 'text' as const, text: 'Analyze this' },
        { type: 'image' as const, image: 'data:image/png;base64,xyz' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.responsesContentBuilders
      );

      expect(result).toEqual([
        { type: 'input_text', text: 'Analyze this' },
        { type: 'input_image', image_url: 'data:image/png;base64,xyz' },
      ]);
    });

    it('should handle tool results in non-tool messages for chat API', () => {
      const content = [
        { type: 'text' as const, text: 'Here is the result:' },
        { type: 'tool_result' as const, toolCallId: 'call_123', result: 'Tool output data' },
        { type: 'text' as const, text: 'What do you think?' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.chatContentBuilders
      );

      expect(result).toEqual([
        { type: 'text', text: 'Here is the result:' },
        { type: 'text', text: 'What do you think?' },
        { type: 'text', text: 'Tool result from call_123: Tool output data' },
      ]);
    });

    it('should handle tool results in non-tool messages for responses API', () => {
      const content = [
        { type: 'text' as const, text: 'Check this result:' },
        { type: 'tool_result' as const, toolCallId: 'call_456', result: 'Analysis complete' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.responsesContentBuilders
      );

      expect(result).toEqual([
        { type: 'input_text', text: 'Check this result:' },
        { type: 'input_text', text: 'Tool result from call_456: Analysis complete' },
      ]);
    });

    it('should handle extractAllTextContent with tool results', () => {
      const content = [
        { type: 'text' as const, text: 'Regular text' },
        { type: 'tool_result' as const, toolCallId: 'call_789', result: 'Tool result data' },
        { type: 'text' as const, text: 'More text' },
      ];

      const result = OpenAIMessageTransformer.extractAllTextContent(content);

      expect(result).toBe('Regular text\nMore text\nTool result from call_789: Tool result data');
    });

    it('should handle audio content with explicit format for chat API', () => {
      const content = [
        { type: 'text' as const, text: 'Listen to this' },
        { type: 'audio' as const, audio: 'data:audio/mp3;base64,dGVzdA==', format: 'mp3' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.chatContentBuilders
      );

      expect(result).toEqual([
        { type: 'text', text: 'Listen to this' },
        {
          type: 'input_audio',
          input_audio: {
            data: 'dGVzdA==',
            format: 'mp3',
          },
        },
      ]);
    });

    it('should handle audio content without format for chat API (fallback to wav)', () => {
      const content = [{ type: 'audio' as const, audio: 'data:audio/wav;base64,dGVzdA==' }];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.chatContentBuilders
      );

      expect(result).toEqual([
        {
          type: 'input_audio',
          input_audio: {
            data: 'dGVzdA==',
            format: 'wav',
          },
        },
      ]);
    });

    it('should handle audio content with explicit format for responses API', () => {
      const content = [
        { type: 'text' as const, text: 'Process this audio' },
        { type: 'audio' as const, audio: 'data:audio/mp3;base64,dGVzdA==', format: 'mp3' },
      ];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.responsesContentBuilders
      );

      expect(result).toEqual([
        { type: 'input_text', text: 'Process this audio' },
        {
          type: 'input_audio',
          data: 'dGVzdA==',
          format: 'mp3',
        },
      ]);
    });

    it('should handle audio content without format for responses API (fallback to wav)', () => {
      const content = [{ type: 'audio' as const, audio: 'data:audio/wav;base64,dGVzdA==' }];

      const result = OpenAIMessageTransformer.buildContentParts(
        content,
        OpenAIMessageTransformer.responsesContentBuilders
      );

      expect(result).toEqual([
        {
          type: 'input_audio',
          data: 'dGVzdA==',
          format: 'wav',
        },
      ]);
    });
  });
});
