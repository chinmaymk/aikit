import type {
  AIProvider,
  Message,
  OpenAIConfig,
  GenerationOptions,
  StreamChunk,
  Tool,
  ToolCall,
} from '../types';
import { MessageTransformer } from './utils';
import { StreamingAPIClient } from './api';

export class OpenAIProvider implements AIProvider {
  private client: StreamingAPIClient;
  private transformer: OpenAIMessageTransformer;
  private streamProcessor: OpenAIStreamProcessor;

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

    this.client = new StreamingAPIClient(baseURL, headers, timeout, maxRetries);
    this.transformer = new OpenAIMessageTransformer();
    this.streamProcessor = new OpenAIStreamProcessor();
  }

  async *generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk> {
    const params = this.transformer.buildRequestParams(messages, options);
    const stream = await this.client.stream('/chat/completions', params);
    const lineStream = this.client.processStreamAsLines(stream);
    yield* this.streamProcessor.processStream(lineStream);
  }
}

class OpenAIMessageTransformer {
  buildRequestParams(
    messages: Message[],
    options: GenerationOptions
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
    };

    if (options.tools) {
      params.tools = this.formatTools(options.tools);
      if (options.toolChoice) {
        params.tool_choice = this.formatToolChoice(options.toolChoice);
      }
    }

    return params;
  }

  private formatTools(tools: Tool[]): any[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private formatToolChoice(
    toolChoice: GenerationOptions['toolChoice']
  ): 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } } {
    if (!toolChoice) {
      return 'auto';
    }
    if (typeof toolChoice === 'object') {
      return { type: 'function', function: { name: toolChoice.name } };
    }
    return toolChoice;
  }

  private transformMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.flatMap(msg => this.mapMessage(msg));
  }

  /**
   * Convert one of our internal `Message` objects into one or more OpenAI
   * `ChatCompletionMessageParam` records. Always returns an array so callers
   * can safely `flatMap` the result without having to deal with `null` or
   * `undefined` values.
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
        return [];
    }
  }

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

    return parts as ChatCompletionContentPart[];
  }
}

class OpenAIStreamProcessor {
  async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, ToolCallState> = {};
    const completedToolCalls: Record<string, ToolCall> = {};

    for await (const line of lineStream) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const data = line.substring(6);
      if (data.trim() === '[DONE]') {
        return;
      }

      try {
        const chunk: ChatCompletionChunk = JSON.parse(data);
        if (!chunk.choices || chunk.choices.length === 0) {
          // Skip chunks that don't contain any choices
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
      } catch (error) {
        console.error('Error parsing stream chunk:', error);
      }
    }
  }

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'tool_use' {
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

  private processToolCallDeltas(
    deltaToolCalls: OpenAIToolCallDelta[],
    toolCallStates: Record<string, ToolCallState>,
    completedToolCalls: Record<string, ToolCall>
  ): void {
    if (deltaToolCalls.length === 0) return;

    for (const tc of deltaToolCalls) {
      if (typeof tc.index !== 'number') continue;
      const key = tc.index.toString();

      if (!toolCallStates[key]) {
        toolCallStates[key] = { id: tc.id || '', name: '', arguments: '' };
      }

      const state = toolCallStates[key];
      if (tc.id) state.id = tc.id;
      if (tc.function?.name) state.name += tc.function.name;
      if (tc.function?.arguments) state.arguments += tc.function.arguments;

      if (completedToolCalls[key]) continue;

      try {
        const parsedArgs = JSON.parse(state.arguments);
        completedToolCalls[key] = {
          id: state.id,
          name: state.name,
          arguments: parsedArgs,
        };
      } catch (e) {
        // Arguments are not yet a complete JSON object
      }
    }
  }
}

// #region OpenAI Types
type ToolCallState = {
  id: string;
  name: string;
  arguments: string;
};

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

type ChatCompletionContentPart = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

type ChatCompletionCreateParamsStreaming = {
  model: string;
  messages: ChatCompletionMessageParam[];
  stream: true;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
  tools?: any[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
};

type ChatCompletionChunk = {
  choices: {
    delta: {
      content?: string | null;
      tool_calls?: OpenAIToolCallDelta[];
    };
    finish_reason?: string | null;
  }[];
};

interface OpenAIToolCallDelta {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}
// #endregion
