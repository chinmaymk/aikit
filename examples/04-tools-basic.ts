/**
 * AI Tools & Function Calling
 *
 * This example demonstrates how to use AI tools (function calling) with AIKit.
 * It shows:
 * - Basic tool definition and usage
 * - Multiple tools in one conversation
 * - Tool execution and response handling
 * - Different tool call patterns
 * - Error handling for tools
 */

import { getAvailableProvider } from '../src/factory';
import {
  conversation,
  createTool,
  generate,
  executeToolCall,
  assistantWithToolCalls,
  toolResult,
  userText,
} from '../src/utils';
import { getModelName, printDelimiter, printSectionHeader } from './utils';

// === Tool Service Functions ===
// These are the actual functions that will be called when the AI uses tools

const weatherService = (...args: unknown[]) => {
  const [location, unit = 'celsius'] = args;

  // Simple mock weather data
  const weatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
    'new york': { temp: 22, condition: 'Sunny', humidity: 65 },
    london: { temp: 15, condition: 'Cloudy', humidity: 80 },
    tokyo: { temp: 18, condition: 'Rainy', humidity: 90 },
    'san francisco': { temp: 19, condition: 'Foggy', humidity: 85 },
    sydney: { temp: 25, condition: 'Clear', humidity: 60 },
  };

  const locationKey = (location as string).toLowerCase();
  const data = weatherData[locationKey];

  if (!data) {
    return JSON.stringify({ error: 'Weather data not available for this location' });
  }

  const temp = unit === 'fahrenheit' ? Math.round((data.temp * 9) / 5 + 32) : data.temp;

  return JSON.stringify({
    location: location as string,
    temperature: `${temp}°${unit === 'fahrenheit' ? 'F' : 'C'}`,
    condition: data.condition,
    humidity: `${data.humidity}%`,
  });
};

const calculatorService = (...args: unknown[]) => {
  const [operation, a, b] = args as [string, number, number];

  switch (operation) {
    case 'add':
      return JSON.stringify({ result: a + b, operation: `${a} + ${b}` });
    case 'subtract':
      return JSON.stringify({ result: a - b, operation: `${a} - ${b}` });
    case 'multiply':
      return JSON.stringify({ result: a * b, operation: `${a} × ${b}` });
    case 'divide':
      if (b === 0) {
        return JSON.stringify({ error: 'Cannot divide by zero' });
      }
      return JSON.stringify({ result: a / b, operation: `${a} ÷ ${b}` });
    default:
      return JSON.stringify({ error: `Unknown operation: ${operation}` });
  }
};

const dateTimeService = (...args: unknown[]) => {
  const [timezone = 'UTC'] = args as [string?];
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
  } catch (error) {
    return JSON.stringify({ error: `Invalid timezone: ${timezone}` });
  }
};

// === Examples ===

async function basicToolExample() {
  printSectionHeader('Basic Tool Usage Example');

  const providerResult = getAvailableProvider();
  if (!providerResult) {
    console.log('No API keys found. Please set at least one API key.');
    return;
  }

  const { provider, type, name } = providerResult;
  console.log(`Using ${name} for tool examples\n`);

  const modelName = getModelName(type!);

  // Define a simple calculator tool
  const calculatorTool = createTool('calculator', 'Perform basic mathematical operations', {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation to perform',
        enum: ['add', 'subtract', 'multiply', 'divide'],
      },
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
    },
    required: ['operation', 'a', 'b'],
  });

  const toolServices = {
    calculator: calculatorService,
  };

  const messages = conversation()
    .system(
      'You are a helpful math assistant. Use the calculator tool for any mathematical operations.'
    )
    .user('What is 15 multiplied by 7?')
    .build();

  console.log('User: What is 15 multiplied by 7?');

  try {
    // Generate response with tool
    const result = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      maxOutputTokens: 300,
      temperature: 0.1,
    });

    console.log('Assistant:', result.content);

    // Handle tool calls if present
    if (result.toolCalls && result.toolCalls.length > 0) {
      // Add assistant message with tool calls
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      // Execute each tool call
      for (const toolCall of result.toolCalls) {
        console.log(`\nExecuting tool: ${toolCall.name}`);
        console.log('Arguments:', JSON.stringify(toolCall.arguments, null, 2));

        const toolResultValue = executeToolCall(toolCall, toolServices);
        const parsedResult = JSON.parse(toolResultValue);

        console.log('Tool result:', parsedResult);

        // Add tool result to conversation
        messages.push(toolResult(toolCall.id, toolResultValue));
      }

      // Generate final response with tool results
      const finalResult = await generate(provider!, messages, {
        model: modelName,
        maxOutputTokens: 200,
        temperature: 0.3,
      });

      console.log('\nAssistant (final):', finalResult.content);
    }
  } catch (error) {
    console.error('Error during basic tool example:', error);
  }

  console.log();
}

async function multipleToolsExample() {
  printSectionHeader('Multiple Tools Example');

  const providerResult = getAvailableProvider();
  if (!providerResult) return;

  const { provider, type } = providerResult;
  const modelName = getModelName(type!);

  // Define multiple tools
  const tools = [
    createTool('get_weather', 'Get current weather information for a location', {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city name, e.g. "New York" or "London"',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature unit preference',
        },
      },
      required: ['location'],
    }),
    createTool('calculator', 'Perform mathematical calculations', {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'Mathematical operation to perform',
        },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['operation', 'a', 'b'],
    }),
    createTool('get_datetime', 'Get current date and time for a timezone', {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone (e.g., "America/New_York", "Europe/London", "UTC")',
        },
      },
      required: [],
    }),
  ];

  const toolServices = {
    get_weather: weatherService,
    calculator: calculatorService,
    get_datetime: dateTimeService,
  };

  const messages = conversation()
    .system('You are a helpful assistant with access to weather, calculator, and datetime tools.')
    .user(
      "What's the weather like in Tokyo? Also, if it's 25°C there, what's that in Fahrenheit? And what time is it in Tokyo right now?"
    )
    .build();

  console.log(
    "User: What's the weather like in Tokyo? Also, if it's 25°C there, what's that in Fahrenheit? And what time is it in Tokyo right now?"
  );

  try {
    let conversationComplete = false;
    let iteration = 0;
    const maxIterations = 3; // Prevent infinite loops

    while (!conversationComplete && iteration < maxIterations) {
      iteration++;
      console.log(`\n--- Iteration ${iteration} ---`);

      const result = await generate(provider!, messages, {
        model: modelName,
        tools,
        maxOutputTokens: 500,
        temperature: 0.3,
      });

      console.log('Assistant:', result.content);

      if (result.toolCalls && result.toolCalls.length > 0) {
        // Add assistant message with tool calls
        messages.push(assistantWithToolCalls(result.content, result.toolCalls));

        // Execute each tool call
        for (const toolCall of result.toolCalls) {
          console.log(`\nUsing tool: ${toolCall.name}`);
          console.log('Input:', JSON.stringify(toolCall.arguments, null, 2));

          try {
            const toolResultValue = executeToolCall(toolCall, toolServices);

            const parsedResult = JSON.parse(toolResultValue);

            console.log('Output:', parsedResult);

            // Add tool result to conversation
            messages.push(toolResult(toolCall.id, toolResultValue));
          } catch (toolError) {
            console.error('Tool execution error:', toolError);
            messages.push(
              toolResult(toolCall.id, JSON.stringify({ error: 'Tool execution failed' }))
            );
          }
        }
      } else {
        conversationComplete = true;
      }
    }

    if (iteration >= maxIterations) {
      console.log('\nMaximum iterations reached');
    }
  } catch (error) {
    console.error('Error during multi-tool conversation:', error);
  }

  console.log();
}

async function toolChoiceExample() {
  printSectionHeader('Tool Choice Control Example');

  const providerResult = getAvailableProvider();
  if (!providerResult) return;

  const { provider, type } = providerResult;
  const modelName = getModelName(type!);

  const calculatorTool = createTool('calculator', 'Perform mathematical operations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  });

  const toolServices = { calculator: calculatorService };

  // Example 1: Auto tool choice (default)
  console.log('Auto tool choice:');
  console.log('User: Hello, how are you?');

  let messages = [userText('Hello, how are you?')];

  const autoResult = await generate(provider!, messages, {
    model: modelName,
    tools: [calculatorTool],
    toolChoice: 'auto',
    maxOutputTokens: 150,
  });

  console.log('Assistant:', autoResult.content);
  console.log('Tool calls:', autoResult.toolCalls ? 'Yes' : 'None');

  // Example 2: Required tool use
  console.log('\nRequired tool use:');
  console.log('User: Calculate 8 plus 12');

  messages = [userText('Calculate 8 plus 12')];

  try {
    const requiredResult = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      toolChoice: 'required',
      maxOutputTokens: 200,
    });

    console.log('Assistant:', requiredResult.content);
    console.log('Tool calls:', requiredResult.toolCalls?.length || 0);

    // Execute the tool call
    if (requiredResult.toolCalls && requiredResult.toolCalls.length > 0) {
      const toolCall = requiredResult.toolCalls[0];
      const result = executeToolCall(toolCall, toolServices);
      console.log('Tool result:', JSON.parse(result));
    }
  } catch (error) {
    console.log('Error with required tool choice (some providers may not support this)');
  }

  console.log();
}

async function toolErrorHandlingExample() {
  printSectionHeader('Tool Error Handling Example');

  const providerResult = getAvailableProvider();
  if (!providerResult) return;

  const { provider, type } = providerResult;
  const modelName = getModelName(type!);

  const calculatorTool = createTool('calculator', 'Perform mathematical operations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['operation', 'a', 'b'],
  });

  const toolServices = { calculator: calculatorService };

  const messages = conversation()
    .system('You are a helpful math assistant. Handle errors gracefully.')
    .user('What is 10 divided by 0?')
    .build();

  console.log('User: What is 10 divided by 0?');

  try {
    const result = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      maxOutputTokens: 300,
      temperature: 0.1,
    });

    console.log('Assistant:', result.content);

    if (result.toolCalls && result.toolCalls.length > 0) {
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      for (const toolCall of result.toolCalls) {
        console.log(`\nExecuting tool: ${toolCall.name}`);
        console.log('Arguments:', JSON.stringify(toolCall.arguments, null, 2));

        const toolResultValue = executeToolCall(toolCall, toolServices);
        const parsedResult = JSON.parse(toolResultValue);

        console.log('Tool result:', parsedResult);
        messages.push(toolResult(toolCall.id, toolResultValue));
      }

      const finalResult = await generate(provider!, messages, {
        model: modelName,
        maxOutputTokens: 200,
        temperature: 0.3,
      });

      console.log('\nAssistant (final):', finalResult.content);
    }
  } catch (error) {
    console.error('Error during tool error handling example:', error);
  }

  console.log();
}

async function main() {
  printDelimiter('AI Tools & Function Calling');

  try {
    await basicToolExample();
    await multipleToolsExample();
    await toolChoiceExample();
    await toolErrorHandlingExample();

    printDelimiter('Tool Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
