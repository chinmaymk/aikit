import { createProvider } from '../src/factory';
import type { Message } from '../src/types';

const PROVIDER_CONFIG = {
  openai: {
    apiKey: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    name: 'OpenAI',
  },
  anthropic: {
    apiKey: 'ANTHROPIC_API_KEY',
    model: 'claude-3-5-sonnet-20241022',
    name: 'Anthropic Claude',
  },
  google: {
    apiKey: 'GOOGLE_API_KEY',
    model: 'gemini-2.0-flash',
    name: 'Google Gemini',
  },
} as const;

function createMessages(providerType: keyof typeof PROVIDER_CONFIG): Message[] {
  const prompt = 'Write a haiku about artificial intelligence and the future.';

  if (providerType === 'openai') {
    return [
      {
        role: 'system',
        content: [{ type: 'text', text: 'You are a creative poet who writes beautiful haikus.' }],
      },
      { role: 'user', content: [{ type: 'text', text: prompt }] },
    ];
  }

  if (providerType === 'anthropic') {
    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${prompt} You are a creative poet who writes beautiful haikus.` },
        ],
      },
    ];
  }

  return [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
}

async function runExample(providerType: keyof typeof PROVIDER_CONFIG) {
  const config = PROVIDER_CONFIG[providerType];
  const apiKey = process.env[config.apiKey];

  if (!apiKey) {
    console.log(`${config.apiKey} not set, skipping ${config.name} example`);
    return;
  }

  const provider = createProvider(providerType, { apiKey });
  const messages = createMessages(providerType);

  console.log(`${config.name} Response:`);
  console.log('-'.repeat(30));

  for await (const chunk of provider.generate(messages, {
    model: config.model,
    maxTokens: 100,
    temperature: 0.8,
  })) {
    process.stdout.write(chunk.delta);
    if (chunk.finishReason) {
      console.log(`\nFinish reason: ${chunk.finishReason}\n`);
    }
  }
}

async function main() {
  const targetProvider = process.argv[2] as keyof typeof PROVIDER_CONFIG;

  if (targetProvider && PROVIDER_CONFIG[targetProvider]) {
    await runExample(targetProvider);
  } else {
    console.log('Haiku Generation Demo with Multiple Providers');
    console.log('='.repeat(50));

    for (const providerType of Object.keys(PROVIDER_CONFIG) as Array<
      keyof typeof PROVIDER_CONFIG
    >) {
      await runExample(providerType);
    }

    const hasNoKeys = Object.values(PROVIDER_CONFIG).every(config => !process.env[config.apiKey]);
    if (hasNoKeys) {
      console.log('Usage: npm run example:simple [openai|anthropic|google]');
      console.log('Set API key environment variables to run examples');
    }
  }
}

main().catch(console.error);
