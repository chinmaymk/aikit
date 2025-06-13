import type { EmbeddingResponse, EmbeddingResult, OpenAIEmbeddingOptions } from '../types';
import { BaseEmbeddingProvider } from './base_embedding';

/**
 * OpenAI Embeddings provider for generating text embeddings.
 * This class handles OpenAI's embedding models like text-embedding-3-small, text-embedding-3-large, etc.
 *
 * @group Providers
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider<OpenAIEmbeddingOptions> {
  getProviderName(): string {
    return 'OpenAI';
  }

  getBaseUrl(options: OpenAIEmbeddingOptions): string {
    return options.baseURL || 'https://api.openai.com/v1';
  }

  getHeaders(options: OpenAIEmbeddingOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    };

    if (options.organization) headers['OpenAI-Organization'] = options.organization;
    if (options.project) headers['OpenAI-Project'] = options.project;

    return headers;
  }

  /**
   * Generate embeddings for the provided texts using OpenAI's embedding models.
   * @param texts - Array of text strings to embed
   * @param options - Optional embedding configuration that overrides defaults
   * @returns Promise resolving to embedding response with vectors and usage info
   */
  async embed(
    texts: string[],
    options?: Partial<OpenAIEmbeddingOptions>
  ): Promise<EmbeddingResponse> {
    this.validateTexts(texts);

    if (texts.length > 2048) {
      throw new Error('OpenAI embedding API supports up to 2048 texts per request');
    }

    const finalOptions = this.mergeOptions(options);
    const model = this.getModel(options);

    const requestBody = { model, input: texts } as Record<string, unknown>;

    if (finalOptions.dimensions) requestBody.dimensions = finalOptions.dimensions;
    if (finalOptions.encodingFormat) requestBody.encoding_format = finalOptions.encodingFormat;
    if (finalOptions.user) requestBody.user = finalOptions.user;

    const response = (await this.client.post('/embeddings', requestBody)) as {
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
}
