import { conversation, ConversationBuilder } from '@chinmaymk/aikit';

describe('Utils - Conversation Builder', () => {
  describe('Conversation Builder', () => {
    let builder: ConversationBuilder;

    beforeEach(() => {
      builder = new ConversationBuilder();
    });

    it('should build empty conversation', () => {
      expect(builder.build()).toEqual([]);
    });

    it('should add messages and chain operations', () => {
      const messages = builder
        .system('You are helpful')
        .user('Hello')
        .assistant('Hi there!')
        .build();

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
    });

    it('should add tool results', () => {
      const messages = builder.tool('call_123', 'result').build();
      expect(messages[0].role).toBe('tool');
    });

    it('should clear conversation', () => {
      builder.user('Hello');
      expect(builder.build()).toHaveLength(1);

      builder.clear();
      expect(builder.build()).toHaveLength(0);
    });

    it('should return different arrays on multiple builds', () => {
      builder.user('Hello');
      const messages1 = builder.build();
      const messages2 = builder.build();

      expect(messages1).toEqual(messages2);
      expect(messages1).not.toBe(messages2);
    });

    it('should add user message with image', () => {
      const messages = builder
        .userWithImage('Describe this', 'data:image/png;base64,abc123')
        .build();
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toHaveLength(2);
      expect(messages[0].content[0].type).toBe('text');
      expect(messages[0].content[1].type).toBe('image');
    });

    it('should add custom message', () => {
      const customMessage = {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Custom message' }],
      };
      const messages = builder.addMessage(customMessage).build();
      expect(messages[0]).toEqual(customMessage);
    });
  });

  describe('Conversation Factory', () => {
    it('should create new ConversationBuilder', () => {
      expect(conversation()).toBeInstanceOf(ConversationBuilder);
    });
  });
});
