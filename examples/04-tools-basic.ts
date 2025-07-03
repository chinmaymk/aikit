/**
 * AI Tools & Function Calling Examples
 * Demonstrates basic tool usage, multiple tools, tool choice control, and error handling.
 */

import {
  createTool,
  generate,
  assistantWithToolCalls,
  toolResult,
  systemText,
  userText,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createProviderFromEnv } from './utils';

// === Tool Service Functions ===

interface CalculatorArgs {
  operation: string;
  a: number;
  b: number;
}

interface WeatherArgs {
  location: string;
  unit?: string;
}

interface DateTimeArgs {
  timezone?: string;
}

function calculatorService(args: CalculatorArgs): string {
  const { operation, a, b } = args;
  switch (operation) {
    case 'add':
      return JSON.stringify({ result: a + b, operation: `${a} + ${b}` });
    case 'subtract':
      return JSON.stringify({ result: a - b, operation: `${a} - ${b}` });
    case 'multiply':
      return JSON.stringify({ result: a * b, operation: `${a} × ${b}` });
    case 'divide':
      return b === 0
        ? JSON.stringify({ error: 'Cannot divide by zero' })
        : JSON.stringify({ result: a / b, operation: `${a} ÷ ${b}` });
    default:
      return JSON.stringify({ error: `Unknown operation: ${operation}` });
  }
}

function weatherService(args: WeatherArgs): string {
  const { location, unit = 'celsius' } = args;
  const weatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
    'new york': { temp: 22, condition: 'Sunny', humidity: 65 },
    london: { temp: 15, condition: 'Cloudy', humidity: 80 },
    tokyo: { temp: 18, condition: 'Rainy', humidity: 90 },
    'san francisco': { temp: 19, condition: 'Foggy', humidity: 85 },
    sydney: { temp: 25, condition: 'Clear', humidity: 60 },
  };

  const locationKey = location.toLowerCase();
  const data = weatherData[locationKey];

  if (!data) {
    return JSON.stringify({ error: 'Weather data not available for this location' });
  }

  const temp = unit === 'fahrenheit' ? Math.round((data.temp * 9) / 5 + 32) : data.temp;
  return JSON.stringify({
    location,
    temperature: `${temp}°${unit === 'fahrenheit' ? 'F' : 'C'}`,
    condition: data.condition,
    humidity: `${data.humidity}%`,
  });
}

function dateTimeService(args: DateTimeArgs): string {
  const { timezone = 'UTC' } = args;
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    };
    return JSON.stringify({
      datetime: now.toLocaleString('en-US', options),
      timezone,
      timestamp: now.getTime(),
    });
  } catch {
    return JSON.stringify({ error: `Invalid timezone: ${timezone}` });
  }
}

function handleToolCall(toolCall: any): string {
  const { name, arguments: args } = toolCall;
  switch (name) {
    case 'calculator':
      return calculatorService(args);
    case 'get_weather':
      return weatherService(args);
    case 'get_datetime':
      return dateTimeService(args);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// === Example Functions ===

async function processToolCalls(messages: any[], toolCalls: any[]): Promise<void> {
  messages.push(assistantWithToolCalls('', toolCalls));
  for (const toolCall of toolCalls) {
    const toolResultValue = handleToolCall(toolCall);
    console.log(`${toolCall.name}:`, JSON.parse(toolResultValue));
    messages.push(toolResult(toolCall.id, toolResultValue));
  }
}

async function runExample(
  title: string,
  userMessage: string,
  tools: any[],
  options: any = {}
): Promise<void> {
  printSectionHeader(title);
  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);

  const messages = [
    systemText('You are a helpful assistant with access to tools.'),
    userText(userMessage),
  ];

  console.log(`User: ${userMessage}`);

  try {
    const result = await generate(provider!, messages, {
      model: modelName,
      tools,
      maxOutputTokens: 300,
      ...options,
    });

    console.log('Assistant:', result.content);

    if (result.toolCalls?.length) {
      await processToolCalls(messages, result.toolCalls);
      const finalResult = await generate(provider!, messages, {
        model: modelName,
        maxOutputTokens: 200,
      });
      console.log('Final:', finalResult.content);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function basicCalculatorExample() {
  const calculatorTool = createTool('calculator', 'Perform basic mathematical operations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  });

  await runExample('Example 1: Basic Calculator', 'What is 15 multiplied by 7?', [calculatorTool], {
    temperature: 0.1,
  });
}

async function multipleToolsExample() {
  const tools = [
    createTool('get_weather', 'Get current weather information for a location', {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'The city name' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'celsius' },
      },
      required: ['location'],
    }),
    createTool('get_datetime', 'Get current date and time', {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
      },
    }),
    createTool('calculator', 'Perform mathematical operations', {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['operation', 'a', 'b'],
    }),
  ];

  await runExample(
    'Example 2: Multiple Tools',
    'What is the weather in Tokyo and what time is it there? Also calculate 42 + 18.',
    tools,
    { temperature: 0.2 }
  );
}

async function toolChoiceExample() {
  const calculatorTool = createTool('calculator', 'Perform mathematical operations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  });

  await runExample('Example 3: Tool Choice Control', 'Calculate 25 + 17', [calculatorTool], {
    toolChoice: 'required',
  });
}

async function toolErrorHandlingExample() {
  const calculatorTool = createTool('calculator', 'Perform mathematical operations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  });

  await runExample('Example 4: Error Handling', 'Divide 10 by 0', [calculatorTool]);
}

export async function main() {
  console.log('🔧 AI Tools & Function Calling Examples\n');

  try {
    await basicCalculatorExample();
    printDelimiter('Basic Calculator Example');

    await multipleToolsExample();
    printDelimiter('Multiple Tools Example');

    await toolChoiceExample();
    printDelimiter('Tool Choice Example');

    await toolErrorHandlingExample();

    console.log('\n✅ All tool examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
