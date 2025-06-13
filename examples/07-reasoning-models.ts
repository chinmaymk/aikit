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

async function demonstrateAnthropicReasoning() {
  printSectionHeader('Anthropic Claude Reasoning');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('Skipping Anthropic example - no API key provided\n');
    return;
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
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

async function demonstrateOpenAIReasoning() {
  printSectionHeader('OpenAI o-series Reasoning');

  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping OpenAI example - no API key provided\n');
    return;
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
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
    console.log('Note: No reasoning content detected. This might be because:');
    console.log('- The model is not an o-series model (o1-mini, o1-preview, etc.)');
    console.log('- The reasoning tokens are not exposed in the streaming API');
    console.log("- Your API tier doesn't include reasoning token access\n");
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
}

async function demonstrateReasoningComparison() {
  printSectionHeader('Reasoning Across Providers');

  const mathProblem = userText('A farmer has 17 sheep. All but 9 die. How many sheep are left?');

  console.log('Math Problem:', (mathProblem.content[0] as { text: string }).text);
  console.log("\nLet's see how different reasoning models approach this...\n");

  // Test with different providers that support reasoning
  const providers = [
    {
      name: 'Anthropic Claude',
      condition: () => !!process.env.ANTHROPIC_API_KEY,
      test: async () => {
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY!,
        });

        const result = await collectDeltas(
          anthropic([mathProblem], {
            model: 'claude-3-5-sonnet-20241022',
            thinking: { type: 'enabled', budget_tokens: 512 },
            maxOutputTokens: 300,
          })
        );

        console.log("🤖 Claude's Answer:", result.content);
        if (result.reasoning) {
          console.log("🧠 Claude's Reasoning:", result.reasoning.substring(0, 200) + '...');
        }
      },
    },
    {
      name: 'OpenAI o1-mini',
      condition: () => !!process.env.OPENAI_API_KEY,
      test: async () => {
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        });

        const result = await collectDeltas(
          openai([mathProblem], {
            model: 'o1-mini',
            reasoning: { effort: 'low' },
            maxOutputTokens: 300,
          })
        );

        console.log("🤖 o1-mini's Answer:", result.content);
        if (result.reasoning) {
          console.log("🧠 o1-mini's Reasoning:", result.reasoning.substring(0, 200) + '...');
        } else {
          console.log("🧠 o1-mini's Reasoning: Not accessible via streaming API");
        }
      },
    },
  ];

  for (const provider of providers) {
    if (provider.condition()) {
      console.log(`\n--- ${provider.name} ---`);
      try {
        await provider.test();
      } catch (error) {
        console.log(`❌ Error with ${provider.name}:`, (error as Error).message);
      }
    } else {
      console.log(`\n--- ${provider.name} ---`);
      console.log(`Skipping ${provider.name} - no API key provided`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  console.log('🧠 AIKit Reasoning Models Example\n');
  console.log('This example demonstrates how to access the reasoning process of AI models.\n');

  try {
    await demonstrateAnthropicReasoning();
    await demonstrateOpenAIReasoning();
    await demonstrateReasoningComparison();

    console.log('✅ Reasoning examples completed!');
    console.log('\n💡 Key Takeaways:');
    console.log('• Anthropic Claude: Use thinking: { type: "enabled", budget_tokens: N }');
    console.log('• OpenAI o-series: Use reasoning: { effort: "low"|"medium"|"high" }');
    console.log('• Access reasoning via result.reasoning or onReasoning callback');
    console.log('• Not all models support reasoning - check provider documentation');
  } catch (error) {
    console.error('❌ Error running reasoning examples:', error);
    console.log('\n💡 Make sure you have the required API keys set:');
    console.log('export ANTHROPIC_API_KEY="your-key-here"');
    console.log('export OPENAI_API_KEY="your-key-here"');
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
