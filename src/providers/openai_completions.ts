import type {
  AIProvider,
  Message,
  OpenAIOptions,
  StreamChunk,
  Tool,
  ToolCall,
  FinishReason,
} from '../types';
import { MessageTransformer, StreamUtils } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

/**
 * The powerhouse behind OpenAI Chat Completions integration.
 * This class translates AIKit's generic requests into OpenAI's Chat Completions API dialect
 * and handles the response, whether it's a stream of tokens or a tool call.
 * It's like a universal translator, but for AI.
 *
 * @group Providers
 */
export class OpenAIProvider implements AIProvider<OpenAIOptions> {
  private client: APIClient;
  private defaultOptions: OpenAIOptions;

  /**
   * Sets up the OpenAI provider with your configuration.
   * @param options - Your OpenAI API credentials and default generation settings.
   */
  constructor(options: OpenAIOptions) {
    if (!options.apiKey) {
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
    } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (organization) headers['OpenAI-Organization'] = organization;
    if (project) headers['OpenAI-Project'] = project;

    this.client = new APIClient(baseURL, headers, timeout, maxRetries);
    this.defaultOptions = { apiKey, ...defaultGenerationOptions };
  }

  /**
   * Kicks off the generation process using the Chat Completions API.
   * It builds the request, sends it to OpenAI, and then processes the
   * response stream, yielding chunks as they come in.
   * @param messages - The conversation history.
   * @param options - The generation options (optional, will use defaults from constructor).
   * @returns An async iterable of stream chunks.
   */
  async *generate(messages: Message[], options: OpenAIOptions = {}): AsyncIterable<StreamChunk> {
    const mergedOptions = this.mergeOptions(options);

    if (!mergedOptions.model) {
      throw new Error('Model is required. Provide it at construction time or generation time.');
    }

    const params = this.buildRequestParams(messages, mergedOptions);
    const stream = await this.client.stream('/chat/completions', params);
    const lineStream = this.client.processStreamAsLines(stream);
    yield* this.processStream(lineStream);
  }

  /**
   * Merges default options with generation-time options.
   * Generation-time options take precedence over construction-time options.
   */
  private mergeOptions(generationOptions: OpenAIOptions): OpenAIOptions {
    return {
      ...this.defaultOptions,
      ...generationOptions,
    };
  }

  /**
   * Builds request parameters for the OpenAI Chat Completions API.
   * Handles message transformation, tool formatting, and all optional parameters.
   */
  private buildRequestParams(
    messages: Message[],
    options: OpenAIOptions
  ): ChatCompletionCreateParams {
    const params: ChatCompletionCreateParams = {
      model: options.model!,
      messages: this.transformMessages(messages),
      stream: true,
      max_tokens: options.maxOutputTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stop: options.stopSequences,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };

    this.addOptionalParams(params, options);
    this.addToolParams(params, options);

    // Add reasoning configuration for o-series models
    if (options.reasoning) {
      params.reasoning = options.reasoning;
    }

    return params;
  }

  /**
   * Processes the stream of responses from OpenAI.
   * Manages state and yields properly formatted chunks.
   */
  private async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    const state = new StreamState();

    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') return;

      const chunk = StreamUtils.parseStreamEvent<ChatCompletionChunk>(data);
      if (!chunk) continue;

      const result = this.processChunk(chunk, state);
      if (result) yield result;
    }
  }

  /**
   * Transforms AIKit messages to OpenAI Chat Completions API format.
   */
  private transformMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.flatMap(msg => this.mapMessage(msg));
  }

  /**
   * Maps a single message to OpenAI format.
   */
  private mapMessage(msg: Message): ChatCompletionMessageParam[] {
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
            content: this.buildContentParts(msg.content),
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

  /**
   * Builds content parts for user messages.
   */
  private buildContentParts(content: Message['content']): ChatCompletionContentPart[] {
    return content
      .map(c => {
        if (c.type === 'text') return { type: 'text' as const, text: c.text };
        if (c.type === 'image') return { type: 'image_url' as const, image_url: { url: c.image } };
        return null;
      })
      .filter(Boolean) as ChatCompletionContentPart[];
  }

  /**
   * Adds optional parameters to the request.
   */
  private addOptionalParams(params: ChatCompletionCreateParams, options: OpenAIOptions) {
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

  /**
   * Adds tool-related parameters to the request.
   */
  private addToolParams(params: ChatCompletionCreateParams, options: OpenAIOptions) {
    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
      if (options.parallelToolCalls !== undefined) {
        params.parallel_tool_calls = options.parallelToolCalls;
      }
    }
  }

  /**
   * Formats AIKit tools into the structure OpenAI expects.
   */
  private formatTools(tools: Tool[]): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Formats the tool choice option for the OpenAI API.
   */
  private formatToolChoice(
    toolChoice: OpenAIOptions['toolChoice']
  ): 'auto' | 'required' | 'none' | { type: 'function'; function: { name: string } } {
    if (!toolChoice) return 'auto';
    if (typeof toolChoice === 'object') {
      return { type: 'function', function: { name: toolChoice.name } };
    }
    return toolChoice;
  }

  /**
   * Processes a single chunk from the OpenAI stream.
   */
  private processChunk(chunk: ChatCompletionChunk, state: StreamState): StreamChunk | null {
    if (!chunk.choices || chunk.choices.length === 0) return null;

    const choice = chunk.choices[0];
    const delta = choice.delta?.content || '';
    const reasoningDelta = choice.delta?.reasoning || '';

    state.content += delta;
    if (reasoningDelta) {
      state.reasoningContent += reasoningDelta;
    }

    // Process tool calls
    this.processToolCallDeltas(choice.delta?.tool_calls ?? [], state);

    const finishReason = choice.finish_reason
      ? this.mapFinishReason(choice.finish_reason)
      : undefined;

    const reasoning = state.reasoningContent
      ? { content: state.reasoningContent, delta: reasoningDelta }
      : undefined;

    return {
      content: state.content,
      delta,
      finishReason,
      toolCalls:
        Object.keys(state.toolCalls).length > 0 ? Object.values(state.toolCalls) : undefined,
      reasoning,
    };
  }

  /**
   * Processes tool call deltas from streaming chunks.
   */
  private processToolCallDeltas(deltaToolCalls: OpenAIToolCallDelta[], state: StreamState): void {
    deltaToolCalls.forEach(delta => {
      if (delta.index === undefined) return;

      const index = delta.index;
      if (!state.toolCalls[index]) {
        state.toolCalls[index] = {
          id: delta.id || '',
          name: '',
          arguments: {},
        };
      }

      const toolCall = state.toolCalls[index];
      if (delta.id) toolCall.id = delta.id;
      if (delta.function?.name) toolCall.name = delta.function.name;
      if (delta.function?.arguments) {
        state.argumentsBuffer[index] =
          (state.argumentsBuffer[index] || '') + delta.function.arguments;
        try {
          toolCall.arguments = JSON.parse(state.argumentsBuffer[index]);
        } catch {
          // Keep accumulating arguments until we have valid JSON
        }
      }
    });
  }

  /**
   * Maps OpenAI finish reasons to AIKit finish reasons.
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}

/**
 * Manages the state of streaming completion.
 */
class StreamState {
  content = '';
  reasoningContent = '';
  toolCalls: Record<number, ToolCall> = {};
  argumentsBuffer: Record<number, string> = {};
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
