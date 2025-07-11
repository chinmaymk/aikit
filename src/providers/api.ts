/**
 * The workhorse of our API communication.
 * This class is responsible for making the actual HTTP requests to the AI providers.
 * It's a lean, mean, stream-handling machine.
 * @internal
 */
export class APIClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout?: number;
  private maxRetries?: number;
  private mutateHeaders?: (headers: Record<string, string>) => void;

  /**
   * Initializes the API client.
   * @param baseUrl - The base URL for the API.
   * @param defaultHeaders - The default headers to send with each request.
   * @param timeout - The request timeout in milliseconds.
   * @param maxRetries - The maximum number of times to retry a failed request.
   * @param mutateHeaders - Optional function to mutate headers before each request.
   */
  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string>,
    timeout?: number,
    maxRetries?: number,
    mutateHeaders?: (headers: Record<string, string>) => void
  ) {
    this.baseUrl = baseUrl;
    this.headers = defaultHeaders;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.mutateHeaders = mutateHeaders;
  }

  /**
   * Makes a non-streaming API request.
   * @param endpoint - The API endpoint to hit.
   * @param body - The request payload.
   * @returns A Promise resolving to the parsed JSON response.
   */
  async post(endpoint: string, body: unknown): Promise<unknown> {
    const stream = await this.stream(endpoint, body);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    try {
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          result += decoder.decode(chunk.value, { stream: true });
        }
      }
      return JSON.parse(result);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Makes a streaming API request.
   * It's resilient, with built-in retries and timeout support.
   * @param endpoint - The API endpoint to hit.
   * @param body - The request payload.
   * @returns A `ReadableStream` of the response body.
   */
  async stream(endpoint: string, body: unknown): Promise<ReadableStream<Uint8Array>> {
    const retries = this.maxRetries ?? 1;
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      let timeoutId: NodeJS.Timeout | undefined;
      try {
        let signal: AbortSignal | undefined;

        if (this.timeout) {
          const controller = new AbortController();
          signal = controller.signal;
          timeoutId = setTimeout(() => controller.abort(), this.timeout);
        }

        const headers = { ...this.headers };
        this.mutateHeaders?.(headers);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        if (!response.body) {
          throw new Error('No response body from API. The void stares back.');
        }

        return response.body;
      } catch (error) {
        lastError = error as Error;
        if (i === retries - 1) {
          // If this was the last retry, re-throw the error.
          throw lastError;
        }
        // Otherwise, we'll just go around again.
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }
    // This should be unreachable, but TypeScript insists.
    // If you see this error, something has gone very, very wrong.
    throw new Error('Max retries exceeded, but no error was thrown. This is a bug.');
  }

  /**
   * Processes a `ReadableStream` and yields its content line by line.
   * It's a fundamental part of handling server-sent events.
   * @param stream - The stream to process.
   * @returns An async iterable of strings, one for each line.
   */
  async *processStreamAsLines(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          yield buffer;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        yield line;
      }
    }
  }

  /**
   * Processes a `ReadableStream` and yields its content as raw chunks.
   * Sometimes you just want the data as it comes, with no frills.
   * @param stream - The stream to process.
   * @returns An async iterable of raw string chunks.
   */
  async *processStreamAsRaw(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        yield chunk;
      }
    }
  }
}

/**
 * Extracts the data from a stream of server-sent events.
 * It filters out all the noise and just gives you the good stuff.
 * @param lineStream - A stream of lines from the API.
 * @returns An async iterable of data strings.
 */
export async function* extractDataLines(lineStream: AsyncIterable<string>): AsyncIterable<string> {
  for await (const line of lineStream) {
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (!data.trim()) continue;

    if (data.trim() === '[DONE]') {
      continue;
    }

    yield data;
  }
}
