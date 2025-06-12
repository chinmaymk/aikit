import type {
  AIProvider,
  Message,
  OpenAIConfig,
  OpenAIGenerationOptions,
  StreamChunk,
  Tool,
  ToolCall,
} from '../types';
import { MessageTransformer } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

/**
 * The powerhouse behind OpenAI integration.
 * This class translates AIKit's generic requests into OpenAI's Responses API dialect
 * and handles the response, whether it's a stream of tokens or a tool call.
 * It's like a universal translator, but for AI - now with improved state management.
 *
 * @group Providers
 */
export class OpenAIProvider implements AIProvider {
  private client: APIClient;
  private transformer: OpenAIResponseTransformer;
  private streamProcessor: OpenAIResponseStreamProcessor;

  /**
   * Sets up the OpenAI provider with your configuration.
   * @param config - Your OpenAI API credentials and settings.
   */
  constructor(config: OpenAIConfig) {
    const {
      apiKey,
      baseURL = 'https://api.openai.com/v1',
      organization,
      project,
      timeout,
      maxRetries,
    } = config;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (organization) {
      headers['OpenAI-Organization'] = organization;
    }
    if (project) {
      headers['OpenAI-Project'] = project;
    }

    this.client = new APIClient(baseURL, headers, timeout, maxRetries);
    this.transformer = new OpenAIResponseTransformer();
    this.streamProcessor = new OpenAIResponseStreamProcessor();
  }

  /**
   * Kicks off the generation process using the Responses API.
   * It builds the request, sends it to OpenAI, and then processes the
   * response stream, yielding chunks as they come in.
   * @param messages - The conversation history.
   * @param options - The generation options.
   * @returns An async iterable of stream chunks.
   */
  async *generate(
    messages: Message[],
    options: OpenAIGenerationOptions
  ): AsyncIterable<StreamChunk> {
    const params = this.transformer.buildRequestParams(messages, options);
    const stream = await this.client.stream('/responses', params);
    const lineStream = this.client.processStreamAsLines(stream);
    yield* this.streamProcessor.processStream(lineStream);
  }
}

/**
 * A dedicated class for transforming messages and options into the format
 * the OpenAI Responses API expects. It's the meticulous diplomat of the provider.
 * @internal
 */
class OpenAIResponseTransformer {
  /**
   * Constructs the complete request payload for the OpenAI Responses API.
   * @param messages - The AIKit messages.
   * @param options - The AIKit generation options.
   * @returns A payload that will make the Responses API happy.
   */
  buildRequestParams(messages: Message[], options: OpenAIGenerationOptions): ResponsesCreateParams {
    const input = this.transformMessages(messages);
    const params: ResponsesCreateParams = {
      model: options.model,
      input,
      stream: true,
      max_output_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
    };

    // Add optional parameters if provided
    if (options.background !== undefined) params.background = options.background;
    if (options.include) params.include = options.include;
    if (options.instructions) params.instructions = options.instructions;
    if (options.metadata) params.metadata = options.metadata;
    if (options.parallelToolCalls !== undefined)
      params.parallel_tool_calls = options.parallelToolCalls;
    if (options.previousResponseId) params.previous_response_id = options.previousResponseId;
    if (options.reasoning) params.reasoning = options.reasoning;
    if (options.serviceTier) params.service_tier = options.serviceTier;
    if (options.store !== undefined) params.store = options.store;
    if (options.text) params.text = options.text;
    if (options.truncation) params.truncation = options.truncation;
    if (options.user) params.user = options.user;

    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  /**
   * Formats AIKit tools into the structure the Responses API expects.
   * @param tools - An array of AIKit tools.
   * @returns An array of tools formatted for the Responses API.
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
   * Formats the tool choice option for the Responses API.
   * @param toolChoice - The AIKit tool choice option.
   * @returns A tool choice option that the Responses API can understand.
   */
  private formatToolChoice(
    toolChoice: OpenAIGenerationOptions['toolChoice']
  ): 'auto' | 'required' | { type: 'function'; name: string } {
    if (!toolChoice) {
      return 'auto';
    }
    if (typeof toolChoice === 'object') {
      // Support specific tool selection
      return { type: 'function', name: toolChoice.name };
    }
    // The Responses API doesn't support 'none' for tool_choice
    return toolChoice === 'required' ? 'required' : 'auto';
  }

  /**
   * Transforms an array of AIKit messages into the Responses API input format.
   * The Responses API accepts messages in a similar format but with some differences.
   * @param messages - The messages to transform.
   * @returns An array of Responses API-compatible input messages.
   */
  private transformMessages(messages: Message[]): ResponsesAPIMessage[] {
    return messages.flatMap(msg => this.mapMessage(msg));
  }

  /**
   * Converts one of our internal `Message` objects into one or more Responses API
   * message objects. Always returns an array so callers can safely `flatMap`.
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

        // Add text content if present
        const textContent = MessageTransformer.extractTextContent(msg.content);
        if (textContent) {
          messages.push({
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: textContent,
              },
            ],
          });
        }

        // Add tool calls as separate input items (not as assistant message content)
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
   * Builds the content parts for a message, handling both text and images.
   * @param content - The content array from an AIKit message.
   * @returns An array of content parts for a Responses API message.
   */
  private buildContentParts(content: Message['content']): ResponsesAPIContentPart[] {
    const parts = content
      .map(c => {
        if (c.type === 'text') {
          return { type: 'input_text' as const, text: c.text };
        }
        if (c.type === 'image') {
          return { type: 'input_image' as const, image_url: c.image };
        }
        return null;
      })
      .filter(Boolean);

    return parts as ResponsesAPIContentPart[];
  }
}

/**
 * A processor that handles the incoming stream of data from the Responses API.
 * It parses the server-sent events, extracts the relevant data, and
 * reconstructs the response, including tool calls.
 * @internal
 */
class OpenAIResponseStreamProcessor {
  /**
   * Processes the raw line stream from the Responses API and yields structured chunks.
   * @param lineStream - An async iterable of raw data lines.
   * @returns An async iterable of AIKit stream chunks.
   */
  async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCalls: Record<string, ToolCall> = {}; // Track by call_id
    const accumulatingArgs: Record<string, string> = {}; // Accumulate arguments by call_id
    const outputIndexToCallId: Record<number, string> = {}; // Map output_index to call_id
    let hasToolCalls = false;

    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') {
        return;
      }

      try {
        const event: ResponsesAPIStreamEvent = JSON.parse(data);

        switch (event.type) {
          case 'response.output_text.delta':
            content += event.delta;
            yield {
              content,
              delta: event.delta,
              toolCalls: hasToolCalls ? Object.values(toolCalls) : undefined,
            };
            break;

          case 'response.output_item.added':
            // Handle function calls when they are added as output items
            if (event.item && event.item.type === 'function_call') {
              const callId = event.item.call_id;
              toolCalls[callId] = {
                id: callId, // Use call_id as the id for AIKit compatibility
                name: event.item.name,
                arguments: {}, // Will be populated by argument events
              };
              hasToolCalls = true;
              // Map output_index to call_id for argument delta events
              outputIndexToCallId[event.output_index] = callId;
              // Initialize arguments accumulator for this call
              accumulatingArgs[callId] = '';

              // Yield immediately when tool call is detected
              yield {
                content,
                delta: '',
                toolCalls: Object.values(toolCalls),
              };
            }
            break;

          case 'response.function_call_arguments.delta': {
            // Accumulate function call arguments using call_id
            const deltaCallId = event.call_id || outputIndexToCallId[event.output_index];
            if (deltaCallId && toolCalls[deltaCallId]) {
              if (!accumulatingArgs[deltaCallId]) {
                accumulatingArgs[deltaCallId] = '';
              }
              accumulatingArgs[deltaCallId] += event.delta;

              // Yield progress with partially accumulated args
              yield {
                content,
                delta: '',
                toolCalls: Object.values(toolCalls),
              };
            }
            break;
          }

          case 'response.function_call_arguments.done': {
            // Parse the accumulated arguments and update the tool call
            const doneCallId = event.call_id || outputIndexToCallId[event.output_index];
            const completedToolCall = doneCallId ? toolCalls[doneCallId] : undefined;
            if (completedToolCall && doneCallId) {
              const argsString = accumulatingArgs[doneCallId] || event.arguments || '{}';
              try {
                completedToolCall.arguments = JSON.parse(argsString);
                // Clean up the accumulation
                delete accumulatingArgs[doneCallId];
                yield {
                  content,
                  delta: '',
                  toolCalls: Object.values(toolCalls),
                };
              } catch {
                // If parsing fails, keep as empty object
                completedToolCall.arguments = {};
                delete accumulatingArgs[doneCallId];
                yield {
                  content,
                  delta: '',
                  toolCalls: Object.values(toolCalls),
                };
              }
            }
            break;
          }

          case 'response.completed': {
            // Determine finish reason based on response status and presence of tool calls
            let finishReason: 'stop' | 'length' | 'tool_use';

            if (hasToolCalls) {
              finishReason = 'tool_use';
            } else {
              finishReason = this.mapFinishReason(event.response?.status || 'completed');
            }

            yield {
              content,
              delta: '',
              finishReason,
              toolCalls: hasToolCalls ? Object.values(toolCalls) : undefined,
            };
            break;
          }
        }
      } catch (error) {
        // Skip malformed JSON lines but log for debugging
        console.warn('Failed to parse OpenAI stream event:', error);
        continue;
      }
    }
  }

  /**
   * Maps the finish reason from the Responses API to our vocabulary.
   * @param status - The status from the Responses API.
   * @returns The corresponding AIKit finish reason.
   */
  private mapFinishReason(status: string): 'stop' | 'length' | 'tool_use' {
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

// These are the internal types that mirror the OpenAI Responses API.
// They are not exposed to the user, but they are essential for
// the provider to function correctly.
// @internal

/** @internal */
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
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
  };
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

/** @internal */
type ResponsesAPIMessage =
  | {
      role: 'system' | 'user' | 'assistant';
      content: ResponsesAPIContentPart[];
    }
  | ResponsesAPIFunctionCall
  | ResponsesAPIFunctionCallOutput;

/** @internal */
type ResponsesAPIFunctionCall = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};

/** @internal */
type ResponsesAPIFunctionCallOutput = {
  type: 'function_call_output';
  call_id: string;
  output: string;
};

/** @internal */
type ResponsesAPIContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'output_text'; text: string }
  | { type: 'function_call'; call_id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'function_call_output'; call_id: string; output: string };

/** @internal */
type ResponsesAPITool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/** @internal */
type ResponsesAPIStreamEvent =
  | {
      type: 'response.output_text.delta';
      delta: string;
    }
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
      response: {
        status: string;
      };
    };
