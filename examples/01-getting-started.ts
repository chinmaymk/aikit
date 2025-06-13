/**
 * Getting Started with AIKit
 *
 * This example progressively introduces AIKit concepts:
 * 1. Simple text generation
 * 2. Configuration options
 * 3. System messages for behavior control
 * 4. Conversation builder pattern
 * 5. Multiple provider comparison
 */

import { createProvider, getAvailableProvider, type GenerationProviderType } from '../src/index';
import { generate, userText, systemText, conversation } from '../src/utils';
import { getModelName, printDelimiter, printSectionHeader } from './utils';

async function step1_SimpleGeneration() {
  printSectionHeader('Simple Text Generation');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

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

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

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

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

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

async function step4_ConversationBuilder() {
  printSectionHeader('Conversation Builder Pattern');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

  const messages = conversation()
    .system('You are a helpful programming assistant')
    .user('What is the difference between let and const in JavaScript?')
    .build();

  const result = await generate(provider, messages, {
    model: getModelName(type!),
    maxOutputTokens: 150,
  });

  console.log('Conversation builder:');
  console.log(result.content + '\n');
}

async function step5_MultipleProviders() {
  printSectionHeader('Multiple Provider Comparison');

  const providers = [
    { type: 'openai', name: 'OpenAI' },
    { type: 'anthropic', name: 'Anthropic' },
    { type: 'google', name: 'Google' },
  ];

  const availableProviders = providers.filter(p => process.env[`${p.type.toUpperCase()}_API_KEY`]);

  if (availableProviders.length < 2) {
    console.log('Set multiple API keys to see provider comparison\n');
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
    } catch (error) {
      console.log(`${providerInfo.name}: Error - ${error}\n`);
    }
  }
}

async function main() {
  printDelimiter('Getting Started with AIKit');

  try {
    await step1_SimpleGeneration();
    await step2_ConfigurationOptions();
    await step3_SystemMessages();
    await step4_ConversationBuilder();
    await step5_MultipleProviders();

    printDelimiter('Getting Started Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
