import type { GenerationUsage, StreamChunk, ToolCall } from '../types';
import { StreamState, StreamUtils } from './utils';
import { StreamGenerateContentChunk } from './google.d';

const GOOGLE_CONSTANTS = {
  FINISH_REASON_MAPPINGS: {
    STOP: 'stop',
    MAX_TOKENS: 'length',
    TOOL_CODE_EXECUTED: 'tool_use',
    OTHER: 'stop',
    SAFETY: 'stop',
    RECITATION: 'stop',
  } as const,
} as const;

export class GoogleStreamProcessor {
  static async *process(
    lineStream: AsyncIterable<string>,
    state?: StreamState
  ): AsyncIterable<StreamChunk> {
    const streamState = state ?? new StreamState();
    for await (const line of lineStream) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data.trim() === '[DONE]') break;
      const chunk = StreamUtils.parseStreamEvent<StreamGenerateContentChunk>(data);
      if (!chunk) continue;
      const result = this.processChunk(chunk, streamState);
      if (result) yield result;
    }
  }

  private static processChunk(
    chunk: StreamGenerateContentChunk,
    state: StreamState
  ): StreamChunk | null {
    const usage = this.extractUsage(chunk);
    const candidate = chunk.candidates?.[0];
    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts)) {
      return usage ? state.createChunk('', undefined, usage) : null;
    }
    let delta = '';
    const newToolCalls: ToolCall[] = [];
    for (const part of candidate.content.parts) {
      if ('text' in part) {
        delta += part.text;
        state.addContentDelta(part.text);
      } else if ('functionCall' in part) {
        newToolCalls.push({
          id: part.functionCall.name,
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        });
        state.hasToolCalls = true;
      }
    }
    const finishReason = candidate.finishReason
      ? (GOOGLE_CONSTANTS.FINISH_REASON_MAPPINGS as Record<string, 'stop' | 'length' | 'tool_use'>)[
          candidate.finishReason
        ] || 'stop'
      : undefined;
    const streamChunk = state.createChunk(delta, finishReason, usage);
    if (newToolCalls.length > 0) streamChunk.toolCalls = newToolCalls;
    else if (state.hasToolCalls) streamChunk.toolCalls = [];
    return streamChunk;
  }

  private static extractUsage(chunk: StreamGenerateContentChunk): GenerationUsage | undefined {
    const usage = chunk.usageMetadata;
    if (!usage) return undefined;
    const result: GenerationUsage = {};
    if (usage.promptTokenCount) result.inputTokens = usage.promptTokenCount;
    if (usage.candidatesTokenCount) result.outputTokens = usage.candidatesTokenCount;
    if (usage.totalTokenCount) result.totalTokens = usage.totalTokenCount;
    if (usage.cachedContentTokenCount) result.cacheTokens = usage.cachedContentTokenCount;
    return Object.keys(result).length > 0 ? result : undefined;
  }
}
