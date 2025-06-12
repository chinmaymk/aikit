import type {
  AIProvider,
  Message,
  AnthropicConfig,
  AnthropicGenerationOptions,
  StreamChunk,
  ToolCall,
  Tool,
  Content,
  TextContent,
  ImageContent,
  ToolResultContent,
} from '../types';

// Anthropic-specific message utilities
export interface GroupedContent {
  text: TextContent[];
  images: ImageContent[];
  toolResults: ToolResultContent[];
}

class AnthropicMessageUtils {
  static extractTextContent(content: Content[]): string {
    const textContent = content.find(c => c.type === 'text') as TextContent;
    return textContent?.text ?? '';
  }

  static groupContentByType(content: Content[]): GroupedContent {
    return {
      text: content.filter(c => c.type === 'text') as TextContent[],
      images: content.filter(c => c.type === 'image') as ImageContent[],
      toolResults: content.filter(c => c.type === 'tool_result') as ToolResultContent[],
    };
  }

  static extractBase64Data(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
  }
}
import { APIClient } from './api';
import { extractDataLines } from './api';

// Anthropic API types
interface AnthropicTextBlockParam {
  type: 'text';
  text: string;
}

interface AnthropicImageBlockParam {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

interface AnthropicToolUseBlockParam {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicToolResultBlockParam {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

type AnthropicContentBlock =
  | AnthropicTextBlockParam
  | AnthropicImageBlockParam
  | AnthropicToolUseBlockParam
  | AnthropicToolResultBlockParam;

interface AnthropicMessageParam {
  role: 'user' | 'assistant';
  content: AnthropicContentBlock[];
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicToolChoice {
  type: 'auto' | 'any' | 'tool';
  name?: string;
}

interface AnthropicCreateMessageRequest {
  model: string;
  messages: AnthropicMessageParam[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  stream: true;
}

// Streaming event types
interface AnthropicStreamEvent {
  type: string;
  [key: string]: unknown;
}

interface ContentBlockStartEvent extends AnthropicStreamEvent {
  type: 'content_block_start';
  index: number;
  content_block:
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
}

interface ContentBlockDeltaEvent extends AnthropicStreamEvent {
  type: 'content_block_delta';
  index: number;
  delta:
    | { type: 'text_delta'; text: string }
    | { type: 'input_json_delta'; partial_json: string }
    | { type: 'thinking_delta'; thinking: string }
    | { type: 'signature_delta'; signature: string };
}

interface MessageDeltaEvent extends AnthropicStreamEvent {
  type: 'message_delta';
  delta: {
    stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
    stop_sequence?: string | null;
  };
  usage?: {
    output_tokens: number;
  };
}

interface ErrorEvent extends AnthropicStreamEvent {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicProvider implements AIProvider<AnthropicGenerationOptions> {
  private readonly client: APIClient;
  private readonly transformer: AnthropicMessageTransformer;
  private readonly streamProcessor: AnthropicStreamProcessor;

  readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  constructor(config: AnthropicConfig) {
    const { apiKey, baseURL = 'https://api.anthropic.com', timeout, maxRetries } = config;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    if (config.beta && config.beta.length > 0) {
      headers['anthropic-beta'] = config.beta.join(',');
    }

    this.client = new APIClient(baseURL, headers, timeout, maxRetries);
    this.transformer = new AnthropicMessageTransformer();
    this.streamProcessor = new AnthropicStreamProcessor();
  }

  async *generate(
    messages: Message[],
    options: AnthropicGenerationOptions
  ): AsyncIterable<StreamChunk> {
    const params = this.transformer.buildRequestParams(messages, options);
    const stream = await this.client.stream('/v1/messages', params);
    const lineStream = this.client.processStreamAsLines(stream);
    const sseStream = extractDataLines(lineStream);
    yield* this.streamProcessor.processStream(sseStream);
  }
}

class AnthropicMessageTransformer {
  buildRequestParams(
    messages: Message[],
    options: AnthropicGenerationOptions
  ): AnthropicCreateMessageRequest {
    const { systemMessage, anthropicMessages } = this.transformMessages(messages);

    const params: AnthropicCreateMessageRequest = {
      model: options.model,
      messages: anthropicMessages,
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
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  private formatTools(tools: Tool[]): AnthropicTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  private formatToolChoice(
    toolChoice: AnthropicGenerationOptions['toolChoice']
  ): AnthropicToolChoice {
    if (toolChoice === 'required') return { type: 'any' };
    if (toolChoice === 'auto') return { type: 'auto' };
    if (typeof toolChoice === 'object') {
      return { type: 'tool', name: toolChoice.name };
    }
    return { type: 'auto' };
  }

  private transformMessages(messages: Message[]): {
    systemMessage: string;
    anthropicMessages: AnthropicMessageParam[];
  } {
    let systemMessage = '';
    const anthropicMessages: AnthropicMessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = AnthropicMessageUtils.extractTextContent(msg.content);
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

  private transformMessage(msg: Message): AnthropicMessageParam | AnthropicMessageParam[] | null {
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

  private transformToolMessage(msg: Message): AnthropicMessageParam[] {
    const { toolResults } = AnthropicMessageUtils.groupContentByType(msg.content);
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

  private transformUserOrAssistantMessage(msg: Message): AnthropicMessageParam {
    const contentBlocks = this.buildContentBlocks(msg);
    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: contentBlocks,
    };
  }

  private buildContentBlocks(msg: Message): AnthropicContentBlock[] {
    const blocks: AnthropicContentBlock[] = [];

    // Add content blocks
    for (const content of msg.content) {
      if (content.type === 'text') {
        blocks.push({ type: 'text', text: content.text });
      } else if (content.type === 'image') {
        const imageData = AnthropicMessageUtils.extractBase64Data(content.image);
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
}

class AnthropicStreamProcessor {
  async *processStream(sseStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, { id: string; name: string; arguments: string }> = {};
    const completedToolCalls: Record<string, ToolCall> = {};
    let hasFinished = false;

    for await (const line of sseStream) {
      if (line === '[DONE]') break;

      let event: AnthropicStreamEvent;
      try {
        event = JSON.parse(line) as AnthropicStreamEvent;
      } catch {
        continue; // Skip invalid JSON lines
      }

      // Handle different event types
      if (event.type === 'content_block_start') {
        const startEvent = event as ContentBlockStartEvent;
        if (startEvent.content_block.type === 'tool_use') {
          const key = startEvent.index.toString();
          toolCallStates[key] = {
            id: startEvent.content_block.id,
            name: startEvent.content_block.name,
            arguments: '',
          };
        }
      } else if (event.type === 'content_block_delta') {
        const deltaEvent = event as ContentBlockDeltaEvent;

        if (deltaEvent.delta.type === 'text_delta') {
          content += deltaEvent.delta.text;
          yield {
            content,
            delta: deltaEvent.delta.text,
            toolCalls:
              Object.values(completedToolCalls).length > 0
                ? Object.values(completedToolCalls)
                : undefined,
          };
        } else if (deltaEvent.delta.type === 'input_json_delta' && deltaEvent.delta.partial_json) {
          const key = deltaEvent.index.toString();
          if (toolCallStates[key]) {
            toolCallStates[key].arguments += deltaEvent.delta.partial_json;

            // Try to parse completed tool arguments
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
      } else if (event.type === 'message_delta') {
        const deltaEvent = event as MessageDeltaEvent;
        const finishReason = this.mapFinishReason(deltaEvent.delta.stop_reason);

        if (finishReason && !hasFinished) {
          hasFinished = true;
          yield {
            content,
            delta: '',
            finishReason,
            toolCalls:
              Object.values(completedToolCalls).length > 0
                ? Object.values(completedToolCalls)
                : undefined,
          };
        }
      } else if (event.type === 'message_stop') {
        // Only emit a final chunk if we haven't already finished
        if (!hasFinished) {
          yield {
            content,
            delta: '',
            finishReason: 'stop',
            toolCalls:
              Object.values(completedToolCalls).length > 0
                ? Object.values(completedToolCalls)
                : undefined,
          };
        }
      } else if (event.type === 'error') {
        const errorEvent = event as ErrorEvent;
        throw new Error(`Anthropic API error: ${errorEvent.error.message}`);
      }
      // Skip ping events and other unhandled event types
    }
  }

  private parseToolArguments(args: string): Record<string, unknown> | null {
    if (!args) return {};
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch (error) {
      return null;
    }
  }

  private mapFinishReason(reason?: string): 'stop' | 'length' | 'tool_use' | undefined {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_use';
      case 'stop_sequence':
        return 'stop';
      default:
        return undefined;
    }
  }
}
