/**
 * Smoke Tests for Usage Tracking
 *
 * These tests make real API calls to verify usage tracking works correctly
 * across all providers with different generation options.
 */

import {
  createProvider,
  createOpenAIEmbeddings,
  createGoogleEmbeddings,
  userText,
  systemText,
  collectDeltas,
  type GenerationProviderType,
  type GenerationUsage,
} from '@chinmaymk/aikit';

interface ProviderConfig {
  type: GenerationProviderType;
  name: string;
  models: string[];
  supportsUsage: boolean;
  usageFields: (keyof GenerationUsage)[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    type: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o-mini'],
    supportsUsage: true,
    usageFields: ['inputTokens', 'outputTokens', 'totalTokens', 'timeToFirstToken'],
  },
  {
    type: 'anthropic',
    name: 'Anthropic',
    models: ['claude-3-5-haiku-20241022'],
    supportsUsage: true,
    usageFields: ['outputTokens', 'timeToFirstToken'],
  },
  {
    type: 'google',
    name: 'Google',
    models: ['gemini-1.5-flash'],
    supportsUsage: true,
    usageFields: ['inputTokens', 'outputTokens', 'totalTokens', 'timeToFirstToken'],
  },
];

const getApiKey = (providerType: GenerationProviderType): string | undefined => {
  return process.env[`${providerType.toUpperCase()}_API_KEY`];
};

const validateUsage = (
  usage: GenerationUsage | undefined,
  expectedFields: (keyof GenerationUsage)[]
): void => {
  expect(usage).toBeDefined();

  if (usage) {
    for (const field of expectedFields) {
      expect(usage[field]).toBeDefined();
      expect(typeof usage[field]).toBe('number');
      expect(usage[field]).toBeGreaterThan(0);
    }
  }
};

describe('Usage Tracking Smoke Tests', () => {
  const TEST_TIMEOUT = 30000;

  describe.each(PROVIDERS)(
    '$name Provider Usage',
    ({ type, name, models, supportsUsage, usageFields }) => {
      const apiKey = getApiKey(type);

      beforeAll(() => {
        if (!apiKey) {
          console.warn(
            `Skipping ${name} usage tests: No API key found (${type.toUpperCase()}_API_KEY)`
          );
        }
      });

      describe.each(models)('Model: %s', model => {
        (apiKey ? test : test.skip)(
          'should return usage information for basic generation',
          async () => {
            console.log(`Testing ${name} ${model} - Basic Usage Tracking:`);

            const provider = createProvider(type, { apiKey: apiKey! });
            const messages = [
              systemText('You are a helpful assistant. Be concise.'),
              userText('What is TypeScript? Answer in one sentence.'),
            ];

            const options: any = {
              model,
              maxOutputTokens: 50,
              temperature: 0.1,
            };

            // Enable usage tracking for OpenAI
            if (type === 'openai') {
              options.includeUsage = true;
            }

            const result = await collectDeltas(provider(messages, options));

            expect(result.content).toBeDefined();
            expect(result.content.length).toBeGreaterThan(0);

            if (supportsUsage) {
              console.log(`${name} usage:`, result.usage);
              validateUsage(result.usage, usageFields);
            }
          },
          TEST_TIMEOUT
        );

        (apiKey && type === 'openai' ? test : test.skip)(
          'should track reasoning tokens for o-series models',
          async () => {
            console.log(`Testing OpenAI o1-mini - Reasoning Usage:`);

            const provider = createProvider('openai', { apiKey: apiKey! });
            const messages = [userText('Solve: What is 15 * 23? Show your work briefly.')];

            const result = await collectDeltas(
              provider(messages, {
                model: 'o1-mini',
                reasoning: { effort: 'low' },
              })
            );

            expect(result.content).toBeDefined();
            console.log('o1-mini usage:', result.usage);

            if (result.usage) {
              expect(result.usage.outputTokens).toBeGreaterThan(0);
              // Reasoning tokens should be present for o-series models
              if (result.usage.reasoningTokens) {
                expect(result.usage.reasoningTokens).toBeGreaterThan(0);
                console.log(`Reasoning tokens used: ${result.usage.reasoningTokens}`);
              }
            }
          },
          TEST_TIMEOUT
        );

        (apiKey && type === 'openai' ? test : test.skip)(
          'should handle usage with longer prompts',
          async () => {
            console.log(`Testing ${name} ${model} - Long Prompt Usage:`);

            const provider = createProvider(type, { apiKey: apiKey! });
            const longPrompt = `
            Here is a detailed context about TypeScript:
            TypeScript is a programming language developed and maintained by Microsoft.
            It is a strict syntactical superset of JavaScript and adds optional static type checking to the language.
            TypeScript is designed for the development of large applications and transcompiles to JavaScript.
            As TypeScript is a superset of JavaScript, existing JavaScript programs are also valid TypeScript programs.
            
            Given this context, please explain the main benefits of using TypeScript over JavaScript.
            Be comprehensive but concise in your response.
          `.trim();

            const messages = [userText(longPrompt)];

            const result = await collectDeltas(
              provider(messages, {
                model,
                maxOutputTokens: 150,
                temperature: 0.1,
                includeUsage: true,
              })
            );

            expect(result.content).toBeDefined();
            console.log(`${name} long prompt usage:`, result.usage);

            if (result.usage) {
              expect(result.usage.inputTokens).toBeGreaterThan(50); // Long prompt should have more input tokens
              expect(result.usage.outputTokens).toBeGreaterThan(0);
            }
          },
          TEST_TIMEOUT
        );

        (apiKey ? test : test.skip)(
          'should track time to first token',
          async () => {
            console.log(`Testing ${name} ${model} - Time to First Token:`);

            const provider = createProvider(type, { apiKey: apiKey! });
            const messages = [userText('Say hello!')];

            const options: any = {
              model,
              maxOutputTokens: 20,
              temperature: 0.1,
            };

            // Enable usage tracking for OpenAI
            if (type === 'openai') {
              options.includeUsage = true;
            }

            const result = await collectDeltas(provider(messages, options));

            expect(result.content).toBeDefined();
            console.log(`${name} timeToFirstToken:`, result.usage?.timeToFirstToken);

            if (result.usage?.timeToFirstToken !== undefined) {
              // Time to first token should be a reasonable value (typically between 100ms and 10 seconds)
              expect(result.usage.timeToFirstToken).toBeGreaterThan(0);
              expect(result.usage.timeToFirstToken).toBeLessThan(30000); // Less than 30 seconds
              expect(typeof result.usage.timeToFirstToken).toBe('number');
            }
          },
          TEST_TIMEOUT
        );
      });
    }
  );

  describe('Embedding Usage Tracking', () => {
    const openaiKey = getApiKey('openai');
    const googleKey = getApiKey('google');

    (openaiKey ? test : test.skip)(
      'should track OpenAI embedding usage',
      async () => {
        console.log('Testing OpenAI Embeddings - Usage Tracking:');

        const embeddings = createOpenAIEmbeddings({
          apiKey: openaiKey!,
        });

        const texts = [
          'Machine learning is a subset of artificial intelligence.',
          'TypeScript adds static typing to JavaScript.',
          'React is a popular JavaScript library for building user interfaces.',
        ];

        const result = await embeddings(texts, {
          model: 'text-embedding-3-small',
        });

        expect(result.embeddings).toHaveLength(3);
        expect(result.embeddings[0].values.length).toBeGreaterThan(0);

        console.log('OpenAI embedding usage:', result.usage);

        if (result.usage) {
          expect(result.usage.inputTokens).toBeGreaterThan(0);
          expect(result.usage.totalTokens).toBeGreaterThan(0);
          // truncated field is optional
          if (result.usage.truncated !== undefined) {
            expect(typeof result.usage.truncated).toBe('boolean');
          }
        }
      },
      TEST_TIMEOUT
    );

    (googleKey ? test : test.skip)(
      'should handle Google embedding usage (when available)',
      async () => {
        console.log('Testing Google Embeddings - Usage Tracking:');

        const embeddings = createGoogleEmbeddings({
          apiKey: googleKey!,
        });

        const result = await embeddings(['Hello, world!'], {
          model: 'text-embedding-004',
        });

        expect(result.embeddings).toHaveLength(1);
        expect(result.embeddings[0].values.length).toBeGreaterThan(0);

        console.log('Google embedding usage:', result.usage);

        // Google embeddings may or may not provide usage information
        if (result.usage) {
          if (result.usage.inputTokens) {
            expect(result.usage.inputTokens).toBeGreaterThan(0);
          }
          if (result.usage.totalTokens) {
            expect(result.usage.totalTokens).toBeGreaterThan(0);
          }
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Usage Data Validation', () => {
    const openaiKey = getApiKey('openai');

    (openaiKey ? test : test.skip)(
      'should validate usage data consistency',
      async () => {
        console.log('Testing Usage Data Consistency:');

        const provider = createProvider('openai', { apiKey: openaiKey! });
        const messages = [userText('Count to 5.')];

        const result = await collectDeltas(
          provider(messages, {
            model: 'gpt-4o-mini',
            maxOutputTokens: 30,
            includeUsage: true,
          })
        );

        if (result.usage) {
          console.log('Usage validation:', result.usage);

          // Basic validation
          expect(result.usage.inputTokens).toBeGreaterThan(0);
          expect(result.usage.outputTokens).toBeGreaterThan(0);
          expect(result.usage.totalTokens).toBeGreaterThan(0);

          // Consistency checks
          if (result.usage.inputTokens && result.usage.outputTokens && result.usage.totalTokens) {
            const calculatedTotal = result.usage.inputTokens + result.usage.outputTokens;

            // Total should match or include additional reasoning tokens
            if (result.usage.reasoningTokens) {
              expect(result.usage.totalTokens).toBe(calculatedTotal + result.usage.reasoningTokens);
            } else {
              expect(result.usage.totalTokens).toBe(calculatedTotal);
            }
          }

          // All token counts should be positive integers
          Object.entries(result.usage).forEach(([key, value]) => {
            if (typeof value === 'number') {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(Number.isInteger(value)).toBe(true);
            }
          });
        }
      },
      TEST_TIMEOUT
    );
  });
});
