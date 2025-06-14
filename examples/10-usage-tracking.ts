/**
 * Usage Tracking Example
 *
 * This example demonstrates how to track token usage across all providers.
 * Useful for cost monitoring, optimization, and understanding your AI consumption patterns.
 */

import {
  createProvider,
  createOpenAIEmbeddings,
  userText,
  collectDeltas,
  processStream,
} from '../src';
import { printSectionHeader } from './utils';

async function demonstrateOpenAIUsageTracking() {
  printSectionHeader('OpenAI Usage Tracking');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found in environment variables');
    return;
  }

  const openai = createProvider('openai', { apiKey });

  // Basic usage tracking
  console.log('📊 Basic Usage Tracking:');
  const result = await collectDeltas(
    openai([userText('What is TypeScript?')], {
      model: 'gpt-4o-mini',
      maxOutputTokens: 50,
      includeUsage: true, // Enable usage tracking
    })
  );

  console.log('Response:', result.content);
  console.log('Usage:', result.usage);
  // Output includes: inputTokens, outputTokens, totalTokens, timeToFirstToken, totalTime

  // Demonstrate timing analysis
  if (result.usage?.totalTime && result.usage?.timeToFirstToken) {
    const generationTime = result.usage.totalTime - result.usage.timeToFirstToken;
    console.log(`⏱️  Timing Analysis:`);
    console.log(`   Time to first token: ${result.usage.timeToFirstToken}ms`);
    console.log(`   Total generation time: ${result.usage.totalTime}ms`);
    console.log(`   Time to generate remaining content: ${generationTime}ms`);

    if (result.usage.outputTokens) {
      const throughput = result.usage.outputTokens / (result.usage.totalTime / 1000);
      console.log(`🚀 Throughput: ${throughput.toFixed(1)} tokens/second`);
    }
  }
  console.log();

  // Reasoning model usage (more expensive)
  console.log('🧠 Reasoning Model Usage:');
  try {
    const reasoningResult = await collectDeltas(
      openai([userText('Solve: 2x + 5 = 15')], {
        model: 'o1-mini',
        reasoning: { effort: 'low' },
      })
    );

    console.log('Reasoning Response:', reasoningResult.content);
    console.log('Reasoning Usage:', reasoningResult.usage);
    // Shows reasoningTokens which are more expensive!
  } catch (error) {
    console.log('Reasoning model not available:', error);
  }
  console.log();
}

async function demonstrateAnthropicUsageTracking() {
  printSectionHeader('Anthropic Usage Tracking');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⚠️  ANTHROPIC_API_KEY not found in environment variables');
    return;
  }

  const anthropic = createProvider('anthropic', { apiKey });

  const result = await collectDeltas(
    anthropic([userText('Write a haiku about programming')], {
      model: 'claude-3-5-haiku-20241022',
      maxOutputTokens: 100,
    })
  );

  console.log('Response:', result.content);
  console.log('Usage:', result.usage);
  // Anthropic typically provides outputTokens and timeToFirstToken
  console.log();
}

async function demonstrateGoogleUsageTracking() {
  printSectionHeader('Google Usage Tracking');

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  GOOGLE_API_KEY not found in environment variables');
    return;
  }

  const google = createProvider('google', { apiKey });

  const result = await collectDeltas(
    google([userText('Explain machine learning briefly')], {
      model: 'gemini-1.5-flash',
      maxOutputTokens: 100,
    })
  );

  console.log('Response:', result.content);
  console.log('Usage:', result.usage);
  // Google provides comprehensive usage: inputTokens, outputTokens, totalTokens, timeToFirstToken
  console.log();
}

async function demonstrateStreamingUsageTracking() {
  printSectionHeader('Streaming Usage Tracking');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found in environment variables');
    return;
  }

  const openai = createProvider('openai', { apiKey });

  console.log('📡 Streaming with usage tracking:');

  await processStream(
    openai([userText('Count to 10')], {
      model: 'gpt-4o-mini',
      includeUsage: true,
    }),
    {
      onDelta: delta => process.stdout.write(delta),
      onUsage: usage => {
        console.log('\n📊 Usage received:', usage);
        if (usage?.timeToFirstToken) {
          console.log(`⏱️  Time to first token: ${usage.timeToFirstToken}ms`);
        }
      },
    }
  );

  console.log('\n');
}

async function demonstrateEmbeddingUsageTracking() {
  printSectionHeader('Embedding Usage Tracking');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found in environment variables');
    return;
  }

  const embeddings = createOpenAIEmbeddings({ apiKey });

  const result = await embeddings(['Hello world', 'Machine learning', 'TypeScript'], {
    model: 'text-embedding-3-small',
  });

  console.log('Embeddings generated:', result.embeddings.length);
  console.log('First embedding dimensions:', result.embeddings[0].values.length);
  console.log('Usage:', result.usage);
  // Shows inputTokens, totalTokens, and truncated status
  console.log();
}

async function main() {
  console.log('🏷️  AIKit Usage Tracking Examples\n');

  try {
    await demonstrateOpenAIUsageTracking();
    await demonstrateAnthropicUsageTracking();
    await demonstrateGoogleUsageTracking();
    await demonstrateStreamingUsageTracking();
    await demonstrateEmbeddingUsageTracking();

    console.log('✅ All usage tracking examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

main().catch(console.error);
