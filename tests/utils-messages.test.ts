import {
  userText,
  systemText,
  assistantText,
  userImage,
  userMultipleImages,
  userContent,
  assistantWithToolCalls,
  toolResult,
  textContent,
  imageContent,
  toolResultContent,
  createTool,
  type Content,
} from '@chinmaymk/aikit';

describe('Utils - Message and Content Creation', () => {
  describe('Message Creation Helpers', () => {
    it('should create user messages', () => {
      expect(userText('Hello')).toEqual({
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      });
    });

    it('should create system messages', () => {
      expect(systemText('You are helpful')).toEqual({
        role: 'system',
        content: [{ type: 'text', text: 'You are helpful' }],
      });
    });

    it('should create assistant messages', () => {
      expect(assistantText('How can I help?')).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'How can I help?' }],
      });
    });

    it('should create user messages with images', () => {
      expect(userImage('What is this?', 'image_data')).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image', image: 'image_data' },
        ],
      });
    });

    it('should create user messages with multiple images', () => {
      const images = ['img1', 'img2'];
      expect(userMultipleImages('Compare', images)).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'Compare' },
          { type: 'image', image: 'img1' },
          { type: 'image', image: 'img2' },
        ],
      });
    });

    it('should create messages with custom content', () => {
      const content: Content[] = [{ type: 'text', text: 'Hello' }];
      expect(userContent(content)).toEqual({
        role: 'user',
        content,
      });
    });

    it('should create assistant messages with tool calls', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: {} }];
      expect(assistantWithToolCalls('Let me check', toolCalls)).toEqual({
        role: 'assistant',
        content: [{ type: 'text', text: 'Let me check' }],
        toolCalls,
      });
    });

    it('should create tool result messages', () => {
      expect(toolResult('call_123', 'result')).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_123',
            result: 'result',
          },
        ],
      });
    });
  });

  describe('Content Creation Helpers', () => {
    it('should create text content', () => {
      expect(textContent('Hello')).toEqual({
        type: 'text',
        text: 'Hello',
      });
    });

    it('should create image content', () => {
      expect(imageContent('image_data')).toEqual({
        type: 'image',
        image: 'image_data',
      });
    });

    it('should create tool result content', () => {
      expect(toolResultContent('call_123', 'result')).toEqual({
        type: 'tool_result',
        toolCallId: 'call_123',
        result: 'result',
      });
    });
  });

  describe('Tool Creation', () => {
    it('should create tools with parameters', () => {
      const parameters = {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
        },
        required: ['location'],
      };

      expect(createTool('get_weather', 'Get weather', parameters)).toEqual({
        name: 'get_weather',
        description: 'Get weather',
        parameters,
      });
    });

    it('should work with simple parameters', () => {
      const parameters = {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: [],
      };
      expect(createTool('search', 'Search', parameters)).toEqual({
        name: 'search',
        description: 'Search',
        parameters,
      });
    });
  });
});
