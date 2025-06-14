/**
 * Reasoning Models Example
 *
 * This example demonstrates how to access the reasoning process of models
 * that support it, such as Claude (Anthropic) and o-series models (OpenAI).
 *
 * Run: npx tsx examples/07-reasoning-models.ts
 */

import {
  createAnthropic,
  createOpenAI,
  userText,
  collectDeltas,
  processStream,
} from '@chinmaymk/aikit';
import { printSectionHeader } from './utils.js';
import { createProvider } from '@chinmaymk/aikit';

async function step1_AnthropicReasoning() {
  printSectionHeader('Anthropic Reasoning (Claude 3.5 Sonnet with Thinking)');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return;
  }

  const anthropic = createAnthropic({
    apiKey: apiKey!,
  });

  const question = userText(
    'Solve this step by step: If a train travels 60 miles in 45 minutes, what is its speed in miles per hour?'
  );

  console.log('Question:', (question.content[0] as { text: string }).text);
  console.log('\n--- Streaming with Real-time Reasoning ---');

  await processStream(
    anthropic([question], {
      model: 'claude-3-5-sonnet-20241022',
      thinking: { type: 'enabled', budget_tokens: 1024 },
      maxOutputTokens: 500,
    }),
    {
      onReasoning: reasoning => {
        if (reasoning.delta) {
          process.stdout.write(`[REASONING] ${reasoning.delta}`);
        }
      },
      onDelta: delta => {
        process.stdout.write(delta);
      },
      onFinish: () => {
        console.log('\n\n--- Complete Result ---');
      },
    }
  );

  // Also collect the complete result
  const result = await collectDeltas(
    anthropic([question], {
      model: 'claude-3-5-sonnet-20241022',
      thinking: { type: 'enabled', budget_tokens: 1024 },
      maxOutputTokens: 500,
    })
  );

  console.log('Final Answer:', result.content);
  console.log('\nComplete Reasoning Process:');
  console.log(result.reasoning || 'No reasoning captured');
  console.log('\n' + '='.repeat(80) + '\n');
}

async function step2_OpenAIReasoning() {
  printSectionHeader('OpenAI Reasoning (o1-preview and o1-mini)');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return;
  }

  const openai = createOpenAI({
    apiKey: apiKey!,
  });

  const question = userText(
    'Explain the concept of recursion in programming with a simple example.'
  );

  console.log('Question:', (question.content[0] as { text: string }).text);
  console.log('\n--- Streaming with Reasoning ---');

  let hasReasoning = false;

  await processStream(
    openai([question], {
      model: 'o1-mini',
      reasoning: { effort: 'medium' },
      maxOutputTokens: 600,
    }),
    {
      onReasoning: reasoning => {
        if (reasoning.delta) {
          hasReasoning = true;
          process.stdout.write(`[REASONING] ${reasoning.delta}`);
        }
      },
      onDelta: delta => {
        process.stdout.write(delta);
      },
      onFinish: () => {
        console.log('\n\n--- Complete Result ---');
      },
    }
  );

  if (!hasReasoning) {
    // No reasoning content detected
  }

  // Collect complete result
  const result = await collectDeltas(
    openai([question], {
      model: 'o1-mini',
      reasoning: { effort: 'medium' },
      maxOutputTokens: 600,
    })
  );

  console.log('Final Answer:', result.content);
  if (result.reasoning) {
    console.log('\nComplete Reasoning Process:');
    console.log(result.reasoning);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  if (!result.usage?.reasoningTokens) {
    return;
  }
}

async function step3_CompareReasoningModels() {
  printSectionHeader('Comparing Reasoning Models');

  const providers = [
    {
      name: 'Anthropic Claude 3.5 Sonnet (Thinking)',
      type: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      keyEnv: 'ANTHROPIC_API_KEY',
    },
    {
      name: 'OpenAI o1-mini',
      type: 'openai' as const,
      model: 'o1-mini',
      keyEnv: 'OPENAI_API_KEY',
    },
  ];

  const question = `
  Three friends Alice, Bob, and Charlie are sharing 12 apples.
  Alice gets twice as many as Bob.
  Charlie gets 2 more than Bob.
  How many apples does each person get?
  Show your reasoning step by step.
  `;

  for (const provider of providers) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey) continue;

    try {
      const providerInstance = createProvider(provider.type, { apiKey });

      const options: any = {
        model: provider.model,
        maxOutputTokens: 500,
        temperature: 0.1,
      };

      if (provider.type === 'anthropic') {
        options.thinking = { type: 'enabled', budget_tokens: 2048 };
      }

      const result = await collectDeltas(providerInstance([userText(question)], options));

      console.log(`\n${provider.name}:`);
      console.log(result.content);

      if (result.reasoning) {
        // Reasoning not shown in streaming API
      }

      if (result.usage) {
        console.log(`\nTokens: ${result.usage.outputTokens} output`);
        if (result.usage.reasoningTokens) {
          console.log(`Reasoning: ${result.usage.reasoningTokens} tokens`);
        }
      }
    } catch {
      // Skip providers with errors
    }
  }
}

async function main() {
  console.log('🧠 AIKit Reasoning Models Example\n');
  console.log('This example demonstrates how to access the reasoning process of AI models.\n');

  try {
    await step1_AnthropicReasoning();
    await step2_OpenAIReasoning();
    await step3_CompareReasoningModels();

    console.log('✅ Reasoning examples completed!');
  } catch (error) {
    console.error('Error running reasoning examples:', error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
