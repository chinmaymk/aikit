import { Anthropic } from '@anthropic-ai/sdk';
import type {
  AIProvider,
  Message,
  AnthropicConfig,
  GenerationOptions,
  StreamChunk,
} from '../types';
import { MessageTransformer, ToolFormatter, ToolChoiceHandler } from './utils';

export class AnthropicProvider implements AIProvider {
  private anthropic: Anthropic;
  readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  constructor(config: AnthropicConfig) {
    this.anthropic = new Anthropic(config);
  }

  async *generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk> {
    const { systemMessage, anthropicMessages } = this.transformMessages(messages);
    const params = this.buildRequestParams(systemMessage, anthropicMessages, options);

    const stream = await this.anthropic.messages.create(params);
    yield* this.processStream(stream);
  }

  private transformMessages(messages: Message[]): {
    systemMessage: string;
    anthropicMessages: Anthropic.MessageParam[];
  } {
    let systemMessage = '';
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = MessageTransformer.extractTextContent(msg.content);
        continue;
      }

      const transformed = this.transformMessage(msg);
      if (transformed) {
        if (Array.isArray(transformed)) {
          anthropicMessages.push(...transformed);
        } else {
          anthropicMessages.push(transformed);
        }
      }
    }

    return { systemMessage, anthropicMessages };
  }

  private transformMessage(msg: Message): Anthropic.MessageParam | Anthropic.MessageParam[] | null {
    switch (msg.role) {
      case 'tool':
        return this.transformToolMessage(msg);
      case 'user':
      case 'assistant':
        return this.transformUserOrAssistantMessage(msg);
      default:
        return null;
    }
  }

  private transformToolMessage(msg: Message): Anthropic.MessageParam[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map(content => ({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: content.toolCallId,
          content: content.result,
        },
      ],
    }));
  }

  private transformUserOrAssistantMessage(msg: Message): Anthropic.MessageParam {
    const contentBlocks = this.buildContentBlocks(msg);
    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: contentBlocks,
    };
  }

  private buildContentBlocks(
    msg: Message
  ): Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam> {
    const blocks: Array<
      Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam
    > = [];

    // Add content blocks
    for (const content of msg.content) {
      if (content.type === 'text') {
        blocks.push({ type: 'text', text: content.text });
      } else if (content.type === 'image') {
        const imageData = MessageTransformer.extractBase64Data(content.image);
        const mediaType = this.detectImageMimeType(content.image);
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageData,
          },
        });
      }
    }

    // Add tool calls if present
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }
    }

    return blocks;
  }

  private detectImageMimeType(
    dataUrl: string
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    if (dataUrl.includes('data:image/png')) return 'image/png';
    if (dataUrl.includes('data:image/gif')) return 'image/gif';
    if (dataUrl.includes('data:image/webp')) return 'image/webp';
    return 'image/jpeg'; // Default fallback
  }

  private buildRequestParams(
    systemMessage: string,
    messages: Anthropic.MessageParam[],
    options: GenerationOptions
  ): Anthropic.MessageCreateParamsStreaming {
    const params: Anthropic.MessageCreateParamsStreaming = {
      model: options.model,
      messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature,
      top_p: options.topP,
      top_k: options.topK,
      stop_sequences: options.stopSequences,
      stream: true,
    };

    if (systemMessage) {
      params.system = systemMessage;
    }

    if (options.tools) {
      params.tools = ToolFormatter.formatForAnthropic(options.tools);
      if (options.toolChoice) {
        params.tool_choice = ToolChoiceHandler.formatForAnthropic(options.toolChoice);
      }
    }

    return params;
  }

  private async *processStream(
    stream: AsyncIterable<Anthropic.MessageStreamEvent>
  ): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, { id: string; name: string; arguments: string }> = {};
    const completedToolCalls: Record<string, { id: string; name: string; arguments: object }> = {};

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        const key = chunk.index.toString();
        toolCallStates[key] = {
          id: chunk.content_block.id,
          name: chunk.content_block.name,
          arguments: '',
        };
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          content += chunk.delta.text;
        } else if (chunk.delta.type === 'input_json_delta' && chunk.delta.partial_json) {
          const key = chunk.index.toString();
          if (toolCallStates[key]) {
            toolCallStates[key].arguments += chunk.delta.partial_json;

            if (!completedToolCalls[key]) {
              const currentState = toolCallStates[key];
              const parsedArgs = this.parseToolArguments(currentState.arguments);
              if (parsedArgs !== null) {
                completedToolCalls[key] = {
                  id: currentState.id,
                  name: currentState.name,
                  arguments: parsedArgs,
                };
              }
            }
          }
        }
      }

      const completedCalls = Object.values(completedToolCalls);
      if (chunk.type === 'message_stop') {
        yield {
          content,
          delta: '',
          finishReason: 'stop',
          toolCalls: completedCalls.length > 0 ? completedCalls : undefined,
        };
      } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield {
          content,
          delta: chunk.delta.text,
          toolCalls: completedCalls.length > 0 ? completedCalls : undefined,
        };
      }
    }
  }

  private parseToolArguments(args: string): object | null {
    if (!args) return {};
    try {
      return JSON.parse(args);
    } catch (error) {
      return null;
    }
  }
}
