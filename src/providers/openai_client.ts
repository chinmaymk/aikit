import { APIClient } from './api';
import { OpenAI } from './openai';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIClientFactory {
  static createClient(config: OpenAI.BaseConfig): APIClient {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.organization) headers['OpenAI-Organization'] = config.organization;
    if (config.project) headers['OpenAI-Project'] = config.project;

    return new APIClient(
      config.baseURL ?? OPENAI_BASE_URL,
      headers,
      config.timeout,
      config.maxRetries,
      config.mutateHeaders
    );
  }
}
