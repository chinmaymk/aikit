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

  /**
   * Initializes the API client.
   * @param baseUrl - The base URL for the API.
   * @param defaultHeaders - The default headers to send with each request.
   * @param timeout - The request timeout in milliseconds.
   * @param maxRetries - The maximum number of times to retry a failed request.
   */
  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string>,
    timeout?: number,
    maxRetries?: number
  ) {
    this.baseUrl = baseUrl;
    this.headers = defaultHeaders;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Makes a streaming API request.
   * It's resilient, with built-in retries and timeout support.
   * @param endpoint - The API endpoint to hit.
   * @param body - The request payload.
   * @returns A `ReadableStream` of the response body.
   */
  async stream(endpoint: string, body: any): Promise<ReadableStream<Uint8Array>> {
    const retries = this.maxRetries ?? 1;
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const signal = controller.signal;

        if (this.timeout) {
          setTimeout(() => controller.abort(), this.timeout);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.headers,
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
