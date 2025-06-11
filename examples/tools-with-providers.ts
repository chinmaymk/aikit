import { createProvider } from '../src/factory';
import type { Message, Tool } from '../src/types';

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

const tools: Tool[] = [
  {
    name: 'getCurrentWeatherTool',
    description: 'Get the current weather for a specific location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'The temperature unit to use',
        },
      },
      required: ['location'],
    },
  },
];

function getCurrentWeatherTool(location: string, unit: 'celsius' | 'fahrenheit' = 'celsius') {
  const baseTemp = unit === 'celsius' ? 20 : 68;
  const temperature = baseTemp + Math.floor(Math.random() * 10) - 5;
  const conditions = ['Sunny', 'Partly cloudy', 'Overcast', 'Light rain', 'Clear'];

  return {
    location,
    temperature: `${temperature}${unit === 'celsius' ? '°C' : '°F'}`,
    description: conditions[Math.floor(Math.random() * conditions.length)],
    humidity: `${60 + Math.floor(Math.random() * 30)}%`,
    windSpeed: `${5 + Math.floor(Math.random() * 15)} km/h`,
  };
}

function createMessages(providerType: keyof typeof PROVIDER_CONFIG): Message[] {
  const prompt = "What's the weather like in San Francisco?";

  if (providerType === 'openai') {
    return [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'You are a helpful assistant that can provide weather information.',
          },
        ],
      },
      { role: 'user', content: [{ type: 'text', text: prompt }] },
    ];
  }

  if (providerType === 'anthropic') {
    return [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${prompt} You are a helpful assistant that can provide weather information.`,
          },
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

  console.log(`${config.name} Tool Calls Example:`);
  console.log('-'.repeat(40));

  let conversationComplete = false;

  while (!conversationComplete) {
    let assistantMessage = '';
    let toolCalls: any[] = [];

    for await (const chunk of provider.generate(messages, {
      model: config.model,
      maxTokens: 200,
      temperature: 0.7,
      tools,
      toolChoice: 'auto',
    })) {
      assistantMessage += chunk.delta;
      if (chunk.toolCalls) toolCalls = chunk.toolCalls;

      if (chunk.finishReason) {
        console.log(`\nFinish reason: ${chunk.finishReason}`);

        if (chunk.finishReason === 'tool_use' && toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: [{ type: 'text', text: assistantMessage }],
            toolCalls: toolCalls.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
          });

          for (const toolCall of toolCalls) {
            console.log(`\nCalling tool: ${toolCall.name} with args:`, toolCall.arguments);

            if (toolCall.name === 'getCurrentWeatherTool') {
              const result = getCurrentWeatherTool(
                toolCall.arguments.location,
                toolCall.arguments.unit
              );
              console.log('Tool result:', result);

              messages.push({
                role: 'tool',
                content: [
                  { type: 'tool_result', toolCallId: toolCall.id, result: JSON.stringify(result) },
                ],
              });
            }
          }

          console.log(`\n${config.name} response after tool execution:`);
        } else {
          conversationComplete = true;
        }
        break;
      }

      process.stdout.write(chunk.delta);
    }
  }

  console.log('\nTool call conversation complete!\n');
}

async function main() {
  const targetProvider = process.argv[2] as keyof typeof PROVIDER_CONFIG;

  if (targetProvider && PROVIDER_CONFIG[targetProvider]) {
    await runExample(targetProvider);
  } else {
    console.log('Tool Calls Demo with Multiple Providers');
    console.log('='.repeat(50));

    for (const providerType of Object.keys(PROVIDER_CONFIG) as Array<
      keyof typeof PROVIDER_CONFIG
    >) {
      await runExample(providerType);
    }

    const hasNoKeys = Object.values(PROVIDER_CONFIG).every(config => !process.env[config.apiKey]);
    if (hasNoKeys) {
      console.log('Usage: npm run example:tools-providers [openai|anthropic|google]');
      console.log('Set API key environment variables to run examples');
    }
  }
}

main().catch(console.error);
