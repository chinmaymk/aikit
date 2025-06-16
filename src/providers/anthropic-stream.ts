import type { StreamChunk } from '../types';
import { MessageTransformer, StreamUtils, StreamState, DynamicParams } from './utils';
import { extractDataLines } from './api';
import {
  AnthropicStreamEvent,
  mapFinishReason,
  extractUsageFromAnthropicEvent,
} from './anthropic-transformers';

export async function* processAnthropicStream(
  sseStream: AsyncIterable<string>,
  state?: StreamState
): AsyncIterable<StreamChunk> {
  const streamState = state ?? new StreamState();

  for await (const data of extractDataLines(sseStream)) {
    if (StreamUtils.isStreamDone(data) || data.trim() === 'data: [DONE]') break;

    const event = StreamUtils.parseStreamEvent<AnthropicStreamEvent>(data);
    if (!event) continue;

    const chunk = handleStreamEvent(event, streamState);
    if (chunk) yield chunk;
  }
}

export function handleStreamEvent(
  event: AnthropicStreamEvent,
  state: StreamState
): StreamChunk | null {
  if (event.type === 'content_block_start')
    return 'content_block' in event
      ? handleContentBlockStart(
          event as Extract<AnthropicStreamEvent, { type: 'content_block_start' }>,
          state
        )
      : null;
  if (event.type === 'content_block_delta')
    return 'delta' in event
      ? handleContentBlockDelta(
          event as Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>,
          state
        )
      : null;
  if (event.type === 'message_delta')
    return 'delta' in event
      ? handleMessageDelta(event as Extract<AnthropicStreamEvent, { type: 'message_delta' }>, state)
      : null;
  if (event.type === 'error' && 'error' in event && event.error)
    throw new Error(
      `Anthropic API error: ${(event.error as any).type} - ${(event.error as any).message}`
    );
  return null;
}

export function handleContentBlockStart(
  event: Extract<AnthropicStreamEvent, { type: 'content_block_start' }>,
  state: StreamState
): null {
  if (event.content_block.type === 'tool_use') {
    const toolBlock = event.content_block as {
      type: 'tool_use';
      id: string;
      name: string;
      input: DynamicParams;
    };
    state.initToolCall(toolBlock.id, toolBlock.name);
  }
  return null;
}

export function handleContentBlockDelta(
  event: Extract<AnthropicStreamEvent, { type: 'content_block_delta' }>,
  state: StreamState
): StreamChunk | null {
  const { delta } = event;
  if (delta.type === 'text_delta') {
    state.addContentDelta(delta.text);
    return MessageTransformer.createStreamChunk(state.content, delta.text);
  }
  if (delta.type === 'input_json_delta') {
    const toolCallId =
      Object.keys(state.toolCallStates)[event.index] || Object.keys(state.toolCallStates)[0];
    if (toolCallId) state.addToolCallArgs(toolCallId, delta.partial_json);
    return null;
  }
  if (delta.type === 'thinking_delta') {
    const reasoning = state.addReasoningDelta(delta.thinking);
    return MessageTransformer.createStreamChunk(state.content, '', undefined, undefined, reasoning);
  }
  return null;
}

export function handleMessageDelta(
  event: Extract<AnthropicStreamEvent, { type: 'message_delta' }>,
  state: StreamState
): StreamChunk | null {
  if (!event.delta.stop_reason) return null;
  const finishReason = mapFinishReason(event.delta.stop_reason);
  const usage = extractUsageFromAnthropicEvent(event);
  return state.createChunk('', finishReason, usage);
}
