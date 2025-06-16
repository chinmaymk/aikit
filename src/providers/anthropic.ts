import type {
  Message,
  StreamChunk,
  AnthropicOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';

import { StreamState, DynamicParams } from './utils';
import { APIClient } from './api';
import { transformMessages, formatToolChoice, AnthropicMessage } from './anthropic-transformers';
import { processAnthropicStream } from './anthropic-stream';

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

  const client = new APIClient(baseURL, headers, timeout, maxRetries, config.mutateHeaders);
  const defaultOptions = { apiKey, beta, anthropicVersion, ...defaultGenerationOptions };

  return async function* anthropic(messages: Message[], options: Partial<AnthropicOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const params = buildRequestParams(messages, mergedOptions);
    const streamState = new StreamState();
    const stream = await client.stream('/messages', params);
    const sseStream = client.processStreamAsLines(stream);
    yield* processAnthropicStream(sseStream, streamState);
  };
}

export async function* anthropic(
  messages: Message[],
  config: WithApiKey<AnthropicOptions>
): AsyncIterable<StreamChunk> {
  const provider = createAnthropic(config);
  yield* provider(messages);
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
  if (options.system) {
    params.system =
      typeof options.system === 'string'
        ? options.system
        : options.system.map(block => block.text).join('\n');
  } else if (systemMessage) {
    params.system = systemMessage;
  }
  if (options.tools) {
    params.tools = options.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
    if (options.toolChoice) params.tool_choice = formatToolChoice(options.toolChoice);
  }
  if (options.container) params.container = options.container;
  if (options.mcpServers)
    params.mcp_servers = options.mcpServers.map(server => ({ ...server, type: 'url' as const }));
  if (options.metadata) params.metadata = options.metadata;
  if (options.serviceTier) params.service_tier = options.serviceTier;
  if (options.thinking) params.thinking = options.thinking;
  return params;
}
