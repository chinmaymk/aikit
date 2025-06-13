import type {
  EmbeddingResponse,
  EmbeddingResult,
  OpenAIEmbeddingOptions,
  WithApiKey,
  EmbedFunction,
} from '../types';
import { APIClient } from './api';

/**
 * Creates an OpenAI embeddings function with pre-configured defaults.
 * Returns a simple function that takes texts and options.
 *
 * @example
 * ```typescript
 * const embeddings = createOpenAIEmbeddings({ apiKey: '...', model: 'text-embedding-3-small' });
 *
 * // Use like any function
 * const result = await embeddings(['Hello world', 'How are you?']);
 *
 * // Override options
 * const result2 = await embeddings(['Text'], { dimensions: 512 });
 * ```
 */
export function createOpenAIEmbeddings(
  config: WithApiKey<OpenAIEmbeddingOptions>
): EmbedFunction<Partial<OpenAIEmbeddingOptions>> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const {
    apiKey,
    baseURL = 'https://api.openai.com/v1',
    organization,
    project,
    timeout,
    maxRetries,
    ...defaultEmbeddingOptions
  } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (organization) headers['OpenAI-Organization'] = organization;
  if (project) headers['OpenAI-Project'] = project;

  const client = new APIClient(baseURL, headers, timeout, maxRetries);
  const defaultOptions = { apiKey, ...defaultEmbeddingOptions };

  return async function openaiEmbeddings(
    texts: string[],
    options: Partial<OpenAIEmbeddingOptions> = {}
  ) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    return embed(client, texts, mergedOptions);
  };
}

/**
 * Direct OpenAI embeddings function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await openaiEmbeddings(
 *   { apiKey: '...', model: 'text-embedding-3-small' },
 *   ['Hello world']
 * );
 * ```
 */
export async function openaiEmbeddings(
  config: WithApiKey<OpenAIEmbeddingOptions>,
  texts: string[]
): Promise<EmbeddingResponse> {
  const provider = createOpenAIEmbeddings(config);
  return provider(texts);
}

/**
 * Generate embeddings for the provided texts using OpenAI's embedding models.
 */
async function embed(
  client: APIClient,
  texts: string[],
  options: OpenAIEmbeddingOptions
): Promise<EmbeddingResponse> {
  validateTexts(texts);

  if (texts.length > 2048) {
    throw new Error('OpenAI embedding API supports up to 2048 texts per request');
  }

  const requestBody = { model: options.model!, input: texts } as Record<string, unknown>;

  if (options.dimensions) requestBody.dimensions = options.dimensions;
  if (options.encodingFormat) requestBody.encoding_format = options.encodingFormat;
  if (options.user) requestBody.user = options.user;

  const response = (await client.post('/embeddings', requestBody)) as {
    data: Array<{ embedding: number[] }>;
    model: string;
    usage?: { prompt_tokens: number; total_tokens: number };
  };

  const embeddings: EmbeddingResult[] = response.data.map((item, index) => ({
    values: item.embedding,
    index,
  }));

  return {
    embeddings,
    model: response.model,
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

function validateTexts(texts: string[]): void {
  if (texts.length === 0) {
    throw new Error('At least one text must be provided');
  }
}
