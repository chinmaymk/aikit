/**
 * Smoke Tests for Generation Usage Tracking
 *
 * These tests make real API calls to verify usage tracking works correctly
 * across all providers with different generation options.
 */

import {
  createProvider,
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

describe('Generation Usage Tracking Smoke Tests', () => {
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
              temperature: 0.1,
            };

            if (type === 'openai') {
              options.includeUsage = true;
            }

            const result = await collectDeltas(provider(messages, options));

            expect(result.content).toBeDefined();

            if (supportsUsage && result.usage) {
              console.log(`${name} TTFT:`, result.usage.timeToFirstToken);
              expect(result.usage.timeToFirstToken).toBeGreaterThan(0);
            }
          },
          TEST_TIMEOUT
        );
      });
    }
  );
});
