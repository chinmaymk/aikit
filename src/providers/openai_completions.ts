import type {
  Message,
  StreamChunk,
  FinishReason,
  Tool,
  ToolCall,
  OpenAIOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';
import { MessageTransformer, StreamUtils } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

// Stream state for managing ongoing generation
class StreamState {
  content = '';
  reasoningContent = '';
  toolCalls: Record<number, ToolCall> = {};
  argumentsBuffer: Record<number, string> = {};
}

/**
 * Creates an OpenAI generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const openai = createOpenAI({ apiKey: '...', model: 'gpt-4o' });
 *
 * // Use like any function
 * const result = await collectDeltas(openai([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(openai([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createOpenAI(
  config: WithApiKey<OpenAIOptions>
): StreamingGenerateFunction<Partial<OpenAIOptions>> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const {
    apiKey,
    baseURL = 'https://api.openai.com/v1',
    organization,
    project,
    timeout,
    maxRetries,
    ...defaultGenerationOptions
  } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (organization) headers['OpenAI-Organization'] = organization;
  if (project) headers['OpenAI-Project'] = project;

  const client = new APIClient(baseURL, headers, timeout, maxRetries);
  const defaultOptions = { apiKey, ...defaultGenerationOptions };

  return async function* openai(messages: Message[], options: Partial<OpenAIOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    // Build request parameters
    const params = buildRequestParams(messages, mergedOptions);
    const stream = await client.stream('/chat/completions', params);
    const lineStream = client.processStreamAsLines(stream);

    // Process stream
    const state = new StreamState();
    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') return;

      const chunk = StreamUtils.parseStreamEvent<ChatCompletionChunk>(data);
      if (!chunk) continue;

      const result = processChunk(chunk, state);
      if (result) yield result;
    }
  };
}

/**
 * Direct OpenAI function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   openai({ apiKey: '...', model: 'gpt-4o' }, [userText('Hello')])
 * );
 * ```
 */
export async function* openai(
  config: WithApiKey<OpenAIOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createOpenAI(config);
  yield* provider(messages);
}

// Type definitions for OpenAI Chat Completions API

type ChatCompletionCreateParams = {
  model: string;
  messages: ChatCompletionMessageParam[];
  stream: true;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  logprobs?: boolean;
  top_logprobs?: number;
  seed?: number;
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      description?: string;
      schema?: Record<string, unknown>;
      strict?: boolean;
    };
  };
  logit_bias?: Record<string, number>;
  n?: number;
  stream_options?: {
    include_usage?: boolean;
  };
  tools?: ChatCompletionTool[];
  tool_choice?: 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } };
  parallel_tool_calls?: boolean;
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
  };
};

type ChatCompletionMessageParam = {
  role: 'system' | 'user' | 'assistant' | 'developer' | 'tool';
  content: string | ChatCompletionContentPart[] | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
};

type ChatCompletionContentPart = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

type ChatCompletionTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type ChatCompletionChunk = {
  choices: {
    delta: {
      content?: string;
      tool_calls?: OpenAIToolCallDelta[];
      reasoning?: string;
    };
    finish_reason?: string;
  }[];
  usage?: {
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
};

interface OpenAIToolCallDelta {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
  type?: 'function';
}

// Helper functions for functional API
function buildRequestParams(
  messages: Message[],
  options: OpenAIOptions
): ChatCompletionCreateParams {
  const params: ChatCompletionCreateParams = {
    model: options.model!,
    messages: transformMessages(messages),
    stream: true,
    max_tokens: options.maxOutputTokens,
    temperature: options.temperature,
    top_p: options.topP,
    stop: options.stopSequences,
    presence_penalty: options.presencePenalty,
    frequency_penalty: options.frequencyPenalty,
  };

  addOptionalParams(params, options);
  addToolParams(params, options);

  // Add reasoning configuration for o-series models
  if (options.reasoning) {
    params.reasoning = options.reasoning;
  }

  return params;
}

function transformMessages(messages: Message[]): ChatCompletionMessageParam[] {
  return messages.flatMap(msg => mapMessage(msg));
}

function mapMessage(msg: Message): ChatCompletionMessageParam[] {
  switch (msg.role) {
    case 'system':
      return [
        {
          role: 'system',
          content: MessageTransformer.extractTextContent(msg.content),
        },
      ];
    case 'developer':
      return [
        {
          role: 'developer',
          content: MessageTransformer.extractTextContent(msg.content),
        },
      ];
    case 'tool': {
      const { toolResults } = MessageTransformer.groupContentByType(msg.content);
      return toolResults.map(content => ({
        role: 'tool',
        tool_call_id: content.toolCallId,
        content: content.result,
      }));
    }
    case 'user':
      return [
        {
          role: 'user',
          content: buildContentParts(msg.content),
        },
      ];
    case 'assistant': {
      const assistantMsg: ChatCompletionMessageParam = {
        role: 'assistant',
        content: MessageTransformer.extractTextContent(msg.content),
      };

      if (msg.toolCalls) {
        assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }

      return [assistantMsg];
    }
    default:
      return [];
  }
}

function buildContentParts(content: Message['content']): ChatCompletionContentPart[] {
  return content
    .map(c => {
      if (c.type === 'text') return { type: 'text' as const, text: c.text };
      if (c.type === 'image') return { type: 'image_url' as const, image_url: { url: c.image } };
      return null;
    })
    .filter(Boolean) as ChatCompletionContentPart[];
}

function addOptionalParams(params: ChatCompletionCreateParams, options: OpenAIOptions) {
  if (options.user !== undefined) params.user = options.user;
  if (options.logprobs !== undefined) params.logprobs = options.logprobs;
  if (options.topLogprobs !== undefined) params.top_logprobs = options.topLogprobs;
  if (options.seed !== undefined) params.seed = options.seed;
  if (options.responseFormat !== undefined) params.response_format = options.responseFormat;
  if (options.logitBias !== undefined) params.logit_bias = options.logitBias;
  if (options.n !== undefined) params.n = options.n;
  if (options.streamOptions !== undefined) {
    params.stream_options = {
      include_usage: options.streamOptions.includeUsage,
    };
  }
}

function addToolParams(params: ChatCompletionCreateParams, options: OpenAIOptions) {
  if (options.tools) {
    params.tools = formatTools(options.tools);
    if (options.toolChoice) {
      params.tool_choice = formatToolChoice(options.toolChoice);
    }
    if (options.parallelToolCalls !== undefined) {
      params.parallel_tool_calls = options.parallelToolCalls;
    }
  }
}

function formatTools(tools: Tool[]): ChatCompletionTool[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function formatToolChoice(
  toolChoice: OpenAIOptions['toolChoice']
): 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } } {
  if (!toolChoice) return 'auto';
  if (typeof toolChoice === 'object') {
    return { type: 'function', function: { name: toolChoice.name } };
  }
  return toolChoice;
}

function processChunk(chunk: ChatCompletionChunk, state: StreamState): StreamChunk | null {
  if (!chunk.choices || chunk.choices.length === 0) return null;

  const choice = chunk.choices[0];
  const delta = choice.delta || {};

  if (delta.content) {
    state.content += delta.content;
    return {
      delta: delta.content,
      content: state.content,
    };
  }

  if (delta.reasoning) {
    state.reasoningContent += delta.reasoning;
    return {
      delta: '',
      content: state.content,
      reasoning: {
        delta: delta.reasoning,
        content: state.reasoningContent,
      },
    };
  }

  if (delta.tool_calls) {
    processToolCallDeltas(delta.tool_calls, state);
    return {
      delta: '',
      content: state.content,
      toolCalls: Object.values(state.toolCalls),
    };
  }

  if (choice.finish_reason) {
    const finishReason = mapFinishReason(choice.finish_reason);
    return {
      delta: '',
      content: state.content,
      finishReason,
      ...(Object.keys(state.toolCalls).length > 0 && {
        toolCalls: Object.values(state.toolCalls),
      }),
      ...(state.reasoningContent && {
        reasoning: {
          delta: '',
          content: state.reasoningContent,
        },
      }),
    };
  }

  return null;
}

function processToolCallDeltas(deltaToolCalls: OpenAIToolCallDelta[], state: StreamState): void {
  for (const deltaCall of deltaToolCalls) {
    const index = deltaCall.index ?? 0;

    if (deltaCall.id) {
      state.toolCalls[index] = {
        id: deltaCall.id,
        name: '',
        arguments: {},
      };
      state.argumentsBuffer[index] = '';
    }

    if (deltaCall.function?.name) {
      if (state.toolCalls[index]) {
        state.toolCalls[index].name = deltaCall.function.name;
      }
    }

    if (deltaCall.function?.arguments) {
      state.argumentsBuffer[index] += deltaCall.function.arguments;

      try {
        const parsedArgs = JSON.parse(state.argumentsBuffer[index]);
        if (state.toolCalls[index]) {
          state.toolCalls[index].arguments = parsedArgs;
        }
      } catch {
        // Still accumulating arguments
      }
    }
  }
}

function mapFinishReason(reason: string): FinishReason {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool_use';
    case 'content_filter':
      return 'stop';
    default:
      return 'stop';
  }
}
