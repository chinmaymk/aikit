import type {
  AIProvider,
  Message,
  OpenAIOptions,
  StreamChunk,
  Tool,
  ToolCall,
  FinishReason,
} from '../types';
import { MessageTransformer, StreamUtils, DynamicParams } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

// Event interfaces for type safety
interface TextDeltaEvent {
  delta: string;
}

interface OutputItemAddedEvent {
  output_index: number;
  item?: {
    type: string;
    call_id: string;
    name: string;
  };
}

interface ArgsDeltaEvent {
  call_id?: string;
  output_index: number;
  delta: string;
}

interface ArgsDoneEvent {
  call_id?: string;
  output_index: number;
  arguments?: string;
}

interface CompletedEvent {
  response?: {
    status: string;
  };
}

/**
 * The powerhouse behind OpenAI integration.
 * This class translates AIKit's generic requests into OpenAI's Responses API dialect
 * and handles the response, whether it's a stream of tokens or a tool call.
 * It's like a universal translator, but for AI - now with improved state management.
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
   * Kicks off the generation process using the Responses API.
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
    const stream = await this.client.stream('/responses', params);
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
   * Builds request parameters for the OpenAI Responses API.
   * Handles message transformation, tool formatting, and optional parameters.
   */
  private buildRequestParams(messages: Message[], options: OpenAIOptions): ResponsesCreateParams {
    const params: ResponsesCreateParams = {
      model: options.model!,
      input: this.transformMessages(messages),
      stream: true,
      max_output_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
    };

    this.addOptionalParams(params, options);
    this.addToolParams(params, options);

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

      const event = StreamUtils.parseStreamEvent<ResponsesAPIStreamEvent>(data);
      if (!event) continue;

      const chunk = this.processEvent(event, state);
      if (chunk) yield chunk;
    }
  }

  /**
   * Transforms AIKit messages to OpenAI Responses API format.
   */
  private transformMessages(messages: Message[]): ResponsesAPIMessage[] {
    return messages.flatMap(msg => this.mapMessage(msg));
  }

  /**
   * Maps a single message to OpenAI format.
   */
  private mapMessage(msg: Message): ResponsesAPIMessage[] {
    switch (msg.role) {
      case 'system':
        return [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: MessageTransformer.extractTextContent(msg.content),
              },
            ],
          },
        ];
      case 'tool': {
        const { toolResults } = MessageTransformer.groupContentByType(msg.content);
        return toolResults.map(
          content =>
            ({
              type: 'function_call_output',
              call_id: content.toolCallId,
              output: content.result,
            }) as ResponsesAPIFunctionCallOutput
        );
      }
      case 'user':
        return [
          {
            role: 'user',
            content: this.buildContentParts(msg.content),
          },
        ];
      case 'assistant': {
        const messages: ResponsesAPIMessage[] = [];
        const textContent = MessageTransformer.extractTextContent(msg.content);
        if (textContent) {
          messages.push({
            role: 'assistant',
            content: [{ type: 'output_text', text: textContent }],
          });
        }
        if (msg.toolCalls) {
          msg.toolCalls.forEach(tc => {
            messages.push({
              type: 'function_call',
              call_id: tc.id,
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            } as ResponsesAPIFunctionCall);
          });
        }
        return messages;
      }
      default:
        return [];
    }
  }

  /**
   * Builds content parts for user messages.
   */
  private buildContentParts(content: Message['content']): ResponsesAPIContentPart[] {
    return content
      .map(c => {
        if (c.type === 'text') return { type: 'input_text' as const, text: c.text };
        if (c.type === 'image') return { type: 'input_image' as const, image_url: c.image };
        return null;
      })
      .filter(Boolean) as ResponsesAPIContentPart[];
  }

  /**
   * Adds optional parameters to the request.
   */
  private addOptionalParams(params: ResponsesCreateParams, options: OpenAIOptions) {
    const optionalFields = [
      'background',
      'include',
      'instructions',
      'metadata',
      'parallelToolCalls',
      'previousResponseId',
      'reasoning',
      'serviceTier',
      'store',
      'text',
      'truncation',
      'user',
    ] as const;

    optionalFields.forEach(field => {
      const value = options[field];
      if (value !== undefined) {
        const paramKey = this.getParamKey(field);
        (params as DynamicParams)[paramKey] = value;
      }
    });
  }

  /**
   * Adds tool-related parameters to the request.
   */
  private addToolParams(params: ResponsesCreateParams, options: OpenAIOptions) {
    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }
  }

  /**
   * Formats tools for OpenAI API.
   */
  private formatTools(tools: Tool[]): ResponsesAPITool[] {
    return tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Formats tool choice for OpenAI API.
   */
  private formatToolChoice(
    toolChoice: OpenAIOptions['toolChoice']
  ): 'auto' | 'required' | { type: 'function'; name: string } {
    if (!toolChoice) return 'auto';
    if (typeof toolChoice === 'object') {
      return { type: 'function', name: toolChoice.name };
    }
    return toolChoice === 'required' ? 'required' : 'auto';
  }

  /**
   * Gets the parameter key for optional fields.
   */
  private getParamKey(field: string): string {
    switch (field) {
      case 'parallelToolCalls':
        return 'parallel_tool_calls';
      case 'previousResponseId':
        return 'previous_response_id';
      case 'serviceTier':
        return 'service_tier';
      default:
        return field;
    }
  }

  /**
   * Processes a single stream event.
   */
  private processEvent(event: ResponsesAPIStreamEvent, state: StreamState): StreamChunk | null {
    switch (event.type) {
      case 'response.output_text.delta':
        return this.handleTextDelta(event, state);
      case 'response.output_item.added':
        return this.handleOutputItemAdded(event, state);
      case 'response.function_call_arguments.delta':
        return this.handleArgsDelta(event, state);
      case 'response.function_call_arguments.done':
        return this.handleArgsDone(event, state);
      case 'response.completed':
        return this.handleCompleted(event, state);
      default:
        return null;
    }
  }

  private handleTextDelta(event: TextDeltaEvent, state: StreamState): StreamChunk {
    state.content += event.delta;
    return MessageTransformer.createStreamChunk(
      state.content,
      event.delta,
      state.hasToolCalls ? Object.values(state.toolCalls) : undefined
    );
  }

  private handleOutputItemAdded(
    event: OutputItemAddedEvent,
    state: StreamState
  ): StreamChunk | null {
    if (event.item?.type === 'function_call') {
      const callId = event.item.call_id;
      state.toolCalls[callId] = {
        id: callId,
        name: event.item.name,
        arguments: {},
      };
      state.hasToolCalls = true;
      state.outputIndexToCallId[event.output_index] = callId;
      state.accumulatingArgs[callId] = '';

      return MessageTransformer.createStreamChunk(
        state.content,
        '',
        Object.values(state.toolCalls)
      );
    }
    return null;
  }

  private handleArgsDelta(event: ArgsDeltaEvent, state: StreamState): StreamChunk | null {
    const deltaCallId = event.call_id || state.outputIndexToCallId[event.output_index];
    if (deltaCallId && state.toolCalls[deltaCallId]) {
      if (!state.accumulatingArgs[deltaCallId]) {
        state.accumulatingArgs[deltaCallId] = '';
      }
      state.accumulatingArgs[deltaCallId] += event.delta;

      return MessageTransformer.createStreamChunk(
        state.content,
        '',
        Object.values(state.toolCalls)
      );
    }
    return null;
  }

  private handleArgsDone(event: ArgsDoneEvent, state: StreamState): StreamChunk | null {
    const doneCallId = event.call_id || state.outputIndexToCallId[event.output_index];
    const completedToolCall = doneCallId ? state.toolCalls[doneCallId] : undefined;

    if (completedToolCall && doneCallId) {
      const argsString = state.accumulatingArgs[doneCallId] || event.arguments || '{}';
      completedToolCall.arguments = MessageTransformer.parseJson(argsString, {});
      delete state.accumulatingArgs[doneCallId];

      return MessageTransformer.createStreamChunk(
        state.content,
        '',
        Object.values(state.toolCalls)
      );
    }
    return null;
  }

  private handleCompleted(event: CompletedEvent, state: StreamState): StreamChunk {
    const finishReason = state.hasToolCalls
      ? ('tool_use' as const)
      : this.mapFinishReason(event.response?.status || 'completed');

    return MessageTransformer.createStreamChunk(
      state.content,
      '',
      state.hasToolCalls ? Object.values(state.toolCalls) : undefined,
      finishReason
    );
  }

  private mapFinishReason(status: string): FinishReason {
    switch (status) {
      case 'completed':
        return 'stop';
      case 'incomplete':
      case 'max_tokens':
        return 'length';
      case 'failed_function_call':
      case 'tool_calls':
      case 'requires_action':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}

/**
 * Manages the state during stream processing.
 * Simplified version using composition pattern.
 */
class StreamState {
  content = '';
  toolCalls: Record<string, ToolCall> = {};
  accumulatingArgs: Record<string, string> = {};
  outputIndexToCallId: Record<number, string> = {};
  hasToolCalls = false;
}

// Type definitions for OpenAI Responses API
// @internal

type ResponsesCreateParams = {
  model: string;
  input: ResponsesAPIMessage[];
  stream: true;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  tools?: ResponsesAPITool[];
  tool_choice?: 'auto' | 'required' | { type: 'function'; name: string };
  background?: boolean;
  include?: string[];
  instructions?: string;
  metadata?: Record<string, string>;
  parallel_tool_calls?: boolean;
  previous_response_id?: string;
  reasoning?: { effort?: 'low' | 'medium' | 'high' };
  service_tier?: 'auto' | 'default' | 'flex';
  store?: boolean;
  text?: {
    format?: {
      type: 'text' | 'json_object' | 'json_schema';
      json_schema?: Record<string, unknown>;
    };
  };
  truncation?: 'auto' | 'disabled';
  user?: string;
};

type ResponsesAPIMessage =
  | { role: 'system' | 'user' | 'assistant'; content: ResponsesAPIContentPart[] }
  | ResponsesAPIFunctionCall
  | ResponsesAPIFunctionCallOutput;

type ResponsesAPIFunctionCall = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};

type ResponsesAPIFunctionCallOutput = {
  type: 'function_call_output';
  call_id: string;
  output: string;
};

type ResponsesAPIContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'output_text'; text: string }
  | { type: 'function_call'; call_id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'function_call_output'; call_id: string; output: string };

type ResponsesAPITool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

type ResponsesAPIStreamEvent =
  | { type: 'response.output_text.delta'; delta: string }
  | {
      type: 'response.output_item.added';
      response_id: string;
      output_index: number;
      item: {
        type: 'function_call';
        id: string;
        call_id: string;
        name: string;
        arguments: string;
      };
    }
  | {
      type: 'response.function_call_arguments.delta';
      response_id: string;
      item_id: string;
      output_index: number;
      call_id: string;
      delta: string;
    }
  | {
      type: 'response.function_call_arguments.done';
      response_id: string;
      item_id: string;
      output_index: number;
      call_id: string;
      arguments: string;
    }
  | {
      type: 'response.completed';
      response: { status: string };
    };
