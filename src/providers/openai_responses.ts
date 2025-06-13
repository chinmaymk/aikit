import type {
  Message,
  StreamChunk,
  FinishReason,
  Tool,
  ToolCall,
  OpenAIResponsesOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';
import { MessageTransformer, StreamUtils } from './utils';
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
 * Creates an OpenAI Responses API generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const openaiResponses = createOpenAIResponses({ apiKey: '...', model: 'gpt-4o' });
 *
 * // Use like any function
 * const result = await collectDeltas(openaiResponses([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(openaiResponses([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createOpenAIResponses(
  config: WithApiKey<OpenAIResponsesOptions>
): StreamingGenerateFunction<Partial<OpenAIResponsesOptions>> {
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

  return async function* openaiResponses(
    messages: Message[],
    options: Partial<OpenAIResponsesOptions> = {}
  ) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const params = buildRequestParams(messages, mergedOptions);
    const stream = await client.stream('/responses', params);
    const lineStream = client.processStreamAsLines(stream);
    yield* processStream(lineStream);
  };
}

/**
 * Direct OpenAI Responses function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   openaiResponses({ apiKey: '...', model: 'gpt-4o' }, [userText('Hello')])
 * );
 * ```
 */
export async function* openaiResponses(
  config: WithApiKey<OpenAIResponsesOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createOpenAIResponses(config);
  yield* provider(messages);
}

/**
 * Builds request parameters for the OpenAI Responses API.
 * Handles message transformation, tool formatting, and optional parameters.
 */
function buildRequestParams(
  messages: Message[],
  options: OpenAIResponsesOptions
): ResponsesCreateParams {
  const params: ResponsesCreateParams = {
    model: options.model!,
    input: transformMessages(messages),
    stream: true,
    max_output_tokens: options.maxOutputTokens,
    temperature: options.temperature,
    top_p: options.topP,
  };

  addOptionalParams(params, options);
  addToolParams(params, options);

  return params;
}

/**
 * Processes the stream of responses from OpenAI.
 * Manages state and yields properly formatted chunks.
 */
async function* processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
  const state = new StreamState();

  for await (const data of extractDataLines(lineStream)) {
    if (data.trim() === '[DONE]') return;

    const event = StreamUtils.parseStreamEvent<ResponsesAPIStreamEvent>(data);
    if (!event) continue;

    const chunk = processEvent(event, state);
    if (chunk) yield chunk;
  }
}

/**
 * Transforms AIKit messages to OpenAI Responses API format.
 */
function transformMessages(messages: Message[]): ResponsesAPIMessage[] {
  return messages.flatMap(msg => mapMessage(msg));
}

/**
 * Maps a single message to OpenAI format.
 */
function mapMessage(msg: Message): ResponsesAPIMessage[] {
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
          content: buildContentParts(msg.content),
        },
      ];
    case 'assistant':
      if (msg.toolCalls?.length) {
        return msg.toolCalls.map(
          toolCall =>
            ({
              type: 'function_call',
              call_id: toolCall.id,
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments),
            }) as ResponsesAPIFunctionCall
        );
      }
      return [
        {
          role: 'assistant',
          content: buildContentParts(msg.content),
        },
      ];
    default:
      return [];
  }
}

/**
 * Builds content parts for user/assistant messages.
 */
function buildContentParts(content: Message['content']): ResponsesAPIContentPart[] {
  const parts: ResponsesAPIContentPart[] = [];
  for (const item of content) {
    switch (item.type) {
      case 'text':
        parts.push({ type: 'input_text', text: item.text });
        break;
      case 'image':
        parts.push({ type: 'input_image', image_url: item.image });
        break;
      default:
        // Skip unsupported content types silently
        break;
    }
  }
  return parts;
}

function addOptionalParams(params: ResponsesCreateParams, options: OpenAIResponsesOptions) {
  if (options.background !== undefined) params.background = options.background;
  if (options.include !== undefined) params.include = options.include;
  if (options.instructions !== undefined) params.instructions = options.instructions;
  if (options.metadata !== undefined) params.metadata = options.metadata;
  if (options.parallelToolCalls !== undefined)
    params.parallel_tool_calls = options.parallelToolCalls;
  if (options.previousResponseId !== undefined)
    params.previous_response_id = options.previousResponseId;
  if (options.reasoning !== undefined) params.reasoning = options.reasoning;
  if (options.serviceTier !== undefined) params.service_tier = options.serviceTier;
  if (options.store !== undefined) params.store = options.store;
  if (options.text !== undefined) params.text = options.text;
  if (options.truncation !== undefined) params.truncation = options.truncation;
  if (options.user !== undefined) params.user = options.user;
}

function addToolParams(params: ResponsesCreateParams, options: OpenAIResponsesOptions) {
  if (options.tools?.length) {
    params.tools = formatTools(options.tools);
    if (options.toolChoice) {
      params.tool_choice = formatToolChoice(options.toolChoice);
    }
  }
}

function formatTools(tools: Tool[]): ResponsesAPITool[] {
  return tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

function formatToolChoice(
  toolChoice: OpenAIResponsesOptions['toolChoice']
): 'auto' | 'required' | { type: 'function'; name: string } {
  if (!toolChoice) return 'auto';
  if (typeof toolChoice === 'string') {
    return toolChoice === 'none' ? 'auto' : toolChoice;
  }
  return { type: 'function', name: toolChoice.name };
}

function processEvent(event: ResponsesAPIStreamEvent, state: StreamState): StreamChunk | null {
  switch (event.type) {
    case 'response.output_text.delta':
      return handleTextDelta(event, state);
    case 'response.output_item.added':
      return handleOutputItemAdded(event, state);
    case 'response.function_call_arguments.delta':
      return handleArgsDelta(event, state);
    case 'response.function_call_arguments.done':
      return handleArgsDone(event, state);
    case 'response.completed':
      return handleCompleted(event, state);
    default:
      return null;
  }
}

function handleTextDelta(event: TextDeltaEvent, state: StreamState): StreamChunk {
  state.content += event.delta;
  return {
    delta: event.delta,
    content: state.content,
    finishReason: undefined,
    toolCalls: state.hasToolCalls ? Object.values(state.toolCalls) : undefined,
  };
}

function handleOutputItemAdded(
  event: OutputItemAddedEvent,
  state: StreamState
): StreamChunk | null {
  if (event.item?.type === 'function_call') {
    state.hasToolCalls = true;
    const callId = event.item.call_id;
    state.outputIndexToCallId[event.output_index] = callId;
    state.toolCalls[callId] = {
      id: callId,
      name: event.item.name,
      arguments: {},
    };
    state.accumulatingArgs[callId] = '';

    return {
      delta: '',
      content: state.content,
      finishReason: undefined,
      toolCalls: Object.values(state.toolCalls),
    };
  }
  return null;
}

function handleArgsDelta(event: ArgsDeltaEvent, state: StreamState): StreamChunk | null {
  const callId = event.call_id || state.outputIndexToCallId[event.output_index];
  if (!callId || !state.toolCalls[callId]) return null;

  state.accumulatingArgs[callId] += event.delta;

  return {
    delta: '',
    content: state.content,
    finishReason: undefined,
    toolCalls: Object.values(state.toolCalls),
  };
}

function handleArgsDone(event: ArgsDoneEvent, state: StreamState): StreamChunk | null {
  const callId = event.call_id || state.outputIndexToCallId[event.output_index];
  if (!callId || !state.toolCalls[callId]) return null;

  try {
    const argsString = event.arguments || state.accumulatingArgs[callId] || '{}';
    state.toolCalls[callId].arguments = JSON.parse(argsString);
  } catch {
    state.toolCalls[callId].arguments = {};
  }

  return {
    delta: '',
    content: state.content,
    finishReason: undefined,
    toolCalls: Object.values(state.toolCalls),
  };
}

function handleCompleted(event: CompletedEvent, state: StreamState): StreamChunk {
  const finishReason = mapFinishReason(event.response?.status || 'completed');
  return {
    delta: '',
    content: state.content,
    finishReason,
    toolCalls: state.hasToolCalls ? Object.values(state.toolCalls) : undefined,
  };
}

function mapFinishReason(status: string): FinishReason {
  switch (status) {
    case 'completed':
      return 'stop';
    case 'incomplete':
      return 'length';
    case 'failed':
      return 'error';
    case 'tool_calls_required':
      return 'tool_use';
    default:
      return 'stop';
  }
}

class StreamState {
  content = '';
  toolCalls: Record<string, ToolCall> = {};
  accumulatingArgs: Record<string, string> = {};
  outputIndexToCallId: Record<number, string> = {};
  hasToolCalls = false;
}

// Type definitions
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
