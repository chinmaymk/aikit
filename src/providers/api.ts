export class StreamingAPIClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout?: number;
  private maxRetries?: number;

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

  async stream(endpoint: string, body: any): Promise<ReadableStream<Uint8Array>> {
    const retries = this.maxRetries ?? 0;
    let lastError: Error | undefined;

    for (let i = 0; i <= retries; i++) {
      try {
        const signal = this.timeout ? AbortSignal.timeout(this.timeout) : undefined;

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
          throw new Error('No response body from API');
        }

        return response.body;
      } catch (error) {
        lastError = error as Error;
      }
    }
    throw lastError;
  }

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
}
