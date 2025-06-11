import type { Message } from './types';

export const userText = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

export const systemText = (text: string): Message => ({
  role: 'system',
  content: [{ type: 'text', text }],
});

export const userImage = (text: string, imageData: string): Message => ({
  role: 'user',
  content: [
    { type: 'text', text },
    { type: 'image', image: imageData },
  ],
});

export const assistantWithToolCalls = (
  text: string,
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }
): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
  toolCalls: [toolCall],
});

export const toolResult = (toolCallId: string, result: string): Message => ({
  role: 'tool',
  content: [
    {
      type: 'tool_result',
      toolCallId,
      result,
    },
  ],
});
