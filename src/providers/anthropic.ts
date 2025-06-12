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

/**
 * The bridge to Anthropic's world of Claude.
 * This class translates AIKit's universal language into Anthropic's specific API dialect.
 * It's the kind of diplomat who is fluent in both cultures and always knows the right thing to say.
 *
 * @group Providers
 */
export class AnthropicProvider implements AIProvider<AnthropicGenerationOptions> {
  private readonly client: APIClient;
  private readonly transformer: AnthropicMessageTransformer;
  private readonly streamProcessor: AnthropicStreamProcessor;

  /**
   * A curated list of Anthropic models this provider is cozy with.
   * You can try others, but these are the ones we've formally introduced.
   */
  readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

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
    this.transformer = new AnthropicMessageTransformer();
    this.streamProcessor = new AnthropicStreamProcessor();
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
    const params = this.transformer.buildRequestParams(messages, options);
    const stream = await this.client.stream('/messages', params);
    const lineStream = this.client.processStreamAsLines(stream);
    const sseStream = extractDataLines(lineStream);
    yield* this.streamProcessor.processStream(sseStream);
  }
}

/**
 * The master of disguise for Anthropic messages.
 * This class takes AIKit's standard message format and masterfully
 * transforms it into the specific structure Anthropic's API requires.
 * @internal
 */
class AnthropicMessageTransformer {
  /**
   * Constructs the full request payload for the Anthropic API.
   * @param messages - The AIKit messages.
   * @param options - The AIKit generation options.
   * @returns A request payload that Claude will find agreeable.
   */
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
      // Anthropic is a bit particular about tool_choice.
      // We have to translate our abstract choices into their concrete terms.
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  /**
   * Formats AIKit tools into Anthropic's preferred structure.
   * @param tools - An array of AIKit tools.
   * @returns An array of tools formatted for Claude.
   */
  private formatTools(tools: Tool[]): AnthropicTool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Translates AIKit's abstract tool choice into Anthropic's specific format.
   * It's a small but crucial piece of diplomacy.
   * @param toolChoice - The AIKit tool choice.
   * @returns An Anthropic-compatible tool choice object.
   */
  private formatToolChoice(
    toolChoice: AnthropicGenerationOptions['toolChoice']
  ): AnthropicToolChoice {
    if (toolChoice === 'required') return { type: 'any' };
    if (toolChoice === 'auto') return { type: 'auto' };
    if (typeof toolChoice === 'object') {
      return { type: 'tool', name: toolChoice.name };
    }
    // Default to 'auto' if the choice is something we don't recognize.
    return { type: 'auto' };
  }

  /**
   * Transforms a list of AIKit messages into the format Anthropic expects.
   * It also extracts the system message, as Anthropic handles it separately.
   * @param messages - The messages to transform.
   * @returns An object containing the system message and the transformed messages.
   */
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

    // Anthropic requires a user message to start the conversation.
    // If the first message isn't from a user, we'll prepend an empty one.
    // It's a bit of a hack, but it keeps the API happy.
    if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({ role: 'user', content: [] });
    }

    return { systemMessage, anthropicMessages };
  }

  /**
   * The core transformation logic for a single message.
   * It's a multi-talented function that can handle various message roles.
   * @param msg - The message to transform.
   * @returns A transformed message or an array of them.
   */
  private transformMessage(msg: Message): AnthropicMessageParam | AnthropicMessageParam[] | null {
    switch (msg.role) {
      case 'system':
        // System messages are handled separately, so we just return the text content.
        return null;
      case 'tool':
        // Tool messages are special and need to be handled in their own function.
        return this.transformToolMessage(msg);
      case 'user':
      case 'assistant':
        // User and assistant messages are handled by a common function.
        return this.transformUserOrAssistantMessage(msg);
      default:
        return null;
    }
  }

  /**
   * Transforms a tool message into a sequence of user and assistant messages.
   * Anthropic's API expects tool results to be framed by a user message
   * containing the results and an assistant message that came before it.
   * This function constructs that sequence.
   * @param msg - The tool message to transform.
   * @returns An array of transformed messages.
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

    // This structure might look odd, but it's what Anthropic expects.
    return [{ role: 'user', content: toolResults }];
  }

  /**
   * Transforms a user or assistant message into the Anthropic format.
   * @param msg - The message to transform.
   * @returns A single transformed message.
   */
  private transformUserOrAssistantMessage(msg: Message): AnthropicMessageParam {
    return {
      role: msg.role as 'user' | 'assistant',
      content: this.buildContentBlocks(msg),
    };
  }

  /**
   * Builds the content blocks for a message, handling text, images, and tool calls.
   * @param msg - The message to build content for.
   * @returns An array of Anthropic content blocks.
   */
  private buildContentBlocks(msg: Message): AnthropicContentBlock[] {
    const blocks: AnthropicContentBlock[] = [];

    // First, add any text or image content.
    for (const content of msg.content) {
      if (content.type === 'text') {
        blocks.push({ type: 'text', text: content.text });
      } else if (content.type === 'image') {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: this.detectImageMimeType(content.image),
            data: content.image.replace(/^data:image\/[^;]+;base64,/, ''),
          },
        });
      }
    }

    // Then, if it's an assistant message with tool calls, add them.
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
   * A clever little function to figure out the mime type of an image from its data URL.
   * It's not foolproof, but it's good enough for our purposes.
   * @param dataUrl - The data URL of the image.
   * @returns The detected mime type.
   */
  private detectImageMimeType(
    dataUrl: string
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    if (dataUrl.includes('data:image/png')) return 'image/png';
    if (dataUrl.includes('data:image/gif')) return 'image/gif';
    if (dataUrl.includes('data:image/webp')) return 'image/webp';
    return 'image/jpeg'; // Default to jpeg if we can't figure it out.
  }
}

/**
 * The stream whisperer for Anthropic's API.
 * This class processes the server-sent events stream from Anthropic and
 * translates it into a coherent sequence of AIKit stream chunks.
 * It's a master of asynchronous ceremonies.
 * @internal
 */
class AnthropicStreamProcessor {
  /**
   * Processes the server-sent events stream from Anthropic.
   * @param sseStream - An async iterable of server-sent event data strings.
   * @returns An async iterable of AIKit stream chunks.
   */
  async *processStream(sseStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, { name: string; arguments: string }> = {};

    for await (const data of sseStream) {
      try {
        const event: AnthropicStreamEvent = JSON.parse(data);

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
              yield { content, delta };
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
            yield { content, delta: '', finishReason, toolCalls };
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
   * Converts the internal tool call states into the final AIKit ToolCall objects.
   * It also handles the tricky business of parsing the JSON arguments.
   * @param toolCallStates - The current state of tool calls.
   * @returns An array of finalized tool calls, or undefined if there are none.
   */
  private finalizeToolCalls(
    toolCallStates: Record<string, { name: string; arguments: string }>
  ): ToolCall[] | undefined {
    const calls = Object.entries(toolCallStates).map(([id, state]) => ({
      id,
      name: state.name,
      arguments: this.parseToolArguments(state.arguments) || {},
    }));

    return calls.length > 0 ? calls : undefined;
  }

  /**
   * Safely parses the JSON arguments for a tool call.
   * @param args - The JSON string of arguments.
   * @returns The parsed arguments object, or null if parsing fails.
   */
  private parseToolArguments(args: string): Record<string, unknown> | null {
    try {
      return JSON.parse(args);
    } catch {
      // If parsing fails, it's probably because the stream isn't finished yet.
      return null;
    }
  }

  /**
   * Maps Anthropic's finish reasons to our own internal ones.
   * @param reason - The finish reason from Anthropic.
   * @returns The corresponding AIKit finish reason.
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
