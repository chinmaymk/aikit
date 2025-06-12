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
 * This class translates AIKit's generic requests into OpenAI's specific dialect
 * and handles the response, whether it's a stream of tokens or a tool call.
 * It's like a universal translator, but for AI.
 *
 * @group Providers
 */
export class OpenAIProvider implements AIProvider {
  private client: APIClient;
  private transformer: OpenAIMessageTransformer;
  private streamProcessor: OpenAIStreamProcessor;

  /**
   * A list of models that this provider officially supports.
   * It's not exhaustive, but it's a good starting point.
   * Feel free to try other models, but no promises.
   */
  readonly models = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ];

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
    this.transformer = new OpenAIMessageTransformer();
    this.streamProcessor = new OpenAIStreamProcessor();
  }

  /**
   * Kicks off the generation process.
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
    const stream = await this.client.stream('/chat/completions', params);
    const lineStream = this.client.processStreamAsLines(stream);
    yield* this.streamProcessor.processStream(lineStream);
  }
}

/**
 * A dedicated class for transforming messages and options into the format
 * OpenAI expects. It's the meticulous diplomat of the provider.
 * @internal
 */
class OpenAIMessageTransformer {
  /**
   * Constructs the complete request payload for the OpenAI API.
   * @param messages - The AIKit messages.
   * @param options - The AIKit generation options.
   * @returns A payload that will make OpenAI happy.
   */
  buildRequestParams(
    messages: Message[],
    options: OpenAIGenerationOptions
  ): ChatCompletionCreateParamsStreaming {
    const openaiMessages = this.transformMessages(messages);
    const params: ChatCompletionCreateParamsStreaming = {
      model: options.model,
      messages: openaiMessages,
      stream: true,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stop: options.stopSequences,
      presence_penalty: options.presencePenalty,
      frequency_penalty: options.frequencyPenalty,
    };

    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  /**
   * Formats AIKit tools into the structure OpenAI expects.
   * @param tools - An array of AIKit tools.
   * @returns An array of tools formatted for OpenAI.
   */
  private formatTools(tools: Tool[]): OpenAIFunctionTool[] {
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
   * @param toolChoice - The AIKit tool choice option.
   * @returns A tool choice option that OpenAI can understand.
   */
  private formatToolChoice(
    toolChoice: OpenAIGenerationOptions['toolChoice']
  ): 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } } {
    if (!toolChoice) {
      return 'auto';
    }
    if (typeof toolChoice === 'object') {
      return { type: 'function', function: { name: toolChoice.name } };
    }
    return toolChoice;
  }

  /**
   * Transforms an array of AIKit messages into OpenAI's format.
   * It's a bit like translating from English to American English.
   * @param messages - The messages to transform.
   * @returns An array of OpenAI-compatible messages.
   */
  private transformMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.flatMap(msg => this.mapMessage(msg));
  }

  /**
   * Converts one of our internal `Message` objects into one or more OpenAI
   * `ChatCompletionMessageParam` records. Always returns an array so callers
   * can safely `flatMap` the result without having to deal with `null` or
   * `undefined` values.
   *
   * It's the workhorse of message transformation.
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
        // We should never get here, but if we do, we'll just ignore it.
        return [];
    }
  }

  /**
   * Builds the content parts for a message, handling both text and images.
   * @param content - The content array from an AIKit message.
   * @returns An array of content parts for an OpenAI message.
   */
  private buildContentParts(content: Message['content']): ChatCompletionContentPart[] {
    const parts = content
      .map(c => {
        if (c.type === 'text') {
          return { type: 'text' as const, text: c.text };
        }
        if (c.type === 'image') {
          return { type: 'image_url' as const, image_url: { url: c.image } };
        }
        return null;
      })
      .filter(Boolean);

    // It's safe to cast here because we've filtered out the nulls.
    return parts as ChatCompletionContentPart[];
  }
}

/**
 * A processor that handles the incoming stream of data from OpenAI.
 * It parses the server-sent events, extracts the relevant data, and
 * reconstructs the response, including tool calls.
 *
 * It's the archaeologist of the provider, carefully piecing together
 * the fragments of the response.
 * @internal
 */
class OpenAIStreamProcessor {
  /**
   * Processes the raw line stream from the API and yields structured chunks.
   * @param lineStream - An async iterable of raw data lines.
   * @returns An async iterable of AIKit stream chunks.
   */
  async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    // A temporary home for tool calls as they're being assembled from chunks.
    const toolCallStates: Record<string, ToolCallState> = {};
    // A final resting place for tool calls that have been fully assembled.
    const completedToolCalls: Record<string, ToolCall> = {};

    for await (const data of extractDataLines(lineStream)) {
      if (data.trim() === '[DONE]') {
        // The stream is done, but we need to make sure we've yielded any
        // completed tool calls that were finalized in the last chunk.
        const finalCalls = Object.values(completedToolCalls).filter(
          tc => tc.id && tc.name && tc.arguments
        );
        if (finalCalls.length > 0) {
          yield {
            content,
            delta: '',
            toolCalls: finalCalls,
          };
        }
        return;
      }

      try {
        const chunk: ChatCompletionChunk = JSON.parse(data);
        if (!chunk.choices || chunk.choices.length === 0) {
          continue;
        }

        const choice = chunk.choices[0];
        const delta = choice.delta?.content || '';
        content += delta;

        this.processToolCallDeltas(
          choice.delta?.tool_calls ?? [],
          toolCallStates,
          completedToolCalls
        );

        const finishReason = choice.finish_reason
          ? this.mapFinishReason(choice.finish_reason)
          : undefined;

        const completedCalls = Object.values(completedToolCalls);
        yield {
          content,
          delta,
          finishReason,
          toolCalls: completedCalls.length > 0 ? completedCalls : undefined,
        };
      } catch {
        // We might get an error here if the JSON is malformed.
        // If so, we'll just skip this line and hope for the best.
        // It's a risky business, this streaming stuff.
        continue;
      }
    }
  }

  /**
   * Maps the finish reason from OpenAI's vocabulary to our own.
   * @param reason - The reason from OpenAI.
   * @returns The corresponding AIKit finish reason.
   */
  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'tool_use' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_use';
      default:
        // If we don't know the reason, we'll just assume it was a normal stop.
        return 'stop';
    }
  }

  /**
   * Processes the tool call deltas from a stream chunk.
   * This is where the magic happens for reconstructing tool calls from a stream.
   * It's a bit like building a ship in a bottle.
   *
   * @param deltaToolCalls - The tool call deltas from the chunk.
   * @param toolCallStates - The current state of partially built tool calls.
   * @param completedToolCalls - The collection of fully built tool calls.
   */
  private processToolCallDeltas(
    deltaToolCalls: OpenAIToolCallDelta[],
    toolCallStates: Record<string, ToolCallState>,
    completedToolCalls: Record<string, ToolCall>
  ): void {
    // Keep track of tool call indices to IDs
    const indexToId: Record<number, string> = {};

    // Build the index mapping from existing states
    Object.values(toolCallStates).forEach((state, idx) => {
      if (state.id) {
        indexToId[idx] = state.id;
      }
    });

    for (const delta of deltaToolCalls) {
      const index = delta.index ?? 0;
      let id = delta.id;

      // If no ID is provided, use the existing ID for this index
      if (!id && indexToId[index]) {
        id = indexToId[index];
      }

      // Skip if we still don't have an ID
      if (!id) continue;

      // Update the index mapping
      indexToId[index] = id;

      // Initialize the state for this tool call if we haven't seen it before.
      if (!toolCallStates[id]) {
        toolCallStates[id] = { id, name: '', arguments: '' };
      }
      const state = toolCallStates[id];

      // Append the new parts of the tool call to its state.
      if (delta.function?.name) {
        state.name += delta.function.name;
      }
      if (delta.function?.arguments) {
        state.arguments += delta.function.arguments;
      }
    }

    // Check all tool call states for completion after processing all deltas
    // This handles cases where malformed JSON becomes valid after additional chunks
    for (const [id, state] of Object.entries(toolCallStates)) {
      if (completedToolCalls[id]) {
        // Already completed, skip
        continue;
      }

      try {
        const parsedArgs = JSON.parse(state.arguments);
        if (state.id && state.name && typeof parsedArgs === 'object') {
          completedToolCalls[state.id] = {
            id: state.id,
            name: state.name,
            arguments: parsedArgs,
          };
        }
      } catch {
        // The arguments are not yet valid JSON, so we'll wait for more chunks.
        // It's like waiting for a download to finish.
      }
    }
  }
}

/** A temporary state for assembling a tool call from a stream. @internal */
type ToolCallState = {
  id: string;
  name: string;
  arguments: string;
};

// These are the internal types that mirror the OpenAI API.
// They are not exposed to the user, but they are essential for
// the provider to function correctly. They are defined here
// to avoid adding the entire OpenAI SDK as a dependency.
// It's our own little, self-contained universe.
// @internal

/** @internal */
type ChatCompletionMessageParam = {
  role: 'system' | 'user' | 'assistant' | 'tool';
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

/** @internal */
type ChatCompletionContentPart = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

/** @internal */
type OpenAIFunctionTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** @internal */
type ChatCompletionCreateParamsStreaming = {
  model: string;
  messages: ChatCompletionMessageParam[];
  stream: true;
  max_tokens?: number | null;
  temperature?: number | null;
  top_p?: number | null;
  stop?: string[] | null;
  presence_penalty?: number | null;
  frequency_penalty?: number | null;
  tools?: OpenAIFunctionTool[] | null;
  tool_choice?:
    | 'none'
    | 'auto'
    | 'required'
    | { type: 'function'; function: { name: string } }
    | null;
};

/** @internal */
type ChatCompletionChunk = {
  choices: {
    delta: {
      content?: string | null;
      tool_calls?: OpenAIToolCallDelta[];
    };
    finish_reason?: string | null;
  }[];
};

/** @internal */
interface OpenAIToolCallDelta {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
  type?: 'function';
}
