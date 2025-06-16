import {
  Message,
  StreamChunk,
  StreamingGenerateFunction,
  AnthropicOptions,
  GoogleOptions,
  OpenAIOptions,
  OpenAIResponsesOptions,
  GenerationProviderType,
} from '../types';

import { createProvider } from '../factory';
import { APIClient } from './api';
import { mapStream } from '../utils';

/**
 * The request payload sent to the backend
 */
export interface ProxyRequest<T extends GenerationProviderType = GenerationProviderType> {
  messages: Message[];
  providerType: T;
  providerOptions?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

/**
 * Creates a proxy provider that forwards requests to a backend server
 *
 * @param providerType - The AI provider type to use
 * @param options - Combined proxy configuration and provider options. `baseURL` is required.
 * @returns A streaming generate function that works with the specified provider
 *
 * @example
 * ```typescript
 * // Create OpenAI proxy
 * const openaiProxy = createProxy('openai', {
 *   baseURL: 'http://localhost:3000',
 *   model: 'gpt-4o',
 *   temperature: 0.7
 * });
 *
 * // Create Anthropic proxy
 * const anthropicProxy = createProxy('anthropic', {
 *   baseURL: 'http://localhost:3000',
 *   model: 'claude-3-5-sonnet-20241022'
 * });
 *
 * // Use the proxy
 * const stream = openaiProxy([userText('Hello world!')]);
 * for await (const chunk of stream) {
 *   console.log(chunk.delta);
 * }
 * ```
 */
export function createProxyProvider(
  providerType: GenerationProviderType,
  options: Record<string, unknown>
): StreamingGenerateFunction<Record<string, unknown>> {
  // Extract proxy-specific options and validate them
  const {
    baseURL,
    apiKey,
    endpoint,
    timeout,
    headers,
    maxRetries,
    mutateHeaders,
    ...providerOptions
  } = options;

  if (typeof baseURL !== 'string' || !baseURL) {
    throw new Error('The `baseURL` option is required for `createProxy` and must be a string.');
  }

  return async function* proxy(
    messages: Message[],
    callOptions?: Record<string, unknown>
  ): AsyncIterable<StreamChunk> {
    const client = createProxyClient({
      baseURL,
      apiKey,
      headers,
      timeout,
      maxRetries,
      mutateHeaders,
    });

    const request: ProxyRequest = {
      messages,
      providerType,
      providerOptions,
      options: callOptions || {},
    };

    const stream = await client.stream(
      typeof endpoint === 'string' ? endpoint : '/aikit/proxy',
      request
    );

    yield* processProxyStream(stream, client);
  };
}

function createProxyClient({
  baseURL,
  apiKey,
  headers,
  timeout,
  maxRetries,
  mutateHeaders,
}: {
  baseURL: string;
  apiKey?: unknown;
  headers?: unknown;
  timeout?: unknown;
  maxRetries?: unknown;
  mutateHeaders?: unknown;
}): APIClient {
  const clientHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof apiKey === 'string' && apiKey) {
    clientHeaders.Authorization = `Bearer ${apiKey}`;
  }

  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    Object.assign(clientHeaders, headers as Record<string, string>);
  }

  return new APIClient(
    baseURL.replace(/\/$/, ''),
    clientHeaders,
    typeof timeout === 'number' ? timeout : undefined,
    typeof maxRetries === 'number' ? maxRetries : undefined,
    typeof mutateHeaders === 'function'
      ? (mutateHeaders as (headers: Record<string, string>) => void)
      : undefined
  );
}

async function* processProxyStream(
  stream: ReadableStream,
  client: APIClient
): AsyncIterable<StreamChunk> {
  const lineStream = client.processStreamAsLines(stream);

  for await (const line of lineStream) {
    if (!line.trim() || !line.startsWith('data: ')) {
      continue;
    }

    const data = line.slice(6);
    if (data.trim() === '[DONE]') {
      break;
    }

    try {
      const chunk = JSON.parse(data) as StreamChunk;
      yield chunk;
    } catch (error) {
      console.warn('Failed to parse streaming response:', error);
    }
  }
}

function getStreamingProvider<T extends GenerationProviderType>({
  providerType,
  providerOptions,
}: {
  providerType: T;
  providerOptions: Record<string, unknown> & { apiKey: string };
}): StreamingGenerateFunction<Record<string, unknown>> {
  if (!providerOptions.apiKey) {
    throw new Error(`API key not provided for provider: ${providerType}`);
  }

  switch (providerType) {
    case 'openai':
      return createProvider('openai', providerOptions as OpenAIOptions & { apiKey: string });

    case 'anthropic':
      return createProvider('anthropic', providerOptions as AnthropicOptions & { apiKey: string });

    case 'google':
      return createProvider('google', providerOptions as GoogleOptions & { apiKey: string });

    case 'openai_responses':
      return createProvider(
        'openai_responses',
        providerOptions as OpenAIResponsesOptions & { apiKey: string }
      );

    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

/**
 * Resolves a proxy request to a Server-Sent Events (SSE) stream.
 * This is the core function backends use to handle proxy requests.
 *
 * @param request - The proxy request object, including provider type, options, messages, and an API key.
 * @returns An async iterable that yields SSE-formatted strings.
 *
 * @example
 * ```typescript
 * // In your backend server (e.g., Express)
 * app.post('/ai/proxy', async (req, res) => {
 *   const requestWithApiKey = { ...req.body, providerOptions: { apiKey: '...' } };
 *   const stream = resolveProxyProvider(requestWithApiKey);
 *
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   for await (const chunk of stream) {
 *     res.write(chunk);
 *   }
 *   res.end();
 * });
 * ```
 */
export async function* callProxyProvider(
  request: ProxyRequest & { providerOptions: { apiKey: string } }
): AsyncIterable<string> {
  const { messages, options } = request;
  const provider = getStreamingProvider(request);
  const stream = provider(messages, options);

  yield* mapStream(stream, chunk => `data: ${JSON.stringify(chunk)}\n`);
  yield 'data: [DONE]\n';
}
