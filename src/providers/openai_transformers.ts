import type { Message, Content } from '../types';
import { MessageTransformer } from './utils';
import { OpenAI } from './openai';

interface ContentPartBuilders {
  text: (text: string) => any;
  image: (url: string) => any;
  audio: (audioData: string, format?: string) => any;
  toolResult: (toolCallId: string, result: string) => any;
}

export class OpenAIMessageTransformer {
  static toChatCompletions(messages: Message[]): OpenAI.Chat.MessageParam[] {
    return messages.flatMap(msg => this.mapChatMessage(msg));
  }

  static toResponses(messages: Message[]): OpenAI.Responses.ResponsesMessage[] {
    return messages.flatMap(msg => this.mapResponsesMessage(msg));
  }

  private static mapChatMessage(msg: Message): OpenAI.Chat.MessageParam[] {
    switch (msg.role) {
      case 'system':
        return [
          {
            role: 'system',
            content: this.extractAllTextContent(msg.content),
          },
        ];

      case 'tool': {
        const { toolResults } = MessageTransformer.groupContentByType(msg.content);
        return toolResults.map(content => ({
          role: 'tool' as const,
          tool_call_id: content.toolCallId,
          content: content.result,
        }));
      }

      case 'user':
        return [
          {
            role: 'user',
            content: this.buildContentParts(msg.content, this.chatContentBuilders),
          },
        ];

      case 'assistant': {
        const assistantMsg: OpenAI.Chat.MessageParam = {
          role: 'assistant',
          content: this.extractAllTextContent(msg.content),
          ...(msg.toolCalls && {
            tool_calls: msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          }),
        };

        return [assistantMsg];
      }

      default:
        throw new Error(
          `Unsupported message role '${msg.role}' for OpenAI Chat provider. Supported roles: user, assistant, system, tool`
        );
    }
  }

  private static mapResponsesMessage(msg: Message): OpenAI.Responses.ResponsesMessage[] {
    switch (msg.role) {
      case 'system':
        return [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: this.extractAllTextContent(msg.content),
              },
            ],
          },
        ];

      case 'tool': {
        const { toolResults } = MessageTransformer.groupContentByType(msg.content);
        return toolResults.map(content => ({
          type: 'function_call_output',
          call_id: content.toolCallId,
          output: content.result,
        }));
      }

      case 'user':
        return [
          {
            role: 'user',
            content: this.buildContentParts(msg.content, this.responsesContentBuilders),
          },
        ];

      case 'assistant':
        if (msg.toolCalls?.length) {
          return msg.toolCalls.map(toolCall => ({
            type: 'function_call',
            call_id: toolCall.id,
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments),
          }));
        }
        return [
          {
            role: 'assistant',
            content: this.buildContentParts(msg.content, this.responsesContentBuilders),
          },
        ];

      default:
        throw new Error(
          `Unsupported message role '${msg.role}' for OpenAI Responses provider. Supported roles: user, assistant, system, tool`
        );
    }
  }

  private static extractAllTextContent(content: Content[]): string {
    const { text, toolResults } = MessageTransformer.groupContentByType(content);
    const textParts: string[] = [];

    // Preserve individual text blocks
    for (const textContent of text) {
      if (textContent.text.trim()) {
        textParts.push(textContent.text);
      }
    }

    // Include tool results as text if present in non-tool messages
    for (const toolResult of toolResults) {
      textParts.push(`Tool result from ${toolResult.toolCallId}: ${toolResult.result}`);
    }

    return textParts.join('\n');
  }

  // Shared content part building logic
  private static buildContentParts<T>(
    content: Message['content'],
    builders: ContentPartBuilders
  ): T[] {
    const parts: T[] = [];
    const { text, images, audio, toolResults } = MessageTransformer.groupContentByType(content);

    // Handle multiple text blocks separately to preserve structure
    for (const textContent of text) {
      parts.push(builders.text(textContent.text));
    }

    // Handle images
    for (const imageContent of images) {
      parts.push(builders.image(imageContent.image));
    }

    // Handle audio
    for (const audioContent of audio) {
      parts.push(builders.audio(audioContent.audio, audioContent.format));
    }

    // Handle tool results that appear in non-tool messages
    for (const toolResult of toolResults) {
      parts.push(builders.toolResult(toolResult.toolCallId, toolResult.result));
    }

    return parts;
  }

  // Chat API content builders
  private static chatContentBuilders: ContentPartBuilders = {
    text: (text: string) => ({ type: 'text' as const, text }),
    image: (url: string) => ({ type: 'image_url' as const, image_url: { url } }),
    audio: (audioData: string, format?: string) => ({
      type: 'input_audio' as const,
      input_audio: {
        data: MessageTransformer.extractAudioBase64Data(audioData),
        format: format || 'wav',
      },
    }),
    toolResult: (toolCallId: string, result: string) => ({
      type: 'text' as const,
      text: `Tool result from ${toolCallId}: ${result}`,
    }),
  };

  // Responses API content builders
  private static responsesContentBuilders: ContentPartBuilders = {
    text: (text: string) => ({ type: 'input_text', text }),
    image: (url: string) => ({ type: 'input_image', image_url: url }),
    audio: (audioData: string, format?: string) => ({
      type: 'input_audio',
      data: MessageTransformer.extractAudioBase64Data(audioData),
      format: format || 'wav',
    }),
    toolResult: (toolCallId: string, result: string) => ({
      type: 'input_text',
      text: `Tool result from ${toolCallId}: ${result}`,
    }),
  };
}
