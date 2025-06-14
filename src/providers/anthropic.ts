import type {
  Message,
  StreamChunk,
  FinishReason,
  AnthropicOptions,
  WithApiKey,
  StreamingGenerateFunction,
  GenerationUsage,
} from '../types';

import {
  MessageTransformer,
  StreamUtils,
  ValidationUtils,
  StreamState,
  DynamicParams,
} from './utils';
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

  if (beta?.length) {
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

// Consolidated Anthropic API types for better maintainability
type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: DynamicParams }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContentBlock[];
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  tools?: Array<{ name: string; description: string; input_schema: DynamicParams }>;
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  stream: true;
  container?: string;
  mcp_servers?: Array<{
    name: string;
    type: 'url';
    url: string;
    authorization_token?: string;
    tool_configuration?: { enabled?: boolean; allowed_tools?: string[] };
  }>;
  metadata?: { user_id?: string };
  service_tier?: 'auto' | 'standard_only';
  thinking?: { type: 'enabled'; budget_tokens: number } | { type: 'disabled' };
}

// Consolidated streaming event types
type AnthropicStreamEvent =
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

// Helper functions for functional API
function buildRequestParams(messages: Message[], options: AnthropicOptions): AnthropicRequest {
  const { systemMessage, anthropicMessages } = transformMessages(messages);

  const params: AnthropicRequest = {
    model: options.model!,
    messages: anthropicMessages,
    max_tokens: options.maxOutputTokens || 4096,
    stream: true,
    temperature: options.temperature,
    top_p: options.topP,
    top_k: options.topK,
    stop_sequences: options.stopSequences,
  };

  // Handle system prompt from options or messages
  if (options.system) {
    // System from options takes precedence
    if (typeof options.system === 'string') {
      params.system = options.system;
    } else {
      // Array of text blocks
      params.system = options.system.map(block => block.text).join('\n');
    }
  } else if (systemMessage) {
    params.system = systemMessage;
  }

  if (options.tools) {
    params.tools = options.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
    if (options.toolChoice) {
      params.tool_choice = formatToolChoice(options.toolChoice);
    }
  }
  if (options.container) params.container = options.container;
  if (options.mcpServers) {
    params.mcp_servers = options.mcpServers.map(server => ({ ...server, type: 'url' as const }));
  }
  if (options.metadata) params.metadata = options.metadata;
  if (options.serviceTier) params.service_tier = options.serviceTier;
  if (options.thinking) params.thinking = options.thinking;

  return params;
}

async function* processStream(sseStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
  const state = new StreamState();

  for await (const data of extractDataLines(sseStream)) {
    if (StreamUtils.isStreamDone(data) || data.trim() === 'data: [DONE]') break;

    const event = StreamUtils.parseStreamEvent<AnthropicStreamEvent>(data);
    if (!event) continue;

    const chunk = handleStreamEvent(event, state);
    if (chunk) yield chunk;
  }
}

function handleStreamEvent(event: AnthropicStreamEvent, state: StreamState): StreamChunk | null {
  switch (event.type) {
    case 'message_start':
      // Note: message_start provides initial usage info but we can't easily combine it
      // with message_delta usage in the current architecture. This would require
      // significant refactoring of the streaming state management.
      return null;
    case 'content_block_start':
      if ('content_block' in event && 'index' in event) {
        return handleContentBlockStart(
          event as Extract<AnthropicStreamEvent, { type: 'content_block_start' }>,
          state
        );
      }
      return null;
    case 'content_block_delta':
      if ('delta' in event && 'index' in event) {
        return handleContentBlockDelta(
          event as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>,
          state
        );
      }
      return null;
    case 'message_delta':
      if ('delta' in event) {
        return handleMessageDelta(
          event as Extract<AnthropicStreamEvent, { type: 'message_delta' }>,
          state
        );
      }
      return null;
    case 'error':
      if (
        'error' in event &&
        event.error &&
        typeof event.error === 'object' &&
        'type' in event.error &&
        'message' in event.error
      ) {
        throw new Error(`Anthropic API error: ${event.error.type} - ${event.error.message}`);
      }
      return null;
    default:
      return null;
  }
}

function handleContentBlockStart(
  event: Extract<AnthropicStreamEvent, { type: 'content_block_start' }>,
  state: StreamState
): null {
  if (event.content_block.type === 'tool_use') {
    const toolBlock = event.content_block as {
      type: 'tool_use';
      id: string;
      name: string;
      input: DynamicParams;
    };
    state.initToolCall(toolBlock.id, toolBlock.name);
  }
  return null;
}

function handleContentBlockDelta(
  event: Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>,
  state: StreamState
): StreamChunk | null {
  const { delta } = event;

  if (delta.type === 'text_delta') {
    state.addContentDelta(delta.text);
    return MessageTransformer.createStreamChunk(state.content, delta.text);
  }

  if (delta.type === 'input_json_delta') {
    const toolCallId =
      Object.keys(state.toolCallStates)[event.index] || Object.keys(state.toolCallStates)[0];
    if (toolCallId) {
      state.addToolCallArgs(toolCallId, delta.partial_json);
    }
    return null;
  }

  if (delta.type === 'thinking_delta') {
    const reasoning = state.addReasoningDelta(delta.thinking);
    return MessageTransformer.createStreamChunk(state.content, '', undefined, undefined, reasoning);
  }

  return null;
}

function handleMessageDelta(
  event: Extract<AnthropicStreamEvent, { type: 'message_delta' }>,
  state: StreamState
): StreamChunk | null {
  if (!event.delta.stop_reason) return null;

  const finishReason = mapFinishReason(event.delta.stop_reason);

  // Extract usage information from the event
  const usage = extractUsageFromAnthropicEvent(event);

  return state.createChunk('', finishReason, usage);
}

function transformMessages(messages: Message[]): {
  systemMessage: string;
  anthropicMessages: AnthropicMessage[];
} {
  const systemMessages: string[] = [];
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const systemText = MessageTransformer.extractTextContent(msg.content);
      if (systemText) {
        systemMessages.push(systemText);
      }
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

  return {
    systemMessage: systemMessages.join('\n\n'),
    anthropicMessages,
  };
}

function transformMessage(msg: Message): AnthropicMessage | AnthropicMessage[] | null {
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
    if (contentBlocks.length === 0) {
      // Skip empty messages
      return null;
    }
    return { role: msg.role, content: contentBlocks };
  }

  // Throw error for unknown/unsupported roles
  throw new Error(
    `Unsupported message role '${msg.role}' for Anthropic provider. Supported roles: user, assistant, system, tool`
  );
}

function buildContentBlocks(msg: Message): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];
  const { text, images } = MessageTransformer.groupContentByType(msg.content);

  // Add all text content, not just the first one
  if (text.length > 0) {
    const combinedText = text.map(t => t.text).join('\n');
    if (combinedText.trim()) {
      blocks.push({ type: 'text', text: combinedText });
    }
  }

  // Add image content with proper validation
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

  // Add tool use blocks for assistant messages
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

function formatToolChoice(toolChoice: AnthropicOptions['toolChoice']): {
  type: 'auto' | 'any' | 'tool';
  name?: string;
} {
  if (!toolChoice) return { type: 'auto' };
  if (typeof toolChoice === 'object') return { type: 'tool', name: toolChoice.name };
  return { type: toolChoice as 'auto' | 'any' };
}

function mapFinishReason(reason?: string): FinishReason | undefined {
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

function extractUsageFromAnthropicEvent(
  event: Extract<AnthropicStreamEvent, { type: 'message_delta' }>
): GenerationUsage | undefined {
  if (!event.usage) return undefined;

  const usage: GenerationUsage = {};

  // Output tokens are the main usage information from message_delta events
  if (event.usage.output_tokens) {
    usage.outputTokens = event.usage.output_tokens;
  }

  // Note: Anthropic's streaming API typically only provides output_tokens in message_delta events
  // Input tokens, cache tokens, etc. are usually available in the message_start event
  // but we don't have access to that here. The streaming architecture would need to be
  // updated to capture and pass through usage from message_start events.

  return Object.keys(usage).length > 0 ? usage : undefined;
}
