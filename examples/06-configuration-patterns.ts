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

import { createProvider } from '../src/factory';
import { userText, generate } from '../src/utils';
import { printDelimiter, printSectionHeader } from './utils';
import type { OpenAIOptions, AnthropicOptions, GoogleOptions } from '../src/types';

async function pattern1_BasicConfiguration() {
  printSectionHeader('Pattern 1: Basic Configuration - Everything at Generation Time');

  // Minimal construction with just API key
  const provider = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // All generation options provided at generation time
  const result = await generate(provider, [userText('Explain TypeScript in one sentence.')], {
    model: 'gpt-4o',
    temperature: 0.7,
    maxOutputTokens: 100,
  });

  console.log('Basic pattern result:');
  console.log(result.content + '\n');
}

async function pattern2_DefaultsAtConstruction() {
  printSectionHeader('Pattern 2: Defaults at Construction - Override at Generation');

  // Set default model and generation options at construction time
  const provider = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    temperature: 0.5,
    maxOutputTokens: 150,
  });

  // Use defaults
  const defaultResult = await generate(
    provider,
    [userText('What is machine learning?')]
    // No options provided - uses construction defaults
  );

  console.log('Using construction defaults:');
  console.log(defaultResult.content + '\n');

  // Override specific options at generation time
  const overrideResult = await generate(
    provider,
    [userText('What is machine learning? Be very creative.')],
    {
      temperature: 0.9, // Override temperature
      maxOutputTokens: 50, // Override maxOutputTokens
      // model: 'gpt-4o' (uses default from construction)
    }
  );

  console.log('With overridden temperature and maxOutputTokens:');
  console.log(overrideResult.content + '\n');
}

async function pattern3_AdvancedOpenAIConfiguration() {
  printSectionHeader('Pattern 3: Advanced OpenAI Configuration with Type Safety');

  // Using OpenAIOptions type for better type safety and IDE support
  const openaiConfig: OpenAIOptions = {
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
  };

  const provider = createProvider('openai', openaiConfig);

  const result = await generate(provider, [
    userText('Write a short creative story about a robot learning to paint.'),
  ]);

  console.log('Advanced OpenAI configuration result:');
  console.log(result.content + '\n');
}

async function pattern4_AnthropicConfiguration() {
  printSectionHeader('Pattern 4: Anthropic Configuration with Type Safety');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('Skipping Anthropic example - no API key provided\n');
    return;
  }

  // Using AnthropicOptions type for full type safety
  const anthropicConfig: AnthropicOptions = {
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
  };

  const provider = createProvider('anthropic', anthropicConfig);

  // Use with generation-time overrides
  const result = await generate(
    provider,
    [userText('Explain quantum computing in simple terms.')],
    {
      temperature: 0.3, // More focused response
      maxOutputTokens: 150, // Longer response
    }
  );

  console.log('Anthropic configuration result:');
  console.log(result.content + '\n');
}

async function pattern5_GoogleConfiguration() {
  printSectionHeader('Pattern 5: Google Configuration with Type Safety');

  if (!process.env.GOOGLE_API_KEY) {
    console.log('Skipping Google example - no API key provided\n');
    return;
  }

  // Using GoogleOptions type for full type safety
  const googleConfig: GoogleOptions = {
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-1.5-pro',
    temperature: 0.8,
    maxOutputTokens: 120,

    // Google-specific options (type-checked)
    topK: 20,
    topP: 0.8,
    candidateCount: 1,
  };

  const provider = createProvider('google', googleConfig);

  const result = await generate(provider, [userText('What are the benefits of renewable energy?')]);

  console.log('Google configuration result:');
  console.log(result.content + '\n');
}

async function pattern6_DynamicConfiguration() {
  printSectionHeader('Pattern 6: Dynamic Configuration Based on Use Case');

  const provider = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  });

  // Creative vs analytical configurations
  const creative = await generate(provider, [userText('Write a haiku about programming.')], {
    temperature: 0.9, // High creativity
  });

  const analytical = await generate(provider, [userText('Explain bubble sort complexity.')], {
    temperature: 0.2, // Low creativity, focused
  });

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
  const provider = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    tools: [weatherTool],
    toolChoice: 'auto',
  });

  const result = await generate(provider, [userText("What's the weather in Tokyo?")]);

  console.log('Tools result:', result.content.substring(0, 100) + '...');
  if (result.toolCalls?.length) {
    console.log('Tool calls made:', result.toolCalls.length);
  }
  console.log();
}

async function pattern8_TypeSafetyBenefits() {
  printSectionHeader('Pattern 8: Type Safety Benefits');

  console.log('✅ Type safety prevents configuration errors at compile time:\n');
  console.log('// OpenAI-specific options');
  console.log('const config: OpenAIOptions = {');
  console.log('  presencePenalty: 0.1,     // ✅ Valid for OpenAI');
  console.log('  // beta: ["test"],        // ❌ Compile error: not valid for OpenAI');
  console.log('};\n');

  console.log('// Anthropic-specific options');
  console.log('const config: AnthropicOptions = {');
  console.log('  topK: 40,                 // ✅ Valid for Anthropic');
  console.log('  beta: ["computer-use"],   // ✅ Valid for Anthropic');
  console.log('  // presencePenalty: 0.1,  // ❌ Compile error: not valid for Anthropic');
  console.log('};\n');

  console.log(
    'Provider-specific types prevent configuration errors and provide better IDE support.\n'
  );
}

async function pattern9_MultiProviderConsistency() {
  printSectionHeader('Pattern 9: Multi-Provider Consistency');

  const question = [userText('What is recursion?')];
  const baseOptions = { temperature: 0.6, maxOutputTokens: 50 };

  const providers = [
    process.env.OPENAI_API_KEY && [
      'OpenAI',
      createProvider('openai', {
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o',
        ...baseOptions,
      }),
    ],
    process.env.ANTHROPIC_API_KEY && [
      'Anthropic',
      createProvider('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: 'claude-3-5-sonnet-20241022',
        ...baseOptions,
      }),
    ],
    process.env.GOOGLE_API_KEY && [
      'Google',
      createProvider('google', {
        apiKey: process.env.GOOGLE_API_KEY!,
        model: 'gemini-1.5-pro',
        ...baseOptions,
      }),
    ],
  ].filter(Boolean) as [string, ReturnType<typeof createProvider>][];

  if (providers.length === 0) {
    console.log('No API keys configured\n');
    return;
  }

  for (const [name, provider] of providers) {
    try {
      const result = await generate(provider, question);
      console.log(`${name}: ${result.content.substring(0, 80)}...\n`);
    } catch (error) {
      console.log(`${name}: Error\n`);
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
    await pattern8_TypeSafetyBenefits();
    await pattern9_MultiProviderConsistency();

    printDelimiter('Configuration Patterns Complete!', '-');

    console.log('\n📚 Key Takeaways:');
    console.log('• Single interface per provider with flexible configuration');
    console.log('• Set defaults at construction, override at generation time');
    console.log('• Provider-specific types (OpenAIOptions, AnthropicOptions, GoogleOptions)');
    console.log('• Full TypeScript support prevents configuration errors');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
