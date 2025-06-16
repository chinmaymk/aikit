import type {
  Message,
  Tool,
  OpenAIOptions,
  OpenAIResponsesOptions,
  OpenAIEmbeddingOptions,
} from '../types';
import { OpenAI } from './openai';
import { OpenAIMessageTransformer } from './openai_transformers';

// Re-export from modular files
export { OpenAIClientFactory } from './openai_client';
export { OpenAIMessageTransformer } from './openai_transformers';
export { OpenAIStreamProcessor } from './openai_stream';
export { OpenAIEmbeddingUtils } from './openai_embeddings_util';

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
    this.addBasicChatParams(params, options);
    this.addAdvancedChatParams(params, options);
    this.addStreamingChatParams(params, options);
  }

  private static addBasicChatParams(
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

    Object.assign(params, additionalParams);
  }

  private static addAdvancedChatParams(
    params: OpenAI.Chat.CreateParams,
    options: OpenAIOptions
  ): void {
    const extendedParams = params as unknown as Record<string, unknown>;

    if (options.modalities !== undefined) extendedParams.modalities = options.modalities;
    if (options.audio !== undefined) extendedParams.audio = options.audio;
    if (options.maxCompletionTokens !== undefined)
      extendedParams.max_completion_tokens = options.maxCompletionTokens;
    if (options.prediction !== undefined) extendedParams.prediction = options.prediction;
    if (options.webSearchOptions !== undefined)
      extendedParams.web_search_options = options.webSearchOptions;
  }

  private static addStreamingChatParams(
    params: OpenAI.Chat.CreateParams,
    options: OpenAIOptions
  ): void {
    if (options.includeUsage) {
      const streamOptions = { stream_options: { include_usage: true } };
      Object.assign(params, streamOptions);
    }
  }

  private static addResponsesOptionalParams(
    params: OpenAI.Responses.CreateParams,
    options: OpenAIResponsesOptions
  ): void {
    this.addBasicResponsesParams(params, options);
    this.addAdvancedResponsesParams(params, options);
  }

  private static addBasicResponsesParams(
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

    Object.assign(params, additionalParams);
  }

  private static addAdvancedResponsesParams(
    params: OpenAI.Responses.CreateParams,
    options: OpenAIResponsesOptions
  ): void {
    const additionalParams: Partial<OpenAI.Responses.CreateParams> = {};

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
