import type { Message, Content } from '../types';
import { MessageTransformer } from './utils';
import { OpenAI } from './openai';

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
            content: this.buildChatContentParts(msg.content),
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
            content: this.buildResponsesContentParts(msg.content),
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
            content: this.buildResponsesContentParts(msg.content),
          },
        ];

      default:
        throw new Error(
          `Unsupported message role '${msg.role}' for OpenAI Responses provider. Supported roles: user, assistant, system, tool`
        );
    }
  }

  private static extractAllTextContent(content: Content[]): string {
    const { text } = MessageTransformer.groupContentByType(content);
    return text.length > 0 ? text.map(t => t.text).join('\n') : '';
  }

  private static buildChatContentParts(content: Message['content']): OpenAI.Chat.ContentPart[] {
    return content
      .map(c => {
        if (c.type === 'text') return { type: 'text' as const, text: c.text };
        if (c.type === 'image') return { type: 'image_url' as const, image_url: { url: c.image } };
        return null;
      })
      .filter(Boolean) as OpenAI.Chat.ContentPart[];
  }

  private static buildResponsesContentParts(
    content: Message['content']
  ): OpenAI.Responses.ContentPart[] {
    const parts: OpenAI.Responses.ContentPart[] = [];
    for (const item of content) {
      switch (item.type) {
        case 'text':
          parts.push({ type: 'input_text', text: item.text });
          break;
        case 'image':
          parts.push({ type: 'input_image', image_url: item.image });
          break;
      }
    }
    return parts;
  }
}
