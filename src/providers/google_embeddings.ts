import type { EmbeddingResponse, EmbeddingResult, GoogleEmbeddingOptions } from '../types';
import { APIClient } from './api';

/**
 * Google Embeddings provider.
 * @group Providers
 */
export class GoogleEmbeddingProvider {
  private client: APIClient;
  private defaultOptions: GoogleEmbeddingOptions;

  constructor(options: GoogleEmbeddingOptions) {
    if (!options.apiKey) {
      throw new Error('Google API key is required');
    }

    this.defaultOptions = options;
    this.client = new APIClient(
      options.baseURL || 'https://generativelanguage.googleapis.com/v1beta',
      { 'Content-Type': 'application/json' },
      options.timeout,
      options.maxRetries
    );
  }

  async embed(
    texts: string[],
    options?: Partial<GoogleEmbeddingOptions>
  ): Promise<EmbeddingResponse> {
    if (texts.length === 0) {
      throw new Error('At least one text must be provided');
    }

    const finalOptions = { ...this.defaultOptions, ...options };
    const model = finalOptions.model || this.defaultOptions.model;

    if (!model) {
      throw new Error('Model is required. Provide it at construction time or when calling embed.');
    }

    const cleanModel = model.replace(/^models\//, '');
    const embeddings: EmbeddingResult[] = [];

    // Google processes one text at a time
    for (let i = 0; i < texts.length; i++) {
      const requestBody = {
        content: { parts: [{ text: texts[i] }] },
      } as Record<string, unknown>;

      if (finalOptions.taskType) requestBody.taskType = finalOptions.taskType;
      if (finalOptions.title) requestBody.title = finalOptions.title;
      if (finalOptions.dimensions) requestBody.outputDimensionality = finalOptions.dimensions;
      if (finalOptions.outputDtype) requestBody.outputDtype = finalOptions.outputDtype;

      const response = (await this.client.post(
        `/models/${cleanModel}:embedContent?key=${finalOptions.apiKey}`,
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
}
