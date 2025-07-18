/**
 * Configuration Patterns with AIKit
 *
 * Demonstrates the consolidated configuration system with provider-specific types.
 * Shows how to set defaults at construction and override at generation time.
 *
 * Key Benefits:
 * - Single interface per provider with TypeScript support
 * - Flexible configuration patterns
 * - Compile-time error prevention
 */

import {
  createOpenAI,
  createAnthropic,
  createGoogle,
  userText,
  collectStream,
} from '@chinmaymk/aikit';
import { printDelimiter, printSectionHeader } from './utils';

async function pattern1_BasicConfiguration() {
  printSectionHeader('Pattern 1: Basic Configuration - Everything at Generation Time');

  // Minimal construction with just API key
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // All generation options provided at generation time
  const result = await collectStream(
    provider([userText('Explain TypeScript in one sentence.')], {
      model: 'gpt-4o',
      temperature: 0.7,
      maxOutputTokens: 100,
    })
  );

  console.log('Basic pattern result:');
  console.log(result.content + '\n');
}

async function pattern2_DefaultsAtConstruction() {
  printSectionHeader('Pattern 2: Defaults at Construction - Override at Generation');

  // Set default model and generation options at construction time
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    temperature: 0.5,
    maxOutputTokens: 150,
  });

  // Use defaults
  const defaultResult = await collectStream(provider([userText('What is machine learning?')]));

  console.log('Using construction defaults:');
  console.log(defaultResult.content + '\n');

  // Override specific options at generation time
  const overrideResult = await collectStream(
    provider([userText('What is machine learning? Be very creative.')], {
      temperature: 0.9, // Override temperature
    })
  );

  console.log('With overridden temperature and maxOutputTokens:');
  console.log(overrideResult.content + '\n');
}

async function pattern3_AdvancedOpenAIConfiguration() {
  printSectionHeader('Pattern 3: Advanced OpenAI Configuration with Type Safety');

  // Clean configuration object - TypeScript infers the correct types
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    temperature: 0.7,
    maxOutputTokens: 200,

    // Advanced OpenAI-specific options (fully type-checked)
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    topP: 0.9,
    user: 'example-user-123',

    // API configuration
    timeout: 30000,
    maxRetries: 3,
    organization: process.env.OPENAI_ORG_ID,
    project: process.env.OPENAI_PROJECT_ID,
  });

  const result = await collectStream(
    provider([userText('Write a short creative story about a robot learning to paint.')])
  );

  console.log('Advanced OpenAI configuration result:');
  console.log(result.content + '\n');
}

async function pattern4_AnthropicConfiguration() {
  printSectionHeader('Pattern 4: Anthropic Configuration with Type Safety');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return;
  }

  // Clean configuration object - TypeScript infers the correct types
  const provider = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.6,
    maxOutputTokens: 100,
    topK: 40,

    // Anthropic-specific options (type-checked)
    timeout: 60000,
    maxRetries: 2,
    beta: ['computer-use-2024-10-22'], // Enable beta features
    system: 'You are a helpful assistant that explains complex topics clearly.',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
    serviceTier: 'auto',
  });

  // Use with generation-time overrides
  const result = await collectStream(
    provider([userText('Explain quantum computing in simple terms.')], {
      model: 'claude-3-haiku-20240307',
      maxOutputTokens: 100,
    })
  );

  console.log('Anthropic configuration result:');
  console.log(result.content + '\n');
}

async function pattern5_GoogleConfiguration() {
  printSectionHeader('Pattern 5: Google Configuration with Type Safety');

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return;
  }

  // Clean configuration object - TypeScript infers the correct types
  const provider = createGoogle({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-1.5-pro',
    temperature: 0.8,
    maxOutputTokens: 120,

    // Google-specific options (type-checked)
    topK: 20,
    topP: 0.8,
    candidateCount: 1,
  });

  const result = await collectStream(
    provider([userText('What are the benefits of renewable energy?')])
  );

  console.log('Google configuration result:');
  console.log(result.content + '\n');
}

async function pattern6_DynamicConfiguration() {
  printSectionHeader('Pattern 6: Dynamic Configuration Based on Use Case');

  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  });

  // Creative vs analytical configurations
  const creative = await collectStream(
    provider([userText('Write a haiku about programming.')], {
      temperature: 0.9, // High creativity
    })
  );

  const analytical = await collectStream(
    provider([userText('Explain bubble sort complexity.')], {
      temperature: 0.2, // Low creativity, focused
    })
  );

  console.log('Creative (temp=0.9):', creative.content.substring(0, 100) + '...\n');
  console.log('Analytical (temp=0.2):', analytical.content.substring(0, 100) + '...\n');
}

async function pattern7_ToolsConfiguration() {
  printSectionHeader('Pattern 7: Tools Configuration');

  const weatherTool = {
    name: 'get_weather',
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: { location: { type: 'string' } },
      required: ['location'],
    },
  };

  // Set default tools at construction
  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    tools: [weatherTool],
    toolChoice: 'auto',
  });

  const result = await collectStream(provider([userText("What's the weather in Tokyo?")]));

  console.log('Tools result:', result.content.substring(0, 100) + '...');
  if (result.toolCalls?.length) {
    console.log('Tool calls made:', result.toolCalls.length);
  }
  console.log();
}

async function pattern8_MultiProviderConsistency() {
  printSectionHeader('Pattern 8: Multi-Provider Consistency');

  const question = [userText('What is recursion?')];
  const baseOptions = { temperature: 0.6, maxOutputTokens: 50 };

  const providers = [
    process.env.OPENAI_API_KEY && [
      'OpenAI',
      createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o',
        ...baseOptions,
      }),
    ],
    process.env.ANTHROPIC_API_KEY && [
      'Anthropic',
      createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-5-sonnet-20241022',
        ...baseOptions,
      }),
    ],
    process.env.GOOGLE_API_KEY && [
      'Google',
      createGoogle({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: 'gemini-1.5-pro',
        ...baseOptions,
      }),
    ],
  ].filter(Boolean) as Array<[string, ReturnType<typeof createOpenAI>]>;

  if (providers.length === 0) {
    return;
  }

  for (const [name, provider] of providers) {
    try {
      const result = await collectStream(provider(question));
      console.log(`${name}: ${result.content.substring(0, 80)}...\n`);
    } catch {
      // Skip providers with errors
    }
  }
}

async function main() {
  printDelimiter('AIKit Configuration Patterns');

  try {
    await pattern1_BasicConfiguration();
    await pattern2_DefaultsAtConstruction();
    await pattern3_AdvancedOpenAIConfiguration();
    await pattern4_AnthropicConfiguration();
    await pattern5_GoogleConfiguration();
    await pattern6_DynamicConfiguration();
    await pattern7_ToolsConfiguration();
    await pattern8_MultiProviderConsistency();

    printDelimiter('Configuration Patterns Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
