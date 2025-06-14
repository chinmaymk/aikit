import type {
  EmbeddingResponse,
  OpenAIEmbeddingOptions,
  WithApiKey,
  EmbedFunction,
} from '../types';
import { OpenAIClientFactory, OpenAIRequestBuilder, OpenAIEmbeddingUtils } from './openai_util';
import { OpenAI } from './openai';

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
): EmbedFunction<OpenAIEmbeddingOptions> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const client = OpenAIClientFactory.createClient(config);
  const { apiKey, ...defaultEmbeddingOptions } = config;
  const defaultOptions = { apiKey, ...defaultEmbeddingOptions };

  return async function openaiEmbeddings(
    texts: string[],
    options?: Partial<OpenAIEmbeddingOptions>
  ): Promise<EmbeddingResponse> {
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
  client: ReturnType<typeof OpenAIClientFactory.createClient>,
  texts: string[],
  options: OpenAIEmbeddingOptions
): Promise<EmbeddingResponse> {
  OpenAIEmbeddingUtils.validateRequest(texts);

  const requestBody = OpenAIRequestBuilder.buildEmbeddingParams(texts, options);
  const response = (await client.post('/embeddings', requestBody)) as OpenAI.Embeddings.APIResponse;

  return OpenAIEmbeddingUtils.transformResponse(response);
}
