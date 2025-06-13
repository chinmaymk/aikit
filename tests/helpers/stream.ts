import { Readable } from 'node:stream';

/**
 * Creates a Node Readable stream that mimics the SSE payload produced by
 * Anthropic's streaming API.
 */
export function createAnthropicSSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  chunks.forEach(chunk => {
    stream.push(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`);
  });
  // Anthropic does not send a sentinel – the stream simply ends.
  stream.push(null);
  return stream;
}

/**
 * Creates a Readable stream that mimics the SSE payload used by OpenAI's
 * chat completion endpoint.
 * The function automatically appends the `[DONE]` sentinel.
 */
export function createOpenAISSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  const flat = chunks.flat();
  flat.forEach(chunk => {
    stream.push(`data: ${JSON.stringify(chunk)}\n\n`);
  });
  // OpenAI terminates the stream with the [DONE] message.
  stream.push('data: [DONE]\n\n');
  stream.push(null);
  return stream;
}

/**
 * Creates a Readable stream that mimics the SSE payload returned by Google
 * Gemini. It does not include a special terminator – the stream simply ends.
 */
export function createGoogleSSEStream(chunks: any[]): Readable {
  const stream = new Readable({ read() {} });
  const flat = chunks.flat();
  flat.forEach(chunk => {
    stream.push(`data: ${JSON.stringify(chunk)}\n`);
  });
  stream.push(null);
  return stream;
}
