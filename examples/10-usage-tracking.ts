import {
  createProvider,
  createOpenAIEmbeddings,
  createGoogleEmbeddings,
  userText,
  systemText,
  collectDeltas,
  processStream,
} from '../src';
import { printSectionHeader } from './utils';

// Mock API keys for demo (use your real keys)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'demo-key';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'demo-key';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'demo-key';

/**
 * Usage Tracking Example
 *
 * This example demonstrates how to track token usage across all providers.
 * Useful for cost monitoring, optimization, and understanding your AI consumption patterns.
 */

async function demonstrateOpenAIUsageTracking() {
  printSectionHeader('OpenAI Usage Tracking');

  const openai = createProvider('openai', { apiKey: OPENAI_API_KEY });

  const messages = [
    systemText('You are a helpful assistant. Keep responses brief.'),
    userText('Explain machine learning in 3 sentences.'),
  ];

  console.log('🔍 Tracking OpenAI usage with streaming...');

  await processStream(
    openai(messages, {
      model: 'gpt-4o-mini',
      maxOutputTokens: 150,
      streamOptions: { includeUsage: true }, // Enable usage tracking
    }),
    {
      onDelta: delta => process.stdout.write(delta),
      onUsage: usage => {
        console.log('\n\n📊 Usage Information:');
        console.log(`• Input tokens: ${usage?.inputTokens || 'N/A'}`);
        console.log(`• Output tokens: ${usage?.outputTokens || 'N/A'}`);
        console.log(`• Total tokens: ${usage?.totalTokens || 'N/A'}`);
        console.log(`• Reasoning tokens: ${usage?.reasoningTokens || 'N/A'}`);
      },
    }
  );

  // Enable streamOptions.includeUsage for real-time usage data
}

async function demonstrateAnthropicUsageTracking() {
  printSectionHeader('Anthropic Usage Tracking');

  const anthropic = createProvider('anthropic', { apiKey: ANTHROPIC_API_KEY });

  const messages = [
    systemText('You are a concise assistant.'),
    userText('What are the benefits of TypeScript?'),
  ];

  console.log('🔍 Tracking Anthropic usage...');

  const result = await collectDeltas(
    anthropic(messages, {
      model: 'claude-3-5-haiku-20241022',
      maxOutputTokens: 100,
    })
  );

  console.log(result.content);

  if (result.usage) {
    console.log('\n📊 Usage Information:');
    console.log(`• Input tokens: ${result.usage.inputTokens || 'N/A'}`);
    console.log(`• Output tokens: ${result.usage.outputTokens || 'N/A'}`);
    console.log(`• Total tokens: ${result.usage.totalTokens || 'N/A'}`);
  } else {
    console.log('\n⚠️  No usage information available (provider-dependent)');
  }

  // Anthropic provides output token counts in stream responses
}

async function demonstrateGoogleUsageTracking() {
  printSectionHeader('Google Gemini Usage Tracking');

  const google = createProvider('google', { apiKey: GOOGLE_API_KEY });

  const messages = [userText('Briefly explain quantum computing.')];

  console.log('🔍 Tracking Google usage...');

  const result = await collectDeltas(
    google(messages, {
      model: 'gemini-1.5-flash',
      maxOutputTokens: 80,
    })
  );

  console.log(result.content);

  if (result.usage) {
    console.log('\n📊 Usage Information:');
    console.log(`• Input tokens: ${result.usage.inputTokens || 'N/A'}`);
    console.log(`• Output tokens: ${result.usage.outputTokens || 'N/A'}`);
    console.log(`• Total tokens: ${result.usage.totalTokens || 'N/A'}`);
  } else {
    console.log('\n⚠️  No usage information available (provider-dependent)');
  }

  // Google provides comprehensive usage metadata
}

async function demonstrateEmbeddingUsageTracking() {
  printSectionHeader('Embedding Usage Tracking');

  // OpenAI Embeddings
  console.log('🔍 OpenAI Embedding Usage:');
  const openaiEmbeddings = createOpenAIEmbeddings({ apiKey: OPENAI_API_KEY });

  const texts = [
    'Machine learning is fascinating',
    'TypeScript makes JavaScript better',
    'AI will change the world',
  ];

  const openaiResult = await openaiEmbeddings(texts, {
    model: 'text-embedding-3-small',
  });

  console.log(`• Generated ${openaiResult.embeddings.length} embeddings`);
  console.log(`• Vector dimensions: ${openaiResult.embeddings[0].values.length}`);
  if (openaiResult.usage) {
    console.log(`• Input tokens: ${openaiResult.usage.inputTokens || 'N/A'}`);
    console.log(`• Total tokens: ${openaiResult.usage.totalTokens || 'N/A'}`);
    console.log(`• Truncated: ${openaiResult.usage.truncated ? 'Yes' : 'No'}`);
  }

  // Google Embeddings
  console.log('\n🔍 Google Embedding Usage:');
  const googleEmbeddings = createGoogleEmbeddings({ apiKey: GOOGLE_API_KEY });

  const googleResult = await googleEmbeddings(['Hello, world!'], {
    model: 'text-embedding-004',
  });

  console.log(`• Generated ${googleResult.embeddings.length} embeddings`);
  console.log(`• Vector dimensions: ${googleResult.embeddings[0].values.length}`);
  if (googleResult.usage) {
    console.log(`• Input tokens: ${googleResult.usage.inputTokens || 'N/A'}`);
    console.log(`• Total tokens: ${googleResult.usage.totalTokens || 'N/A'}`);
  } else {
    console.log('• Usage info: Not available for Google embeddings');
  }

  // Embedding usage helps track costs for vector operations
}

async function demonstrateReasoningUsageTracking() {
  printSectionHeader('Reasoning Models Usage Tracking');

  console.log('🧠 OpenAI o-series reasoning usage:');

  const openai = createProvider('openai', { apiKey: OPENAI_API_KEY });

  const messages = [userText('Solve: 2x + 5 = 15. Show your work.')];

  const result = await collectDeltas(
    openai(messages, {
      model: 'o1-mini',
      reasoning: { effort: 'medium' },
    })
  );

  console.log(result.content);

  if (result.usage) {
    console.log('\n📊 Reasoning Model Usage:');
    console.log(`• Input tokens: ${result.usage.inputTokens || 'N/A'}`);
    console.log(`• Output tokens: ${result.usage.outputTokens || 'N/A'}`);
    console.log(`• Reasoning tokens: ${result.usage.reasoningTokens || 'N/A'} 🧠`);
    console.log(`• Total tokens: ${result.usage.totalTokens || 'N/A'}`);
    console.log('\n💰 Cost Impact: Reasoning tokens are typically charged at higher rates!');
  }

  // Reasoning tokens can significantly increase costs - monitor carefully
}

async function demonstrateUsageComparison() {
  printSectionHeader('Provider Usage Comparison');

  const prompt = 'Explain recursion in programming in 2 sentences.';
  const providers = [
    {
      name: 'OpenAI GPT-4o-mini',
      provider: createProvider('openai', { apiKey: OPENAI_API_KEY }),
      model: 'gpt-4o-mini',
    },
    {
      name: 'Anthropic Claude Haiku',
      provider: createProvider('anthropic', { apiKey: ANTHROPIC_API_KEY }),
      model: 'claude-3-5-haiku-20241022',
    },
    {
      name: 'Google Gemini Flash',
      provider: createProvider('google', { apiKey: GOOGLE_API_KEY }),
      model: 'gemini-1.5-flash',
    },
  ];

  for (const { name, provider, model } of providers) {
    console.log(`\n🎯 Testing ${name}:`);

    try {
      const result = await collectDeltas(
        provider([userText(prompt)], { model, maxOutputTokens: 60 })
      );

      console.log(`Response: "${result.content.slice(0, 100)}..."`);

      if (result.usage) {
        console.log(
          `📊 Usage: ${result.usage.inputTokens || '?'} in + ${result.usage.outputTokens || '?'} out = ${result.usage.totalTokens || '?'} total tokens`
        );
      } else {
        console.log('📊 Usage: Not available');
      }
    } catch {
      // Skip providers with errors
    }
  }

  // Different providers have different token counting methods and pricing
  // Use usage tracking to optimize costs and monitor consumption patterns
}

async function main() {
  console.log('💰 AIKit Usage Tracking Example\n');
  console.log(
    'Track token consumption across all providers for cost monitoring and optimization.\n'
  );

  try {
    await demonstrateOpenAIUsageTracking();
    await demonstrateAnthropicUsageTracking();
    await demonstrateGoogleUsageTracking();
    await demonstrateEmbeddingUsageTracking();
    await demonstrateReasoningUsageTracking();
    await demonstrateUsageComparison();

    console.log('✅ Usage tracking examples completed!');
  } catch (error) {
    console.error('Error running usage tracking examples:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
