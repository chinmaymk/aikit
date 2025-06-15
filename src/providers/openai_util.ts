import type {
  Message,
  StreamChunk,
  Tool,
  OpenAIOptions,
  OpenAIResponsesOptions,
  OpenAIEmbeddingOptions,
  EmbeddingResponse,
  EmbeddingResult,
  Content,
  GenerationUsage,
} from '../types';
import { MessageTransformer, StreamUtils, StreamState, ResponseProcessor } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';
import { OpenAI } from './openai';

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const OPENAI_CONSTANTS = {
  BASE_URL: 'https://api.openai.com/v1',
  MAX_EMBEDDING_BATCH_SIZE: 2048,
  FINISH_REASON_MAPPINGS: {
    CHAT: {
      stop: 'stop',
      length: 'length',
      tool_calls: 'tool_use',
      content_filter: 'stop',
    } as const,
    RESPONSES: {
      completed: 'stop',
      incomplete: 'length',
      failed: 'error',
      tool_calls_required: 'tool_use',
    } as const,
  },
} as const;
// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

// ============================================================================
// CLIENT FACTORY
// ============================================================================

export class OpenAIClientFactory {
  static createClient(config: OpenAI.BaseConfig): APIClient {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.organization) headers['OpenAI-Organization'] = config.organization;
    if (config.project) headers['OpenAI-Project'] = config.project;

    return new APIClient(
      config.baseURL ?? OPENAI_CONSTANTS.BASE_URL,
      headers,
      config.timeout,
      config.maxRetries,
      config.mutateHeaders
    );
  }
}

// ============================================================================
// MESSAGE TRANSFORMERS
// ============================================================================

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
        // Throw error for unknown/unsupported roles
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
        // Throw error for unknown/unsupported roles
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

// ============================================================================
// REQUEST BUILDERS
// ============================================================================

export class OpenAIRequestBuilder {
  static buildChatCompletionParams(
    messages: Message[],
    options: OpenAIOptions
  ): OpenAI.Chat.CreateParams {
    const params: OpenAI.Chat.CreateParams = {
      model: options.model!,
      messages: OpenAIMessageTransformer.toChatCompletions(messages),
      stream: true,
      max_tokens: options.maxOutputTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stop: options.stopSequences,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };

    this.addChatOptionalParams(params, options);
    this.addChatToolParams(params, options);

    if (options.reasoning) {
      return { ...params, reasoning: options.reasoning };
    }

    return params;
  }

  static buildResponsesParams(
    messages: Message[],
    options: OpenAIResponsesOptions
  ): OpenAI.Responses.CreateParams {
    const params: OpenAI.Responses.CreateParams = {
      model: options.model!,
      input: OpenAIMessageTransformer.toResponses(messages),
      stream: true,
      max_output_tokens: options.maxOutputTokens,
      temperature: options.temperature,
      top_p: options.topP,
    };

    this.addResponsesOptionalParams(params, options);
    this.addResponsesToolParams(params, options);

    return params;
  }

  static buildEmbeddingParams(
    texts: string[],
    options: OpenAIEmbeddingOptions
  ): OpenAI.Embeddings.CreateParams {
    const baseParams: OpenAI.Embeddings.CreateParams = {
      model: options.model!,
      input: texts,
    };

    const additionalParams: Record<string, unknown> = {};

    if (options.dimensions) additionalParams.dimensions = options.dimensions;
    if (options.encodingFormat) additionalParams.encoding_format = options.encodingFormat;
    if (options.user) additionalParams.user = options.user;

    return { ...baseParams, ...additionalParams } as OpenAI.Embeddings.CreateParams;
  }

  private static addChatOptionalParams(
    params: OpenAI.Chat.CreateParams,
    options: OpenAIOptions
  ): void {
    const additionalParams: Partial<OpenAI.Chat.CreateParams> = {};

    if (options.user !== undefined) additionalParams.user = options.user;
    if (options.logprobs !== undefined) additionalParams.logprobs = options.logprobs;
    if (options.topLogprobs !== undefined) additionalParams.top_logprobs = options.topLogprobs;
    if (options.seed !== undefined) additionalParams.seed = options.seed;
    if (options.responseFormat !== undefined)
      additionalParams.response_format = options.responseFormat;
    if (options.logitBias !== undefined) additionalParams.logit_bias = options.logitBias;
    if (options.n !== undefined) additionalParams.n = options.n;

    // Handle newer parameters that may not be in the official TypeScript definitions yet
    const extendedParams = additionalParams as Record<string, unknown>;
    if (options.modalities !== undefined) extendedParams.modalities = options.modalities;
    if (options.audio !== undefined) extendedParams.audio = options.audio;
    if (options.maxCompletionTokens !== undefined)
      extendedParams.max_completion_tokens = options.maxCompletionTokens;
    if (options.prediction !== undefined) extendedParams.prediction = options.prediction;
    if (options.webSearchOptions !== undefined)
      extendedParams.web_search_options = options.webSearchOptions;

    if (options.includeUsage) {
      additionalParams.stream_options = {
        include_usage: true,
      };
    }

    Object.assign(params, additionalParams);
  }

  private static addResponsesOptionalParams(
    params: OpenAI.Responses.CreateParams,
    options: OpenAIResponsesOptions
  ): void {
    const additionalParams: Partial<OpenAI.Responses.CreateParams> = {};

    if (options.background !== undefined) additionalParams.background = options.background;
    if (options.include !== undefined) additionalParams.include = options.include;
    if (options.instructions !== undefined) additionalParams.instructions = options.instructions;
    if (options.metadata !== undefined) additionalParams.metadata = options.metadata;
    if (options.parallelToolCalls !== undefined)
      additionalParams.parallel_tool_calls = options.parallelToolCalls;
    if (options.previousResponseId !== undefined)
      additionalParams.previous_response_id = options.previousResponseId;
    if (options.reasoning !== undefined) additionalParams.reasoning = options.reasoning;
    if (options.serviceTier !== undefined) additionalParams.service_tier = options.serviceTier;
    if (options.store !== undefined) additionalParams.store = options.store;
    if (options.text !== undefined) additionalParams.text = options.text;
    if (options.truncation !== undefined) additionalParams.truncation = options.truncation;
    if (options.user !== undefined) additionalParams.user = options.user;

    Object.assign(params, additionalParams);
  }

  private static addChatToolParams(params: OpenAI.Chat.CreateParams, options: OpenAIOptions): void {
    if (!options.tools?.length) return;

    const toolParams: {
      tools?: OpenAI.Chat.ChatTool[];
      tool_choice?: OpenAI.Chat.ToolChoice;
      parallel_tool_calls?: boolean;
    } = {
      tools: this.formatChatTools(options.tools),
    };

    if (options.toolChoice) {
      toolParams.tool_choice = this.formatChatToolChoice(options.toolChoice);
    }

    if (options.parallelToolCalls !== undefined) {
      toolParams.parallel_tool_calls = options.parallelToolCalls;
    }

    Object.assign(params, toolParams);
  }

  private static addResponsesToolParams(
    params: OpenAI.Responses.CreateParams,
    options: OpenAIResponsesOptions
  ): void {
    if (!options.tools?.length) return;

    const toolParams: {
      tools?: OpenAI.Responses.ResponsesTool[];
      tool_choice?: OpenAI.Responses.ResponsesToolChoice;
    } = {
      tools: this.formatResponsesTools(options.tools),
    };

    if (options.toolChoice) {
      toolParams.tool_choice = this.formatResponsesToolChoice(options.toolChoice);
    }

    Object.assign(params, toolParams);
  }

  private static formatChatTools(tools: Tool[]): OpenAI.Chat.ChatTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private static formatResponsesTools(tools: Tool[]): OpenAI.Responses.ResponsesTool[] {
    return tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  private static formatChatToolChoice(
    toolChoice: string | { name: string } | undefined
  ): OpenAI.Chat.ToolChoice {
    if (!toolChoice) return 'auto';
    if (typeof toolChoice === 'string') return toolChoice as OpenAI.Chat.ToolChoice;
    return { type: 'function', function: { name: toolChoice.name } };
  }

  private static formatResponsesToolChoice(
    toolChoice: string | { name: string } | undefined
  ): OpenAI.Responses.ResponsesToolChoice {
    if (!toolChoice) return 'auto';
    if (typeof toolChoice === 'string') {
      return toolChoice === 'none' ? 'auto' : (toolChoice as OpenAI.Responses.ResponsesToolChoice);
    }
    return { type: 'function', name: toolChoice.name };
  }
}

// ============================================================================
// STREAM PROCESSORS
// ============================================================================

export class OpenAIStreamProcessor {
  static async *processChatStream(
    lineStream: AsyncIterable<string>,
    state?: StreamState
  ): AsyncIterable<StreamChunk> {
    const streamState = state ?? new StreamState();

    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') return;

      const chunk = StreamUtils.parseStreamEvent<OpenAI.Chat.StreamChunk>(data);
      if (!chunk) continue;

      const result = this.processChatChunk(chunk, streamState);
      if (result) yield result;
    }
  }

  static async *processResponsesStream(
    lineStream: AsyncIterable<string>,
    state?: StreamState
  ): AsyncIterable<StreamChunk> {
    const streamState = state ?? new StreamState();

    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') return;

      const event = StreamUtils.parseStreamEvent<OpenAI.Responses.StreamEvent>(data);
      if (!event) continue;

      const chunk = this.processResponsesEvent(event, streamState);
      if (chunk) yield chunk;
    }
  }

  private static processChatChunk(
    chunk: OpenAI.Chat.StreamChunk,
    state: StreamState
  ): StreamChunk | null {
    // Check for usage information first (can come in chunks with empty choices)
    if (chunk.usage && (!chunk.choices || chunk.choices.length === 0)) {
      const usage = this.extractUsageFromChunk(chunk);
      if (usage) {
        // Return a usage-only chunk with timing since this might be the final usage info
        return state.createChunk('', 'stop', usage);
      }
    }

    if (!chunk.choices || chunk.choices.length === 0) return null;

    const choice = chunk.choices[0];
    const delta = choice.delta || {};

    // Handle content delta
    if (delta.content) {
      state.addContentDelta(delta.content);
      return state.createChunk(delta.content);
    }

    // Handle reasoning delta
    if (delta.reasoning) {
      const reasoning = state.addReasoningDelta(delta.reasoning);
      return MessageTransformer.createStreamChunk(
        state.content,
        '',
        undefined,
        undefined,
        reasoning
      );
    }

    // Handle tool calls
    if (delta.tool_calls) {
      this.processChatToolCallDeltas(delta.tool_calls, state);
    }

    // Handle finish reason (this might be in the same chunk as tool calls)
    if (choice.finish_reason) {
      const finishReason = ResponseProcessor.mapFinishReason(
        choice.finish_reason,
        OPENAI_CONSTANTS.FINISH_REASON_MAPPINGS.CHAT
      );

      // Extract usage information if available
      const usage = this.extractUsageFromChunk(chunk);

      return state.createChunk('', finishReason, usage);
    }

    // If we processed tool calls but no finish reason, return a chunk
    if (delta.tool_calls) {
      return state.createChunk('');
    }

    return null;
  }

  private static processResponsesEvent(
    event: OpenAI.Responses.StreamEvent,
    state: StreamState
  ): StreamChunk | null {
    switch (event.type) {
      case 'response.output_text.delta':
        state.addContentDelta(event.delta);
        return state.createChunk(event.delta);

      case 'response.output_item.added':
        if (event.item?.type === 'function_call') {
          state.outputIndexToCallId[event.output_index] = event.item.call_id;
          state.initToolCall(event.item.call_id, event.item.name);
          return state.createChunk('');
        }
        return null;

      case 'response.function_call_arguments.delta': {
        const callId = event.call_id || state.outputIndexToCallId[event.output_index];
        if (!callId) return null;
        state.addToolCallArgs(callId, event.delta);
        return state.createChunk('');
      }

      case 'response.function_call_arguments.done': {
        const callId = event.call_id || state.outputIndexToCallId[event.output_index];
        if (!callId || !state.toolCallStates[callId]) return null;
        const argsString = event.arguments || state.toolCallStates[callId].arguments || '{}';
        state.toolCallStates[callId].arguments = argsString;
        return state.createChunk('');
      }

      case 'response.completed': {
        const finishReason = ResponseProcessor.mapFinishReason(
          event.response?.status || 'completed',
          OPENAI_CONSTANTS.FINISH_REASON_MAPPINGS.RESPONSES
        );
        return state.createChunk('', finishReason);
      }

      default:
        return null;
    }
  }

  private static processChatToolCallDeltas(
    deltaToolCalls: OpenAI.Chat.ToolCallDelta[],
    state: StreamState
  ): void {
    for (const deltaCall of deltaToolCalls) {
      const index = deltaCall.index ?? 0;

      // Map index to call ID if we have one
      if (deltaCall.id) {
        state.outputIndexToCallId[index] = deltaCall.id;
      }

      // Get the call ID (either from this delta or from previous mapping)
      const callId = deltaCall.id || state.outputIndexToCallId[index];

      // Initialize tool call if we have both ID and name
      if (callId && deltaCall.function?.name) {
        state.initToolCall(callId, deltaCall.function.name);
      }

      // Add arguments if we have a call ID and arguments
      if (callId && deltaCall.function?.arguments) {
        state.addToolCallArgs(callId, deltaCall.function.arguments);
      }
    }
  }

  private static extractUsageFromChunk(
    chunk: OpenAI.Chat.StreamChunk
  ): GenerationUsage | undefined {
    if (!chunk.usage) return undefined;

    const usage: GenerationUsage = {};

    if (chunk.usage.prompt_tokens) usage.inputTokens = chunk.usage.prompt_tokens;
    if (chunk.usage.completion_tokens) usage.outputTokens = chunk.usage.completion_tokens;
    if (chunk.usage.total_tokens) usage.totalTokens = chunk.usage.total_tokens;

    // Handle reasoning tokens from completion_tokens_details
    if (chunk.usage.completion_tokens_details?.reasoning_tokens) {
      usage.reasoningTokens = chunk.usage.completion_tokens_details.reasoning_tokens;
    }

    // Handle cached tokens from prompt_tokens_details
    if (chunk.usage.prompt_tokens_details?.cached_tokens) {
      usage.cacheTokens = chunk.usage.prompt_tokens_details.cached_tokens;
    }

    return Object.keys(usage).length > 0 ? usage : undefined;
  }
}

// ============================================================================
// EMBEDDINGS UTILITIES
// ============================================================================

export class OpenAIEmbeddingUtils {
  static validateRequest(texts: string[]): void {
    if (texts.length === 0) {
      throw new Error('At least one text must be provided');
    }

    if (texts.length > OPENAI_CONSTANTS.MAX_EMBEDDING_BATCH_SIZE) {
      throw new Error(
        `OpenAI embedding API supports up to ${OPENAI_CONSTANTS.MAX_EMBEDDING_BATCH_SIZE} texts per request`
      );
    }

    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        throw new Error(`Text at index ${i} must be a string`);
      }
    }
  }

  static transformResponse(response: OpenAI.Embeddings.APIResponse): EmbeddingResponse {
    const embeddings: EmbeddingResult[] = response.data.map((item, index) => ({
      values: [...item.embedding], // Ensure immutability
      index,
    }));

    return {
      embeddings,
      model: response.model,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }
}
