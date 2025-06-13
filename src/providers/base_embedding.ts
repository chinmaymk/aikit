import type { EmbeddingProvider, EmbeddingResponse, EmbeddingProviderOptions } from '../types';
import { APIClient } from './api';

/**
 * Base class for embedding providers with common functionality.
 */
export abstract class BaseEmbeddingProvider<T extends EmbeddingProviderOptions>
  implements EmbeddingProvider<T>
{
  protected client: APIClient;
  protected defaultOptions: T;

  constructor(options: T) {
    this.validateOptions(options);
    this.defaultOptions = options;
    this.client = new APIClient(
      this.getBaseUrl(options),
      this.getHeaders(options),
      options.timeout,
      options.maxRetries
    );
  }

  protected validateOptions(options: T): void {
    if (!options.apiKey) {
      throw new Error(`${this.getProviderName()} API key is required`);
    }
  }

  protected validateTexts(texts: string[]): void {
    if (texts.length === 0) {
      throw new Error('At least one text must be provided');
    }
  }

  protected getModel(options?: Partial<T>): string {
    const model = options?.model || this.defaultOptions.model;
    if (!model) {
      throw new Error('Model is required. Provide it at construction time or when calling embed.');
    }
    return model;
  }

  protected mergeOptions(callOptions?: Partial<T>): T {
    return { ...this.defaultOptions, ...callOptions } as T;
  }

  abstract embed(texts: string[], options?: Partial<T>): Promise<EmbeddingResponse>;
  abstract getProviderName(): string;
  abstract getBaseUrl(options: T): string;
  abstract getHeaders(options: T): Record<string, string>;
}
