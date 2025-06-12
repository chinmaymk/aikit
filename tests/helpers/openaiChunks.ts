// Utilities to build OpenAI Responses API streaming chunks for tests
// Keeping test definitions concise and readable

type Finish = 'stop' | 'tool_calls' | null;

/**
 * Build a text delta chunk for responses API.
 * @param content Partial content string emitted by the model
 * @param finish Optional finish reason (e.g. 'stop')
 */
export const textChunk = (content: string, finish: Finish = null) => {
  const chunk: any = {
    type: 'response.output_text.delta',
    delta: content,
  };

  // If finish is provided, add a completion event
  if (finish) {
    return [
      chunk,
      {
        type: 'response.completed',
        response: {
          status: finish === 'stop' ? 'completed' : 'tool_calls_required',
        },
      },
    ];
  }

  return [chunk];
};

/**
 * Build an empty delta "stop" chunk that closes the stream.
 */
export const stopChunk = () => ({
  type: 'response.completed',
  response: {
    status: 'completed',
  },
});

/**
 * Build a chunk that contains a tool-call delta.
 */
export const toolCallChunk = (
  {
    index = 0,
    id,
    name,
    args,
  }: {
    index?: number;
    id?: string;
    name?: string;
    args?: string;
  },
  finish: Finish = null
) => {
  const chunks: any[] = [];

  // Add function call item if we have id and name
  if (id && name) {
    chunks.push({
      type: 'response.output_item.added',
      response_id: 'resp_123',
      output_index: index,
      item: {
        type: 'function_call',
        id: id,
        call_id: id,
        name: name,
        arguments: '',
      },
    });
  }

  // Add arguments delta if we have args
  if (args) {
    chunks.push({
      type: 'response.function_call_arguments.delta',
      response_id: 'resp_123',
      item_id: id,
      output_index: index,
      call_id: id,
      delta: args,
    });

    chunks.push({
      type: 'response.function_call_arguments.done',
      response_id: 'resp_123',
      item_id: id,
      output_index: index,
      call_id: id,
      arguments: args,
    });
  }

  // Add completion if finish is provided
  if (finish) {
    chunks.push({
      type: 'response.completed',
      response: {
        status: finish === 'stop' ? 'completed' : 'tool_calls_required',
      },
    });
  }

  return chunks;
};

/**
 * Helper to create a single text chunk without completion
 */
export const textDelta = (content: string) => ({
  type: 'response.output_text.delta',
  delta: content,
});

/**
 * Helper to create a completion chunk
 */
export const completionChunk = (status: string = 'completed') => ({
  type: 'response.completed',
  response: {
    status,
  },
});
