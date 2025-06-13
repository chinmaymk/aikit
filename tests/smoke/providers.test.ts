/**
 * Smoke Tests for AIKit Providers
 *
 * These tests make real API calls to verify all providers work correctly
 * with the AIKit interface for basic generation, tool calling, reasoning, and embeddings.
 */

import { createProvider, createOpenAIEmbeddings, createGoogleEmbeddings } from '../../src/factory';
import {
  conversation,
  createTool,
  assistantWithToolCalls,
  toolResult,
  printStream,
} from '../../src/utils';
import type { GenerationProviderType } from '../../src/index';

interface ProviderConfig {
  type: GenerationProviderType;
  name: string;
  models: string[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    type: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4.1-2025-04-14'],
  },
  {
    type: 'anthropic',
    name: 'Anthropic',
    models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219'],
  },
  {
    type: 'google',
    name: 'Google',
    models: ['gemini-2.5-pro-preview-06-05', 'gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash'],
  },
];

const calculatorService = (args: Record<string, unknown>) => {
  const { operation, a, b } = args;

  if (typeof operation !== 'string' || typeof a !== 'number' || typeof b !== 'number') {
    return { error: 'Invalid arguments: operation must be string, a and b must be numbers' };
  }

  switch (operation) {
    case 'add':
      return { result: a + b, operation: `${a} + ${b}` };
    case 'multiply':
      return { result: a * b, operation: `${a} × ${b}` };
    default:
      return { error: `Unknown operation: ${operation}` };
  }
};

const getApiKey = (providerType: GenerationProviderType): string | undefined => {
  return process.env[`${providerType.toUpperCase()}_API_KEY`];
};

describe('Provider Smoke Tests', () => {
  // Extend timeout for real API calls
  const TEST_TIMEOUT = 30000;

  describe.each(PROVIDERS)('$name Provider', ({ type, name, models }) => {
    const apiKey = getApiKey(type);

    beforeAll(() => {
      if (!apiKey) {
        console.warn(`Skipping ${name} tests: No API key found (${type.toUpperCase()}_API_KEY)`);
      }
    });

    describe.each(models)('Model: %s', model => {
      (apiKey ? test : test.skip)(
        'should perform basic text generation',
        async () => {
          console.log(`Testing ${name} ${model} - Basic Generation:`);

          const provider = createProvider(type, { apiKey });
          const messages = conversation()
            .system('You are a helpful assistant. Keep responses concise.')
            .user('What is 2 + 2? Answer in one sentence.')
            .build();

          const result = await printStream(
            provider.generate(messages, {
              model,
              maxOutputTokens: 100,
              temperature: 0.1,
            })
          );

          expect(result.content).toBeDefined();
          expect(typeof result.content).toBe('string');
          expect(result.content.length).toBeGreaterThan(0);
        },
        TEST_TIMEOUT
      );

      (apiKey ? test : test.skip)(
        'should handle tool calling',
        async () => {
          console.log(`Testing ${name} ${model} - Tool Calling:`);

          const provider = createProvider(type, { apiKey });
          const calculatorTool = createTool('calculator', 'Perform basic mathematical operations', {
            type: 'object',
            properties: {
              operation: { type: 'string', enum: ['add', 'multiply'] },
              a: { type: 'number' },
              b: { type: 'number' },
            },
            required: ['operation', 'a', 'b'],
          });

          const messages = conversation()
            .system('You are a helpful assistant. Use the available tools when needed.')
            .user('What is 15 multiplied by 4?')
            .build();

          const result = await printStream(
            provider.generate(messages, {
              model,
              tools: [calculatorTool],
              maxOutputTokens: 500,
              temperature: 0.1,
            })
          );

          expect(result.content).toBeDefined();

          if (result.toolCalls?.length) {
            messages.push(assistantWithToolCalls(result.content, result.toolCalls));

            for (const toolCall of result.toolCalls) {
              const toolResultValue = JSON.stringify(calculatorService(toolCall.arguments));
              messages.push(toolResult(toolCall.id, toolResultValue));
            }

            console.log(`${name} ${model} - Final Response:`);
            const finalResult = await printStream(
              provider.generate(messages, {
                model,
                maxOutputTokens: 300,
                temperature: 0.1,
              })
            );

            expect(finalResult.content).toBeDefined();
          }
        },
        TEST_TIMEOUT
      );

      (apiKey ? test : test.skip)(
        'should handle reasoning (if supported)',
        async () => {
          console.log(`Testing ${name} ${model} - Reasoning:`);

          const provider = createProvider(type, { apiKey });
          const messages = conversation()
            .system('You are a helpful assistant. Think step by step.')
            .user('A farmer has 17 sheep. All but 9 die. How many sheep are left?')
            .build();

          const options = {
            model,
            maxOutputTokens: 1500,
            temperature: type === 'anthropic' ? 1 : 0.1,
            ...(type === 'anthropic' && {
              thinking: { type: 'enabled' as const, budget_tokens: 1024 },
            }),
            ...(type === 'openai' &&
              model.startsWith('o1') && { reasoning: { effort: 'low' as const } }),
          };

          const result = await printStream(provider.generate(messages, options));

          expect(result.content).toBeDefined();
          expect(result.content.length).toBeGreaterThan(0);
        },
        TEST_TIMEOUT
      );
    });

    (apiKey && type !== 'anthropic' ? test : test.skip)(
      'should handle embeddings (if supported)',
      async () => {
        console.log(`Testing ${name} - Embeddings...`);

        let embeddings;
        if (type === 'openai') {
          embeddings = createOpenAIEmbeddings({ apiKey, model: 'text-embedding-3-small' });
        } else if (type === 'google') {
          embeddings = createGoogleEmbeddings({
            apiKey,
            model: 'text-embedding-004',
            taskType: 'SEMANTIC_SIMILARITY',
          });
        } else {
          return;
        }

        const testTexts = ['Hello, world!', 'How are you today?'];
        const result = await embeddings.embed(testTexts);

        expect(result.embeddings).toBeDefined();
        expect(result.embeddings).toHaveLength(testTexts.length);
        expect(result.embeddings[0].values).toBeDefined();
        expect(result.embeddings[0].values.length).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );
  });
});
