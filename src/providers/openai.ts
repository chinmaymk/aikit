import { OpenAI } from 'openai';
import type { AIProvider, Message, OpenAIConfig, GenerationOptions, StreamChunk } from '../types';
import { MessageTransformer, ToolFormatter, ToolChoiceHandler, FinishReasonMapper } from './utils';

export class OpenAIProvider implements AIProvider {
  private openai: OpenAI;
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
    this.openai = new OpenAI(config);
  }

  async *generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk> {
    const openaiMessages = this.transformMessages(messages);
    const params = this.buildRequestParams(openaiMessages, options);

    const stream = await this.openai.chat.completions.create(params);
    yield* this.processStream(stream);
  }

  private transformMessages(
    messages: Message[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    for (const msg of messages) {
      const transformed = this.transformMessage(msg);
      if (transformed) {
        if (Array.isArray(transformed)) {
          result.push(...transformed);
        } else {
          result.push(transformed);
        }
      }
    }

    return result;
  }

  private transformMessage(
    msg: Message
  ):
    | OpenAI.Chat.Completions.ChatCompletionMessageParam
    | OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    | null {
    switch (msg.role) {
      case 'system':
        return this.transformSystemMessage(msg);
      case 'tool':
        return this.transformToolMessage(msg);
      case 'user':
        return this.transformUserMessage(msg);
      case 'assistant':
        return this.transformAssistantMessage(msg);
      default:
        return null;
    }
  }

  private transformSystemMessage(
    msg: Message
  ): OpenAI.Chat.Completions.ChatCompletionSystemMessageParam {
    return {
      role: 'system',
      content: MessageTransformer.extractTextContent(msg.content),
    };
  }

  private transformToolMessage(
    msg: Message
  ): OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map(content => ({
      role: 'tool',
      tool_call_id: content.toolCallId,
      content: content.result,
    }));
  }

  private transformUserMessage(
    msg: Message
  ): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
    const contentParts = this.buildContentParts(msg.content);
    return {
      role: 'user',
      content:
        contentParts.length === 1 && contentParts[0].type === 'text'
          ? contentParts[0].text
          : contentParts,
    };
  }

  private transformAssistantMessage(
    msg: Message
  ): OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam {
    const contentParts = this.buildContentParts(msg.content);
    const message: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
      role: 'assistant',
      content:
        contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : null,
    };

    if (msg.toolCalls) {
      message.tool_calls = msg.toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));
    }

    return message;
  }

  private buildContentParts(
    content: Message['content']
  ): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
    return content
      .map(c => {
        if (c.type === 'text') {
          return { type: 'text', text: c.text };
        }
        if (c.type === 'image') {
          return { type: 'image_url', image_url: { url: c.image } };
        }
        return null;
      })
      .filter(Boolean) as OpenAI.Chat.Completions.ChatCompletionContentPart[];
  }

  private buildRequestParams(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: GenerationOptions
  ): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model: options.model,
      messages,
      stream: true,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stop: options.stopSequences,
    };

    if (options.tools) {
      params.tools = ToolFormatter.formatForOpenAI(options.tools);
      if (options.toolChoice) {
        params.tool_choice = ToolChoiceHandler.formatForOpenAI(options.toolChoice);
      }
    }

    return params;
  }

  private async *processStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  ): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCallStates: Record<string, { id: string; name: string; arguments: string }> = {};
    const completedToolCalls: Record<string, { id: string; name: string; arguments: object }> = {};

    for await (const chunk of stream) {
      if (!chunk.choices || chunk.choices.length === 0) continue;
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta?.content || '';
      content += delta;

      this.processToolCalls(choice.delta?.tool_calls, toolCallStates, completedToolCalls);

      const finishReason = choice.finish_reason
        ? FinishReasonMapper.mapOpenAI(choice.finish_reason)
        : undefined;

      const completedCalls = Object.values(completedToolCalls);
      yield {
        content,
        delta,
        finishReason,
        toolCalls: completedCalls.length > 0 ? completedCalls : undefined,
      };
    }
  }

  private processToolCalls(
    deltaToolCalls: any,
    toolCallStates: Record<string, { id: string; name: string; arguments: string }>,
    completedToolCalls: Record<string, { id: string; name: string; arguments: object }>
  ): void {
    if (!deltaToolCalls || !Array.isArray(deltaToolCalls)) return;

    for (const tc of deltaToolCalls) {
      if (typeof tc.index !== 'number') continue;
      const key = tc.index.toString();

      if (!toolCallStates[key]) {
        toolCallStates[key] = { id: tc.id || '', name: '', arguments: '' };
      }

      if (tc.id) toolCallStates[key].id = tc.id;
      if (tc.function?.name) toolCallStates[key].name += tc.function.name;
      if (tc.function?.arguments) toolCallStates[key].arguments += tc.function.arguments;

      if (completedToolCalls[key]) continue;

      const currentState = toolCallStates[key];
      const parsedArgs = this.parseToolArguments(currentState.arguments);

      if (parsedArgs !== null) {
        completedToolCalls[key] = {
          id: currentState.id,
          name: currentState.name,
          arguments: parsedArgs,
        };
      }
    }
  }

  private parseToolArguments(args: string): object | null {
    if (!args) return {};
    try {
      return JSON.parse(args);
    } catch (error) {
      return null;
    }
  }
}
