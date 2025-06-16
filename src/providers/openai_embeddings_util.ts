import type { EmbeddingResponse, EmbeddingResult } from '../types';
import { OpenAI } from './openai';

const MAX_EMBEDDING_BATCH_SIZE = 2048;

export class OpenAIEmbeddingUtils {
  static validateRequest(texts: string[]): void {
    if (texts.length === 0) {
      throw new Error('At least one text must be provided');
    }

    if (texts.length > MAX_EMBEDDING_BATCH_SIZE) {
      throw new Error(
        `OpenAI embedding API supports up to ${MAX_EMBEDDING_BATCH_SIZE} texts per request`
      );
    }

    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        throw new Error(`Text at index ${i} must be a string`);
      }
    }
  }

  static transformResponse(response: OpenAI.Embeddings.APIResponse): EmbeddingResponse {
    const embeddings: EmbeddingResult[] = response.data.map((item, index) => ({
      values: [...item.embedding],
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
