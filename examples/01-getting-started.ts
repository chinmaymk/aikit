/**
 * Getting Started with AIKit
 *
 * This example progressively introduces AIKit concepts:
 * 1. Simple text generation
 * 2. Configuration options
 * 3. System messages for behavior control
 * 4. Multiple provider comparison
 */

import {
  createProvider,
  type GenerationProviderType,
  generate,
  userText,
  systemText,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createProviderFromEnv } from './utils';

async function step1_SimpleGeneration() {
  printSectionHeader('Simple Text Generation');

  const { provider, type } = createProviderFromEnv();

  const result = await generate(
    provider,
    [userText('What is TypeScript? Answer in one sentence.')],
    { model: getModelName(type!), maxOutputTokens: 100 }
  );

  console.log('Simple generation:');
  console.log(result.content + '\n');
}

async function step2_ConfigurationOptions() {
  printSectionHeader('Configuration Options');

  const { provider, type } = createProviderFromEnv();

  const result = await generate(
    provider,
    [userText('What is TypeScript? Answer in one sentence.')],
    {
      model: getModelName(type!),
      maxOutputTokens: 100,
      temperature: 0.2, // Lower temperature for more focused response
    }
  );

  console.log('With temperature control:');
  console.log(result.content + '\n');
}

async function step3_SystemMessages() {
  printSectionHeader('System Messages for Behavior Control');

  const { provider, type } = createProviderFromEnv();

  const basic = await generate(provider, [userText('Explain variables in JavaScript')], {
    model: getModelName(type!),
    maxOutputTokens: 100,
  });

  const withSystem = await generate(
    provider,
    [
      systemText('You are a patient coding tutor. Explain concepts simply with examples.'),
      userText('Explain variables in JavaScript'),
    ],
    { model: getModelName(type!), maxOutputTokens: 100 }
  );

  console.log('Without system message:');
  console.log(basic.content + '\n');

  console.log('With system message:');
  console.log(withSystem.content + '\n');
}

async function step4_MultipleProviders() {
  printSectionHeader('Multiple Provider Comparison');

  const providers = [
    { type: 'openai', name: 'OpenAI' },
    { type: 'anthropic', name: 'Anthropic' },
    { type: 'google', name: 'Google' },
  ];

  const availableProviders = providers.filter(p => process.env[`${p.type.toUpperCase()}_API_KEY`]);

  if (availableProviders.length < 2) {
    return;
  }

  const question = 'Explain async/await in exactly 2 sentences.';

  for (const providerInfo of availableProviders) {
    try {
      const provider = createProvider(providerInfo.type as GenerationProviderType, {
        apiKey: process.env[`${providerInfo.type.toUpperCase()}_API_KEY`]!,
      });

      const result = await generate(provider, [userText(question)], {
        model: getModelName(providerInfo.type),
        maxOutputTokens: 100,
        temperature: 0.3,
      });

      console.log(`${providerInfo.name}:`);
      console.log(result.content + '\n');
    } catch {
      // Skip providers with errors
    }
  }
}

async function main() {
  printDelimiter('Getting Started with AIKit');

  try {
    await step1_SimpleGeneration();
    await step2_ConfigurationOptions();
    await step3_SystemMessages();
    await step4_MultipleProviders();

    printDelimiter('Getting Started Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
