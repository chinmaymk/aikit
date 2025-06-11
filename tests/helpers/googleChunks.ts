// Utilities to build Google Gemini streaming chunks for tests

type GoogleFinish = 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | null;

/**
 * Build a text delta chunk for Google Gemini.
 */
export const googleTextChunk = (content: string, finish: GoogleFinish = null) => ({
  candidates: [
    {
      content: {
        parts: [{ text: content }],
        role: 'model',
      },
      finishReason: finish,
    },
  ],
});

/**
 * Build a stop chunk that closes the stream.
 */
export const googleStopChunk = () => ({
  candidates: [
    {
      content: {
        parts: [],
        role: 'model',
      },
      finishReason: 'STOP' as const,
    },
  ],
});

/**
 * Build a chunk that contains a function call.
 */
export const googleToolCallChunk = (
  name: string,
  args: Record<string, unknown>,
  finish: GoogleFinish = null
) => ({
  candidates: [
    {
      content: {
        parts: [
          {
            functionCall: {
              name,
              args,
            },
          },
        ],
        role: 'model',
      },
      finishReason: finish,
    },
  ],
});
