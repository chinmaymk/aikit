import type { Message, AnthropicOptions, GenerationUsage, FinishReason } from '../types';
import { MessageTransformer, ValidationUtils, DynamicParams } from './utils';

export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: DynamicParams }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContentBlock[];
}

export function transformMessages(messages: Message[]): {
  systemMessage: string;
  anthropicMessages: AnthropicMessage[];
} {
  const systemMessages: string[] = [];
  const anthropicMessages: AnthropicMessage[] = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      const systemText = MessageTransformer.extractTextContent(msg.content);
      if (systemText) systemMessages.push(systemText);
      continue;
    }
    const transformed = transformMessage(msg);
    if (transformed) {
      if (Array.isArray(transformed)) {
        anthropicMessages.push(...transformed);
      } else {
        anthropicMessages.push(transformed);
      }
    }
  }
  return { systemMessage: systemMessages.join('\n\n'), anthropicMessages };
}

export function transformMessage(msg: Message): AnthropicMessage | AnthropicMessage[] | null {
  if (msg.role === 'tool') {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map(toolResult => ({
      role: 'user' as const,
      content: [
        { type: 'tool_result', tool_use_id: toolResult.toolCallId, content: toolResult.result },
      ],
    }));
  }
  if (msg.role === 'user' || msg.role === 'assistant') {
    const contentBlocks = buildContentBlocks(msg);
    if (contentBlocks.length === 0) return null;
    return { role: msg.role, content: contentBlocks };
  }
  throw new Error(
    `Unsupported message role '${msg.role}' for Anthropic provider. Supported roles: user, assistant, system, tool`
  );
}

export function buildContentBlocks(msg: Message): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];
  const { text, images, audio } = MessageTransformer.groupContentByType(msg.content);

  // Handle multiple text blocks separately to preserve structure
  for (const textContent of text) {
    if (textContent.text.trim()) {
      blocks.push({ type: 'text', text: textContent.text });
    }
  }

  // Handle images
  for (const imageContent of images) {
    if (ValidationUtils.isValidDataUrl(imageContent.image)) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: MessageTransformer.detectImageMimeType(imageContent.image),
          data: MessageTransformer.extractBase64Data(imageContent.image),
        },
      });
    }
  }

  // Handle audio content - currently not supported by Anthropic
  if (audio.length > 0) {
    throw new Error('Audio content is not supported by Anthropic provider.');
  }

  // Handle tool calls for assistant messages
  if (msg.role === 'assistant' && msg.toolCalls) {
    blocks.push(
      ...msg.toolCalls.map(toolCall => ({
        type: 'tool_use' as const,
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.arguments,
      }))
    );
  }

  return blocks;
}

export function formatToolChoice(toolChoice: AnthropicOptions['toolChoice']): {
  type: 'auto' | 'any' | 'tool';
  name?: string;
} {
  if (!toolChoice) return { type: 'auto' };
  if (typeof toolChoice === 'object') return { type: 'tool', name: toolChoice.name };
  return { type: toolChoice as 'auto' | 'any' };
}

export function mapFinishReason(reason?: string): FinishReason | undefined {
  const reasonMap: Record<string, FinishReason> = {
    end_turn: 'stop',
    max_tokens: 'length',
    stop_sequence: 'stop',
    tool_use: 'tool_use',
    pause_turn: 'stop',
    refusal: 'error',
  };
  return reason ? reasonMap[reason] : undefined;
}

export function extractUsageFromAnthropicEvent(
  event: Extract<AnthropicStreamEvent, { type: 'message_delta' }>
): GenerationUsage | undefined {
  if (!event.usage) return undefined;
  const usage: GenerationUsage = {};
  if (event.usage.output_tokens !== undefined) usage.outputTokens = event.usage.output_tokens;
  return Object.keys(usage).length > 0 ? usage : undefined;
}

export type AnthropicStreamEvent =
  | {
      type: 'message_start';
      message: {
        usage: {
          input_tokens: number;
          output_tokens: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
      };
    }
  | { type: 'content_block_start'; index: number; content_block: AnthropicContentBlock }
  | {
      type: 'content_block_delta';
      index: number;
      delta:
        | { type: 'text_delta'; text: string }
        | { type: 'input_json_delta'; partial_json: string }
        | { type: 'thinking_delta'; thinking: string }
        | { type: 'signature_delta'; signature: string };
    }
  | {
      type: 'message_delta';
      delta: { stop_reason?: string; stop_sequence?: string | null };
      usage?: { output_tokens: number };
    }
  | { type: 'error'; error: { type: string; message: string } }
  | { type: string; [key: string]: unknown };
