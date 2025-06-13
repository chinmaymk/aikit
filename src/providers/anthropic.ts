import type {
  Message,
  StreamChunk,
  FinishReason,
  Tool,
  ToolCall,
  AnthropicOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';

import { MessageTransformer, StreamUtils, DynamicParams } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

/**
 * Creates an Anthropic generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const anthropic = createAnthropic({ apiKey: '...', model: 'claude-3-5-sonnet-20241022' });
 *
 * // Use like any function
 * const result = await collectDeltas(anthropic([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(anthropic([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createAnthropic(
  config: WithApiKey<AnthropicOptions>
): StreamingGenerateFunction<Partial<AnthropicOptions>> {
  if (!config.apiKey) {
    throw new Error('Anthropic API key is required');
  }

  const {
    apiKey,
    baseURL = 'https://api.anthropic.com/v1',
    timeout,
    maxRetries,
    beta,
    anthropicVersion = '2023-06-01',
    ...defaultGenerationOptions
  } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': anthropicVersion,
  };

  if (beta && beta.length > 0) {
    headers['anthropic-beta'] = beta.join(',');
  }

  const client = new APIClient(baseURL, headers, timeout, maxRetries);
  const defaultOptions = { apiKey, beta, anthropicVersion, ...defaultGenerationOptions };

  return async function* anthropic(messages: Message[], options: Partial<AnthropicOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const params = buildRequestParams(messages, mergedOptions);
    const stream = await client.stream('/messages', params);
    const sseStream = client.processStreamAsLines(stream);
    yield* processStream(sseStream);
  };
}

/**
 * Direct Anthropic function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   anthropic({ apiKey: '...', model: 'claude-3-5-sonnet-20241022' }, [userText('Hello')])
 * );
 * ```
 */
export async function* anthropic(
  config: WithApiKey<AnthropicOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createAnthropic(config);
  yield* provider(messages);
}

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
  system?: string | Array<{ type: 'text'; text: string }>;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  stream: true;
  container?: string;
  mcp_servers?: Array<{
    name: string;
    type: 'url';
    url: string;
    authorization_token?: string;
    tool_configuration?: {
      enabled?: boolean;
      allowed_tools?: string[];
    };
  }>;
  metadata?: {
    user_id?: string;
  };
  service_tier?: 'auto' | 'standard_only';
  thinking?:
    | {
        type: 'enabled';
        budget_tokens: number;
      }
    | {
        type: 'disabled';
      };
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
    stop_reason?:
      | 'end_turn'
      | 'max_tokens'
      | 'stop_sequence'
      | 'tool_use'
      | 'pause_turn'
      | 'refusal';
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

// Helper functions for functional API
function buildRequestParams(
  messages: Message[],
  options: AnthropicOptions
): AnthropicCreateMessageRequest {
  const { systemMessage, anthropicMessages } = transformMessages(messages);

  const params: AnthropicCreateMessageRequest = {
    model: options.model!,
    messages: anthropicMessages,
    max_tokens: options.maxOutputTokens || 4096,
    stream: true,
    temperature: options.temperature,
    top_p: options.topP,
    top_k: options.topK,
    stop_sequences: options.stopSequences,
  };

  if (systemMessage) {
    params.system = systemMessage;
  }

  if (options.tools) {
    params.tools = formatTools(options.tools);
    if (options.toolChoice) {
      params.tool_choice = formatToolChoice(options.toolChoice);
    }
  }

  if (options.container) {
    params.container = options.container;
  }

  if (options.mcpServers) {
    params.mcp_servers = options.mcpServers.map(server => ({
      ...server,
      type: 'url' as const,
    }));
  }

  if (options.metadata) {
    params.metadata = options.metadata;
  }

  if (options.serviceTier) {
    params.service_tier = options.serviceTier;
  }

  if (options.thinking) {
    params.thinking = options.thinking;
  }

  return params;
}

async function* processStream(sseStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
  let content = '';
  let thinking = '';
  const toolCallStates: Record<string, { name: string; arguments: string }> = {};

  for await (const data of extractDataLines(sseStream)) {
    if (data.trim() === 'data: [DONE]' || data.trim() === '[DONE]') {
      break;
    }

    const event = StreamUtils.parseStreamEvent<AnthropicStreamEvent>(data);
    if (!event) continue;

    switch (event.type) {
      case 'content_block_start': {
        const startEvent = event as ContentBlockStartEvent;
        if (startEvent.content_block.type === 'tool_use') {
          const toolBlock = startEvent.content_block as {
            type: 'tool_use';
            id: string;
            name: string;
            input: DynamicParams;
          };
          toolCallStates[toolBlock.id] = {
            name: toolBlock.name,
            arguments: '',
          };
        }
        break;
      }

      case 'content_block_delta': {
        const deltaEvent = event as ContentBlockDeltaEvent;

        if (deltaEvent.delta.type === 'text_delta') {
          const textDelta = deltaEvent.delta.text;
          content += textDelta;
          yield {
            delta: textDelta,
            content,
          };
        } else if (deltaEvent.delta.type === 'input_json_delta') {
          // Handle tool call argument accumulation
          const partialJson = deltaEvent.delta.partial_json;
          const toolCallId =
            Object.keys(toolCallStates)[deltaEvent.index] || Object.keys(toolCallStates)[0];

          if (toolCallId && toolCallStates[toolCallId]) {
            toolCallStates[toolCallId].arguments += partialJson;
          }
        } else if (deltaEvent.delta.type === 'thinking_delta') {
          const thinkingDelta = deltaEvent.delta.thinking;
          thinking += thinkingDelta;

          yield {
            delta: '',
            content,
            reasoning: {
              delta: thinkingDelta,
              content: thinking,
            },
          };
        }
        break;
      }

      case 'message_delta': {
        const messageDelta = event as MessageDeltaEvent;
        if (messageDelta.delta.stop_reason) {
          const finishReason = mapFinishReason(messageDelta.delta.stop_reason);
          const toolCalls = finalizeToolCalls(toolCallStates);

          yield {
            delta: '',
            content,
            finishReason,
            ...(toolCalls && { toolCalls }),
            ...(thinking && {
              reasoning: {
                delta: '',
                content: thinking,
              },
            }),
          };
        }
        break;
      }

      case 'error': {
        const errorEvent = event as ErrorEvent;
        throw new Error(
          `Anthropic API error: ${errorEvent.error.type} - ${errorEvent.error.message}`
        );
      }
    }
  }
}

function transformMessages(messages: Message[]): {
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

    const transformedMessage = transformMessage(msg);
    if (transformedMessage) {
      if (Array.isArray(transformedMessage)) {
        anthropicMessages.push(...transformedMessage);
      } else {
        anthropicMessages.push(transformedMessage);
      }
    }
  }

  return { systemMessage, anthropicMessages };
}

function transformMessage(msg: Message): AnthropicMessageParam | AnthropicMessageParam[] | null {
  switch (msg.role) {
    case 'tool':
      return transformToolMessage(msg);
    case 'user':
    case 'assistant':
      return transformUserOrAssistantMessage(msg);
    default:
      return null;
  }
}

function transformToolMessage(msg: Message): AnthropicMessageParam[] {
  const { toolResults } = MessageTransformer.groupContentByType(msg.content);

  return toolResults.map(toolResult => ({
    role: 'user' as const,
    content: [
      {
        type: 'tool_result',
        tool_use_id: toolResult.toolCallId,
        content: toolResult.result,
      },
    ],
  }));
}

function transformUserOrAssistantMessage(msg: Message): AnthropicMessageParam {
  return {
    role: msg.role as 'user' | 'assistant',
    content: buildContentBlocks(msg),
  };
}

function buildContentBlocks(msg: Message): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];

  // Add text content
  const textContent = MessageTransformer.extractTextContent(msg.content);
  if (textContent) {
    blocks.push({
      type: 'text',
      text: textContent,
    });
  }

  // Add image content
  const { images } = MessageTransformer.groupContentByType(msg.content);
  for (const imageContent of images) {
    if (imageContent.image.startsWith('data:')) {
      const [header, data] = imageContent.image.split(',');
      const mediaType = header.match(/data:([^;]+)/)?.[1] as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';

      if (mediaType && ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data,
          },
        });
      }
    }
  }

  // Add tool use blocks for assistant messages
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

function formatTools(tools: Tool[]): AnthropicTool[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

function formatToolChoice(toolChoice: AnthropicOptions['toolChoice']): AnthropicToolChoice {
  if (!toolChoice) return { type: 'auto' };
  if (typeof toolChoice === 'object') {
    return { type: 'tool', name: toolChoice.name };
  }
  return { type: toolChoice as 'auto' | 'any' };
}

function finalizeToolCalls(
  toolCallStates: Record<string, { name: string; arguments: string }>
): ToolCall[] | undefined {
  const entries = Object.entries(toolCallStates);
  if (entries.length === 0) return undefined;

  return entries.map(([id, state]) => {
    try {
      return {
        id,
        name: state.name,
        arguments: JSON.parse(state.arguments),
      };
    } catch {
      return {
        id,
        name: state.name,
        arguments: {},
      };
    }
  });
}

function mapFinishReason(reason?: string): FinishReason | undefined {
  if (!reason) return undefined;

  switch (reason) {
    case 'end_turn':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'stop_sequence':
      return 'stop';
    case 'tool_use':
      return 'tool_use';
    case 'pause_turn':
      return 'stop';
    case 'refusal':
      return 'error';
    default:
      return undefined;
  }
}
