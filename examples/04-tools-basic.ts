/**
 * AI Tools & Function Calling Examples
 *
 * This example demonstrates how to implement AI function calling with various tools.
 * We'll cover basic tool usage, multiple tools, tool choice control, and error handling.
 *
 * The examples progress from simple single-tool usage to more complex scenarios
 * with multiple tools and error handling patterns.
 */

import {
  conversation,
  createTool,
  generate,
  assistantWithToolCalls,
  toolResult,
  userText,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createProviderFromEnv } from './utils';

// === Tool Service Functions ===
// These functions implement the actual business logic for each tool.
// They receive structured arguments and return JSON-formatted results.
//
// Note: LLMs can only pass objects to tools, so all functions accept object parameters.
// We use TypeScript interfaces and destructuring for type safety and readability.

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

/**
 * Calculator service that performs basic mathematical operations
 */
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
      if (b === 0) {
        return JSON.stringify({ error: 'Cannot divide by zero' });
      }
      return JSON.stringify({ result: a / b, operation: `${a} ÷ ${b}` });
    default:
      return JSON.stringify({ error: `Unknown operation: ${operation}` });
  }
}

/**
 * Weather service that returns mock weather data for demonstration purposes
 */
function weatherService(args: WeatherArgs): string {
  const { location, unit = 'celsius' } = args;

  // Mock weather database for demonstration
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

/**
 * DateTime service that returns current date and time information
 */
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

// === Tool Call Handler ===
// This function routes tool calls to their corresponding service functions.
// Note: This is a custom implementation for this example. The library also provides
// an executeToolCall utility function with more advanced features.

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

// === Example 1: Basic Tool Usage ===
// Demonstrates how to define a tool, create a conversation, and handle tool calls

async function basicCalculatorExample() {
  printSectionHeader('Example 1: Basic Tool Usage - Calculator');
  console.log('Demonstrating basic tool integration with a simple calculator.\n');

  const { provider, type, name } = createProviderFromEnv();
  console.log(`Using ${name} for this example\n`);

  const modelName = getModelName(type!);

  // Step 1: Define the tool schema
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

  // Step 2: Create a conversation with system and user messages
  const messages = conversation()
    .system(
      'You are a helpful math assistant. Use the calculator tool for any mathematical operations.'
    )
    .user('What is 15 multiplied by 7?')
    .build();

  console.log('User: What is 15 multiplied by 7?');

  try {
    // Step 3: Generate response with tool availability
    const result = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      maxOutputTokens: 300,
      temperature: 0.1,
    });

    console.log('Assistant:', result.content);

    // Step 4: Process any tool calls made by the AI
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('\nTool calls detected. Processing...');

      // Add the AI's message (with tool calls) to the conversation
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      // Execute each tool call
      for (const toolCall of result.toolCalls) {
        console.log(`\nExecuting tool: ${toolCall.name}`);
        console.log('Input:', JSON.stringify(toolCall.arguments, null, 2));

        const toolResultValue = handleToolCall(toolCall);
        const parsedResult = JSON.parse(toolResultValue);

        console.log('Output:', parsedResult);

        // Add the tool result back to the conversation
        messages.push(toolResult(toolCall.id, toolResultValue));
      }

      // Step 5: Generate final response incorporating tool results
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

  console.log('\nBasic tool usage completed successfully.\n');
}

// === Example 2: Multiple Tools ===
// Shows how to provide multiple tools and handle complex multi-step interactions

async function multipleToolsExample() {
  printSectionHeader('Example 2: Multiple Tools - Comprehensive Assistant');
  console.log('Demonstrating an AI assistant with access to multiple tools.\n');

  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);

  // Define multiple tools for the AI to use
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
      console.log(`\nIteration ${iteration} - Processing AI response...`);

      const result = await generate(provider!, messages, {
        model: modelName,
        tools,
        maxOutputTokens: 500,
        temperature: 0.3,
      });

      console.log('Assistant:', result.content);

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`\n${result.toolCalls.length} tool call(s) to process:`);

        // Add assistant message with tool calls
        messages.push(assistantWithToolCalls(result.content, result.toolCalls));

        // Execute each tool call
        for (const toolCall of result.toolCalls) {
          console.log(`\nExecuting: ${toolCall.name}`);
          console.log('Input:', JSON.stringify(toolCall.arguments, null, 2));

          try {
            const toolResultValue = handleToolCall(toolCall);
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
        console.log('\nNo more tools needed - conversation complete.');
      }
    }

    if (iteration >= maxIterations) {
      console.log('\nMaximum iterations reached - stopping conversation.');
    }
  } catch (error) {
    console.error('Error during multi-tool conversation:', error);
  }

  console.log('\nMultiple tools example completed successfully.\n');
}

// === Example 3: Tool Choice Control ===
// Demonstrates different tool choice strategies: auto, required, and none

async function toolChoiceExample() {
  printSectionHeader('Example 3: Tool Choice Control');
  console.log('Demonstrating different tool choice strategies.\n');

  const { provider, type } = createProviderFromEnv();
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

  // Scenario 1: Auto tool choice (AI decides when to use tools)
  console.log('Scenario 1: Auto tool choice - AI decides when to use tools');
  console.log('User: Hello, how are you?');

  let messages = [userText('Hello, how are you?')];

  const autoResult = await generate(provider!, messages, {
    model: modelName,
    tools: [calculatorTool],
    toolChoice: 'auto', // Let the AI decide
    maxOutputTokens: 150,
  });

  console.log('Assistant:', autoResult.content);
  console.log('Tool calls made:', autoResult.toolCalls ? 'Yes' : 'None');
  console.log('Result: AI correctly chose not to use calculator for a greeting.\n');

  // Scenario 2: Required tool use (force AI to use a tool)
  console.log('Scenario 2: Required tool use - Force AI to use a tool');
  console.log('User: Calculate 8 plus 12');

  messages = [userText('Calculate 8 plus 12')];

  try {
    const requiredResult = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      toolChoice: 'required', // Force tool use
      maxOutputTokens: 200,
    });

    console.log('Assistant:', requiredResult.content);
    console.log('Tool calls made:', requiredResult.toolCalls?.length || 0);

    // Execute the required tool call
    if (requiredResult.toolCalls && requiredResult.toolCalls.length > 0) {
      const toolCall = requiredResult.toolCalls[0];
      const result = handleToolCall(toolCall);
      console.log('Tool result:', JSON.parse(result));
      console.log('Result: AI was successfully forced to use the calculator.');
    }
  } catch (error) {
    console.error('Error with required tool choice:', error);
  }

  console.log('\nTool choice control examples completed.\n');
}

// === Example 4: Error Handling ===
// Shows how to handle errors gracefully when tools fail or return error states

async function toolErrorHandlingExample() {
  printSectionHeader('Example 4: Error Handling');
  console.log('Demonstrating graceful error handling when tools encounter problems.\n');

  const { provider, type } = createProviderFromEnv();
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

  const messages = conversation()
    .system('You are a helpful math assistant. Handle errors gracefully.')
    .user('What is 10 divided by 0?')
    .build();

  console.log('User: What is 10 divided by 0?');
  console.log('This will trigger divide-by-zero error handling.\n');

  try {
    const result = await generate(provider!, messages, {
      model: modelName,
      tools: [calculatorTool],
      maxOutputTokens: 300,
      temperature: 0.1,
    });

    console.log('Assistant:', result.content);

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('\nProcessing tool call with error condition...');
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      for (const toolCall of result.toolCalls) {
        console.log(`\nExecuting: ${toolCall.name}`);
        console.log('Arguments:', JSON.stringify(toolCall.arguments, null, 2));

        const toolResultValue = handleToolCall(toolCall);
        const parsedResult = JSON.parse(toolResultValue);

        console.log('Tool result:', parsedResult);

        if (parsedResult.error) {
          console.log('Error detected in tool result - handled gracefully.');
        }

        messages.push(toolResult(toolCall.id, toolResultValue));
      }

      // Let the AI respond to the error
      const finalResult = await generate(provider!, messages, {
        model: modelName,
        maxOutputTokens: 200,
        temperature: 0.3,
      });

      console.log('\nAssistant (final):', finalResult.content);
      console.log('Result: AI successfully explained the mathematical limitation.');
    }
  } catch (error) {
    console.error('Error during tool error handling example:', error);
  }

  console.log('\nError handling example completed successfully.\n');
}

// === Main Execution ===

async function main() {
  printDelimiter('AI Tools & Function Calling Examples');
  console.log('Comprehensive examples of AI tool integration and function calling.\n');

  try {
    await basicCalculatorExample();
    await multipleToolsExample();
    await toolChoiceExample();
    await toolErrorHandlingExample();

    printDelimiter('Examples Completed Successfully', '-');
    console.log('Key concepts demonstrated:');
    console.log('• Basic tool definition and usage');
    console.log('• Multiple tool coordination');
    console.log('• Tool choice control strategies');
    console.log('• Graceful error handling');
    console.log('\nYou can now implement robust AI tool integrations in your applications.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
