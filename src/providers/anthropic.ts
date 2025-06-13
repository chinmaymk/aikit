import type {
  AIProvider,
  Message,
  AnthropicConfig,
  AnthropicGenerationOptions,
  StreamChunk,
  ToolCall,
  Tool,
  ToolResultContent,
} from '../types';

import { MessageTransformer, StreamUtils, DynamicParams } from './utils';
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
  input: DynamicParams;
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
  input_schema: DynamicParams;
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
    | { type: 'tool_use'; id: string; name: string; input: DynamicParams };
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

/**
 * The bridge to Anthropic's world of Claude.
 * This class translates AIKit's universal language into Anthropic's specific API dialect.
 * It's the kind of diplomat who is fluent in both cultures and always knows the right thing to say.
 *
 * @group Providers
 */
export class AnthropicProvider implements AIProvider<AnthropicGenerationOptions> {
  private readonly client: APIClient;

  /**
   * Initializes the Anthropic provider.
   * @param config - Your Anthropic API credentials and settings.
   */
  constructor(config: AnthropicConfig) {
    const { apiKey, baseURL = 'https://api.anthropic.com/v1', timeout, maxRetries } = config;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    if (config.beta && config.beta.length > 0) {
      headers['anthropic-beta'] = config.beta.join(',');
    }

    this.client = new APIClient(baseURL, headers, timeout, maxRetries);
  }

  /**
   * Orchestrates the generation process with Anthropic's API.
   * It transforms the request, makes the call, and then processes the
   * server-sent events stream into a format AIKit can understand.
   * @param messages - The conversation history.
   * @param options - Generation options for the request.
   * @returns An async iterable of stream chunks.
   */
  async *generate(
    messages: Message[],
    options: AnthropicGenerationOptions
  ): AsyncIterable<StreamChunk> {
    const params = this.buildRequestParams(messages, options);
    const stream = await this.client.stream('/messages', params);
    const lineStream = this.client.processStreamAsLines(stream);
    const sseStream = extractDataLines(lineStream);
    yield* this.processStream(sseStream);
  }

  /**
   * Builds request parameters for the Anthropic API.
   * Handles message transformation, tool formatting, and system messages.
   */
  private buildRequestParams(
    messages: Message[],
    options: AnthropicGenerationOptions
  ): AnthropicCreateMessageRequest {
    const { systemMessage, anthropicMessages } = this.transformMessages(messages);

    const params: AnthropicCreateMessageRequest = {
      model: options.model,
      messages: anthropicMessages,
      max_tokens: options.maxTokens || 1024,
      stream: true,
    };

    if (systemMessage) params.system = systemMessage;
    if (options.temperature !== undefined) params.temperature = options.temperature;
    if (options.topP !== undefined) params.top_p = options.topP;
    if (options.topK !== undefined) params.top_k = options.topK;
    if (options.stopSequences && options.stopSequences.length > 0) {
      params.stop_sequences = options.stopSequences;
    }

    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  /**
   * Processes the server-sent events stream from Anthropic.
   * Manages state and yields properly formatted chunks.
   */
  private async *processStream(sseStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, { name: string; arguments: string }> = {};

    for await (const data of sseStream) {
      const event = StreamUtils.parseStreamEvent<AnthropicStreamEvent>(data);
      if (!event) continue;

      try {
        switch (event.type) {
          case 'content_block_start': {
            const startEvent = event as ContentBlockStartEvent;
            if (startEvent.content_block.type === 'tool_use') {
              toolCallStates[startEvent.content_block.id] = {
                name: startEvent.content_block.name,
                arguments: '',
              };
            }
            break;
          }

          case 'content_block_delta': {
            const deltaEvent = event as ContentBlockDeltaEvent;
            if (deltaEvent.delta.type === 'text_delta') {
              const delta = deltaEvent.delta.text;
              content += delta;
              yield MessageTransformer.createStreamChunk(content, delta);
            } else if (deltaEvent.delta.type === 'input_json_delta') {
              // Find the tool call this delta belongs to and append the arguments.
              const toolCallId = Object.keys(toolCallStates).find(id => toolCallStates[id].name);
              if (toolCallId) {
                toolCallStates[toolCallId].arguments += deltaEvent.delta.partial_json;
              }
            }
            break;
          }

          case 'message_delta': {
            const deltaEvent = event as MessageDeltaEvent;
            const finishReason = this.mapFinishReason(deltaEvent.delta.stop_reason);
            const toolCalls = this.finalizeToolCalls(toolCallStates);
            yield MessageTransformer.createStreamChunk(content, '', toolCalls, finishReason);
            break;
          }

          case 'error': {
            const errorEvent = event as ErrorEvent;
            // This is a specific API error, so we should throw it
            throw new Error(
              `Anthropic API error: ${errorEvent.error.type} - ${errorEvent.error.message}`
            );
          }
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Anthropic API error')) {
          // Re-throw API errors to be caught by the consumer
          throw e;
        }
        // Ignore other errors (e.g., malformed JSON). It's the wild west out here.
        continue;
      }
    }
  }

  /**
   * Transforms AIKit messages to Anthropic format.
   * Separates system messages from conversation messages.
   */
  private transformMessages(messages: Message[]): {
    systemMessage: string;
    anthropicMessages: AnthropicMessageParam[];
  } {
    let systemMessage = '';
    const anthropicMessages: AnthropicMessageParam[] = [];

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

    // Anthropic requires a user message to start the conversation.
    if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: [] });
    }

    return { systemMessage, anthropicMessages };
  }

  /**
   * Transforms a single message to Anthropic format.
   */
  private transformMessage(msg: Message): AnthropicMessageParam | AnthropicMessageParam[] | null {
    switch (msg.role) {
      case 'system':
        return null;
      case 'tool':
        return this.transformToolMessage(msg);
      case 'user':
      case 'assistant':
        return this.transformUserOrAssistantMessage(msg);
      default:
        return null;
    }
  }

  /**
   * Transforms tool result messages.
   */
  private transformToolMessage(msg: Message): AnthropicMessageParam[] {
    const toolResults = (msg.content as ToolResultContent[]).map(c => ({
      type: 'tool_result' as const,
      tool_use_id: c.toolCallId,
      content: c.result,
    }));

    if (toolResults.length === 0) {
      return [];
    }

    return [{ role: 'user', content: toolResults }];
  }

  /**
   * Transforms user or assistant messages.
   */
  private transformUserOrAssistantMessage(msg: Message): AnthropicMessageParam {
    return {
      role: msg.role as 'user' | 'assistant',
      content: this.buildContentBlocks(msg),
    };
  }

  /**
   * Builds content blocks for a message.
   */
  private buildContentBlocks(msg: Message): AnthropicContentBlock[] {
    const blocks: AnthropicContentBlock[] = [];

    // Add text or image content
    for (const content of msg.content) {
      if (content.type === 'text') {
        blocks.push({ type: 'text', text: content.text });
      } else if (content.type === 'image') {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: MessageTransformer.detectImageMimeType(content.image) as
              | 'image/jpeg'
              | 'image/png'
              | 'image/gif'
              | 'image/webp',
            data: MessageTransformer.extractBase64Data(content.image),
          },
        });
      }
    }

    // Add tool calls for assistant messages
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const toolCall of msg.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.arguments,
        });
      }
    }

    return blocks;
  }

  /**
   * Formats tools for Anthropic API.
   */
  private formatTools(tools: Tool[]): AnthropicTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Formats tool choice for Anthropic API.
   */
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

  /**
   * Converts the internal tool call states into the final AIKit ToolCall objects.
   */
  private finalizeToolCalls(
    toolCallStates: Record<string, { name: string; arguments: string }>
  ): ToolCall[] | undefined {
    const calls = Object.entries(toolCallStates).map(([id, state]) => ({
      id,
      name: state.name,
      arguments: MessageTransformer.parseJson(state.arguments, {}) || {},
    }));

    return calls.length > 0 ? calls : undefined;
  }

  /**
   * Maps Anthropic's finish reasons to AIKit format.
   */
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
