import type { StreamChunk, GenerationUsage } from '../types';
import { MessageTransformer, StreamUtils, StreamState, ResponseProcessor } from './utils';
import { extractDataLines } from './api';
import { OpenAI } from './openai';

const FINISH_REASON_MAPPINGS = {
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
};

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
    const usageOnlyResult = this.handleUsageOnlyChunk(chunk, state);
    if (usageOnlyResult !== null) return usageOnlyResult;

    if (!chunk.choices || chunk.choices.length === 0) return null;

    const choice = chunk.choices[0];
    const delta = choice.delta || {};

    return this.processChatChoiceDelta(delta, choice, chunk, state);
  }

  private static handleUsageOnlyChunk(
    chunk: OpenAI.Chat.StreamChunk,
    state: StreamState
  ): StreamChunk | null {
    if (chunk.usage && (!chunk.choices || chunk.choices.length === 0)) {
      const usage = this.extractUsageFromChunk(chunk);
      if (usage) {
        return state.createChunk('', 'stop', usage);
      }
    }
    return null;
  }

  private static processChatChoiceDelta(
    delta: any,
    choice: any,
    chunk: OpenAI.Chat.StreamChunk,
    state: StreamState
  ): StreamChunk | null {
    if (delta.content) {
      state.addContentDelta(delta.content);
      return state.createChunk(delta.content);
    }

    if (delta.reasoning) {
      return this.handleReasoningDelta(delta.reasoning, state);
    }

    if (delta.tool_calls) {
      this.processChatToolCallDeltas(delta.tool_calls, state);
      return choice.finish_reason
        ? this.createFinishChunk(choice, chunk, state)
        : state.createChunk('');
    }

    if (choice.finish_reason) {
      return this.createFinishChunk(choice, chunk, state);
    }

    return null;
  }

  private static handleReasoningDelta(reasoning: string, state: StreamState): StreamChunk {
    const reasoningContent = state.addReasoningDelta(reasoning);
    return MessageTransformer.createStreamChunk(
      state.content,
      '',
      undefined,
      undefined,
      reasoningContent
    );
  }

  private static createFinishChunk(
    choice: any,
    chunk: OpenAI.Chat.StreamChunk,
    state: StreamState
  ): StreamChunk {
    const finishReason = ResponseProcessor.mapFinishReason(
      choice.finish_reason,
      FINISH_REASON_MAPPINGS.CHAT
    );
    const usage = this.extractUsageFromChunk(chunk);
    return state.createChunk('', finishReason, usage);
  }

  private static processResponsesEvent(
    event: OpenAI.Responses.StreamEvent,
    state: StreamState
  ): StreamChunk | null {
    switch (event.type) {
      case 'response.output_text.delta':
        return this.handleTextDelta(event, state);
      case 'response.output_item.added':
        return this.handleItemAdded(event, state);
      case 'response.function_call_arguments.delta':
        return this.handleArgumentsDelta(event, state);
      case 'response.function_call_arguments.done':
        return this.handleArgumentsDone(event, state);
      case 'response.completed':
        return this.handleResponseCompleted(event, state);
      default:
        return null;
    }
  }

  private static handleTextDelta(event: any, state: StreamState): StreamChunk {
    state.addContentDelta(event.delta);
    return state.createChunk(event.delta);
  }

  private static handleItemAdded(event: any, state: StreamState): StreamChunk | null {
    if (event.item?.type === 'function_call') {
      state.outputIndexToCallId[event.output_index] = event.item.call_id;
      state.initToolCall(event.item.call_id, event.item.name);
      return state.createChunk('');
    }
    return null;
  }

  private static handleArgumentsDelta(event: any, state: StreamState): StreamChunk | null {
    const callId = event.call_id || state.outputIndexToCallId[event.output_index];
    if (!callId) return null;
    state.addToolCallArgs(callId, event.delta);
    return state.createChunk('');
  }

  private static handleArgumentsDone(event: any, state: StreamState): StreamChunk | null {
    const callId = event.call_id || state.outputIndexToCallId[event.output_index];
    if (!callId || !state.toolCallStates[callId]) return null;
    const argsString = event.arguments || state.toolCallStates[callId].arguments || '{}';
    state.toolCallStates[callId].arguments = argsString;
    return state.createChunk('');
  }

  private static handleResponseCompleted(event: any, state: StreamState): StreamChunk {
    const finishReason = ResponseProcessor.mapFinishReason(
      event.response?.status || 'completed',
      FINISH_REASON_MAPPINGS.RESPONSES
    );
    return state.createChunk('', finishReason);
  }

  private static processChatToolCallDeltas(
    deltaToolCalls: OpenAI.Chat.ToolCallDelta[],
    state: StreamState
  ): void {
    for (const deltaCall of deltaToolCalls) {
      const index = deltaCall.index ?? 0;

      if (deltaCall.id) {
        state.outputIndexToCallId[index] = deltaCall.id;
      }

      const callId = deltaCall.id || state.outputIndexToCallId[index];

      if (callId && deltaCall.function?.name) {
        state.initToolCall(callId, deltaCall.function.name);
      }

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

    if (chunk.usage.completion_tokens_details?.reasoning_tokens) {
      usage.reasoningTokens = chunk.usage.completion_tokens_details.reasoning_tokens;
    }

    if (chunk.usage.prompt_tokens_details?.cached_tokens) {
      usage.cacheTokens = chunk.usage.prompt_tokens_details.cached_tokens;
    }

    return Object.keys(usage).length > 0 ? usage : undefined;
  }
}
