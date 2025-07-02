import type { Message, Tool, ToolCall, Content } from './types';

// === Message Creation Helpers ===

export const userText = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

export const systemText = (text: string): Message => ({
  role: 'system',
  content: [{ type: 'text', text }],
});

export const assistantText = (text: string): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
});

export const userImage = (text: string, imageData: string): Message => ({
  role: 'user',
  content: [
    { type: 'text', text },
    { type: 'image', image: imageData },
  ],
});

export const userAudio = (text: string, audioData: string, format?: string): Message => ({
  role: 'user',
  content: [
    { type: 'text', text },
    { type: 'audio', audio: audioData, format },
  ],
});

export const userMultipleImages = (text: string, images: string[]): Message => ({
  role: 'user',
  content: [{ type: 'text', text }, ...images.map(image => ({ type: 'image' as const, image }))],
});

export const userMultipleAudio = (
  text: string,
  audioFiles: Array<{ audio: string; format?: string }>
): Message => ({
  role: 'user',
  content: [
    { type: 'text', text },
    ...audioFiles.map(({ audio, format }) => ({ type: 'audio' as const, audio, format })),
  ],
});

export const userContent = (content: Content[]): Message => ({
  role: 'user',
  content,
});

export const assistantWithToolCalls = (text: string, toolCalls: ToolCall[]): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
  toolCalls,
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

// === Content Creation Helpers ===

export const textContent = (text: string): Content => ({
  type: 'text',
  text,
});

export const imageContent = (image: string): Content => ({
  type: 'image',
  image,
});

export const audioContent = (audio: string, format?: string): Content => ({
  type: 'audio',
  audio,
  format,
});

export const toolResultContent = (toolCallId: string, result: string): Content => ({
  type: 'tool_result',
  toolCallId,
  result,
});

// === Tool Creation Helpers ===

export const createTool = (
  name: string,
  description: string,
  parameters: Record<string, unknown>
): Tool => ({
  name,
  description,
  parameters,
});
