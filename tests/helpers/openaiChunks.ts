// Utilities to build OpenAI ChatCompletion streaming chunks for tests
// Keeping test definitions concise and readable

type Finish = 'stop' | 'tool_calls' | null;

/**
 * Build a text delta chunk.
 * @param content Partial content string emitted by the model
 * @param finish Optional finish reason (e.g. 'stop')
 */
export const textChunk = (content: string, finish: Finish = null) => ({
  choices: [
    {
      delta: { content },
      finish_reason: finish,
    },
  ],
});

/**
 * Build an empty delta "stop" chunk that closes the stream.
 */
export const stopChunk = () => ({
  choices: [
    {
      delta: {},
      finish_reason: 'stop' as const,
    },
  ],
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
) => ({
  choices: [
    {
      delta: {
        tool_calls: [
          {
            index,
            id,
            type: 'function',
            function: {
              name,
              arguments: args,
            },
          },
        ],
      },
      finish_reason: finish,
    },
  ],
});
