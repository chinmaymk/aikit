// Utilities to build Anthropic streaming chunks for tests
// Keeping test definitions concise and readable

type AnthropicFinish =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'
  | 'pause_turn'
  | 'refusal'
  | null;

/**
 * Build a message start chunk.
 */
export const anthropicMessageStartChunk = (
  messageId = 'msg_123',
  model = 'claude-3-5-sonnet-20241022'
) => ({
  type: 'message_start',
  message: {
    id: messageId,
    type: 'message',
    role: 'assistant',
    content: [],
    model,
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 25, output_tokens: 1 },
  },
});

/**
 * Build a content block start chunk for text.
 */
export const anthropicContentBlockStartChunk = (
  index = 0,
  blockType: 'text' | 'tool_use' = 'text',
  toolData?: { id: string; name: string }
) => ({
  type: 'content_block_start',
  index,
  content_block:
    blockType === 'text'
      ? { type: 'text', text: '' }
      : { type: 'tool_use', id: toolData!.id, name: toolData!.name, input: {} },
});

/**
 * Build a text delta chunk.
 */
export const anthropicTextDeltaChunk = (content: string, index = 0) => ({
  type: 'content_block_delta',
  index,
  delta: { type: 'text_delta', text: content },
});

/**
 * Build a reasoning delta chunk.
 */
export const anthropicReasoningDeltaChunk = (reasoning: string, index = 0) => ({
  type: 'content_block_delta',
  index,
  delta: { type: 'thinking_delta', thinking: reasoning },
});

/**
 * Build a tool input JSON delta chunk.
 */
export const anthropicToolInputDeltaChunk = (partialJson: string, index = 0) => ({
  type: 'content_block_delta',
  index,
  delta: { type: 'input_json_delta', partial_json: partialJson },
});

/**
 * Build a content block stop chunk.
 */
export const anthropicContentBlockStopChunk = (index = 0) => ({
  type: 'content_block_stop',
  index,
});

/**
 * Build a message delta chunk with finish reason.
 */
export const anthropicMessageDeltaChunk = (stopReason: AnthropicFinish, outputTokens?: number) => {
  const chunk: any = {
    type: 'message_delta',
    delta: { stop_reason: stopReason },
  };

  if (outputTokens !== undefined) {
    chunk.usage = { output_tokens: outputTokens };
  }

  return chunk;
};

/**
 * Build a message stop chunk.
 */
export const anthropicMessageStopChunk = () => ({
  type: 'message_stop',
});

/**
 * Build an error chunk.
 */
export const anthropicErrorChunk = (errorType: string, message: string) => ({
  type: 'error',
  error: { type: errorType, message },
});

/**
 * Helper to build a complete text response with common chunks.
 */
export const anthropicTextResponse = (text: string, finishReason: AnthropicFinish = 'end_turn') => [
  anthropicMessageStartChunk(),
  anthropicContentBlockStartChunk(0, 'text'),
  anthropicTextDeltaChunk(text),
  anthropicContentBlockStopChunk(0),
  anthropicMessageDeltaChunk(finishReason),
  anthropicMessageStopChunk(),
];

/**
 * Helper to build a complete response with reasoning content.
 */
export const anthropicTextResponseWithReasoning = (
  text: string,
  reasoning: string,
  finishReason: AnthropicFinish = 'end_turn'
) => [
  anthropicMessageStartChunk(),
  anthropicContentBlockStartChunk(0, 'text'),
  anthropicReasoningDeltaChunk(reasoning),
  anthropicTextDeltaChunk(text),
  anthropicContentBlockStopChunk(0),
  anthropicMessageDeltaChunk(finishReason),
  anthropicMessageStopChunk(),
];

/**
 * Helper to build a complete tool call response.
 */
export const anthropicToolCallResponse = (toolId: string, toolName: string, toolArgs: string) => [
  anthropicMessageStartChunk(),
  anthropicContentBlockStartChunk(0, 'tool_use', { id: toolId, name: toolName }),
  anthropicToolInputDeltaChunk(toolArgs),
  anthropicContentBlockStopChunk(0),
  anthropicMessageDeltaChunk('tool_use'),
  anthropicMessageStopChunk(),
];
