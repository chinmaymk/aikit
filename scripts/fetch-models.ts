interface ModelInfo {
  provider: string;
  models: string[];
  timestamp: string;
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIResponse {
  data: OpenAIModel[];
  object: string;
}

interface GoogleModel {
  name: string;
  baseModelId: string;
  version: string;
  displayName: string;
}

interface GoogleResponse {
  models: GoogleModel[];
}

interface AnthropicModel {
  id: string;
  type: string;
  display_name: string;
  created_at: string;
}

interface AnthropicResponse {
  data: AnthropicModel[];
  has_more: boolean;
  first_id: string;
  last_id: string;
}

interface ProviderConfig {
  url: string;
  headers: (key: string) => Record<string, string>;
  transform: (data: OpenAIResponse | GoogleResponse | AnthropicResponse) => string[];
}

const providers: Record<string, ProviderConfig> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (key: string) => ({
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    transform: (data: OpenAIResponse | GoogleResponse | AnthropicResponse) => {
      const openaiData = data as OpenAIResponse;
      return openaiData.data.map(m => m.id);
    },
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1/models',
    headers: (key: string) => ({
      'x-goog-api-key': key,
      'Content-Type': 'application/json',
    }),
    transform: (data: OpenAIResponse | GoogleResponse | AnthropicResponse) => {
      const googleData = data as GoogleResponse;
      return googleData.models.map(m => m.name);
    },
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    headers: (key: string) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    transform: (data: OpenAIResponse | GoogleResponse | AnthropicResponse) => {
      const anthropicData = data as AnthropicResponse;
      return anthropicData.data.map(m => m.id);
    },
  },
};

async function fetchModelsForProvider(provider: string, apiKey: string): Promise<string[]> {
  const config = providers[provider];

  const response = await fetch(config.url, {
    headers: config.headers(apiKey),
  });

  if (!response.ok) {
    throw new Error(`${provider} API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OpenAIResponse | GoogleResponse | AnthropicResponse;
  return config.transform(data);
}

function getApiKey(provider: string): string {
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!apiKey) {
    throw new Error(`Missing ${provider} API key: ${provider.toUpperCase()}_API_KEY`);
  }
  return apiKey;
}

async function fetchSingleProvider(provider: string): Promise<ModelInfo> {
  const apiKey = getApiKey(provider);
  const models = await fetchModelsForProvider(provider, apiKey);

  console.error(`Found ${models.length} models for ${provider}`);

  return {
    provider,
    models,
    timestamp: new Date().toISOString(),
  };
}

async function fetchAllProviders(): Promise<ModelInfo[]> {
  const results = await Promise.allSettled(
    Object.keys(providers).map(async provider => {
      try {
        const apiKey = getApiKey(provider);
        const models = await fetchModelsForProvider(provider, apiKey);

        console.error(`Found ${models.length} models for ${provider}`);

        return {
          provider,
          models,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(
          `Failed to fetch ${provider} models:`,
          error instanceof Error ? error.message : error
        );
        throw error;
      }
    })
  );

  return results
    .filter((result): result is PromiseFulfilledResult<ModelInfo> => result.status === 'fulfilled')
    .map(result => result.value);
}

function parseArguments(): string {
  const provider = process.argv[2];

  if (!provider) {
    console.error('Usage: npx tsx fetch-models.ts <provider|all>');
    console.error('Available providers:', Object.keys(providers).join(', '), 'or "all"');
    process.exit(1);
  }

  if (provider.toLowerCase() === 'all') {
    return 'all';
  }

  const validProvider = Object.keys(providers).find(
    p => p.toLowerCase() === provider.toLowerCase()
  );
  if (!validProvider) {
    console.error(`Invalid provider: ${provider}`);
    console.error('Available providers:', Object.keys(providers).join(', '), 'or "all"');
    process.exit(1);
  }

  return validProvider;
}

async function main() {
  try {
    const provider = parseArguments();

    if (provider === 'all') {
      const results = await fetchAllProviders();
      console.log(JSON.stringify(results, null, 2));
      console.error(
        `Successfully fetched models from ${results.length}/${Object.keys(providers).length} provider(s)`
      );
    } else {
      const result = await fetchSingleProvider(provider);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
