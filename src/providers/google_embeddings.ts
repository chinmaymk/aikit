import type {
  EmbeddingResponse,
  EmbeddingResult,
  GoogleEmbeddingOptions,
  WithApiKey,
  EmbedFunction,
} from '../types';
import { APIClient } from './api';

/**
 * Creates a Google embeddings function with pre-configured defaults.
 * Returns a simple function that takes texts and options.
 *
 * @example
 * ```typescript
 * const embeddings = createGoogleEmbeddings({
 *   apiKey: '...',
 *   model: 'text-embedding-004',
 *   taskType: 'SEMANTIC_SIMILARITY'
 * });
 *
 * // Use like any function
 * const result = await embeddings(['Hello world', 'How are you?']);
 *
 * // Override options
 * const result2 = await embeddings(['Text'], { dimensions: 512 });
 * ```
 */
export function createGoogleEmbeddings(
  config: WithApiKey<GoogleEmbeddingOptions>
): EmbedFunction<GoogleEmbeddingOptions> {
  if (!config.apiKey) {
    throw new Error('Google API key is required');
  }

  const {
    apiKey,
    baseURL = 'https://generativelanguage.googleapis.com/v1beta',
    timeout,
    maxRetries,
    ...defaultEmbeddingOptions
  } = config;

  const headers = { 'Content-Type': 'application/json' };
  const client = new APIClient(baseURL, headers, timeout, maxRetries);
  const defaultOptions = { apiKey, ...defaultEmbeddingOptions };

  return async function googleEmbeddings(
    texts: string[],
    options?: Partial<GoogleEmbeddingOptions>
  ) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    return embed(client, texts, mergedOptions);
  };
}

/**
 * Direct Google embeddings function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await googleEmbeddings(
 *   { apiKey: '...', model: 'text-embedding-004', taskType: 'SEMANTIC_SIMILARITY' },
 *   ['Hello world']
 * );
 * ```
 */
export async function googleEmbeddings(
  config: WithApiKey<GoogleEmbeddingOptions>,
  texts: string[]
): Promise<EmbeddingResponse> {
  const provider = createGoogleEmbeddings(config);
  return provider(texts);
}

/**
 * Generate embeddings for the provided texts using Google's embedding models.
 */
async function embed(
  client: APIClient,
  texts: string[],
  options: GoogleEmbeddingOptions
): Promise<EmbeddingResponse> {
  validateTexts(texts);

  const cleanModel = options.model!.replace(/^models\//, '');
  const embeddings: EmbeddingResult[] = [];

  // Google processes one text at a time
  for (let i = 0; i < texts.length; i++) {
    const requestBody = {
      content: { parts: [{ text: texts[i] }] },
    } as Record<string, unknown>;

    if (options.taskType) requestBody.taskType = options.taskType;
    if (options.title) requestBody.title = options.title;
    if (options.dimensions) requestBody.outputDimensionality = options.dimensions;
    if (options.outputDtype) requestBody.outputDtype = options.outputDtype;

    const response = (await client.post(
      `/models/${cleanModel}:embedContent?key=${options.apiKey}`,
      requestBody
    )) as { embedding: { values: number[] } };

    embeddings.push({
      values: response.embedding.values,
      index: i,
    });
  }

  return {
    embeddings,
    model: cleanModel,
  };
}

function validateTexts(texts: string[]): void {
  if (texts.length === 0) {
    throw new Error('At least one text must be provided');
  }
}
