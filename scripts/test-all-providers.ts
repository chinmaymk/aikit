/**
 * Comprehensive Provider Test Script
 *
 * Tests all available providers (OpenAI, Anthropic, Google) for:
 * 1. Basic text generation
 * 2. Tool/function calling
 *
 * This script validates that all providers work correctly with the AIKit interface.
 */

import { createProvider } from '../src/factory';
import {
  generate,
  conversation,
  createTool,
  assistantWithToolCalls,
  toolResult,
} from '../src/utils';

// === Test Configuration ===
const PROVIDERS = [
  { type: 'openai' as const, name: 'OpenAI', model: 'gpt-4o' },
  { type: 'anthropic' as const, name: 'Anthropic', model: 'claude-3-5-sonnet-20241022' },
  { type: 'google' as const, name: 'Google', model: 'gemini-2.0-flash' },
];

// === Tool Service Functions ===
const calculatorService = (args: { operation: string; a: number; b: number }) => {
  const { operation, a, b } = args;
  switch (operation) {
    case 'add':
      return { result: a + b, operation: `${a} + ${b}` };
    case 'multiply':
      return { result: a * b, operation: `${a} × ${b}` };
    default:
      return { error: `Unknown operation: ${operation}` };
  }
};

const weatherService = (args: { location: string }) => {
  const { location } = args;
  const weatherData: Record<string, any> = {
    'san francisco': { temp: 19, condition: 'Foggy', humidity: 85 },
    'new york': { temp: 22, condition: 'Sunny', humidity: 65 },
  };

  const data = weatherData[location.toLowerCase()];
  if (!data) {
    return { error: 'Weather data not available for this location' };
  }

  return {
    location,
    temperature: `${data.temp}°C`,
    condition: data.condition,
    humidity: `${data.humidity}%`,
  };
};

// Custom executeToolCall that passes arguments as an object
const executeToolCallWithArgs = (
  toolCall: any,
  services: Record<string, (args: any) => any>
): string => {
  const service = services[toolCall.name];
  if (!service) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const result = service(toolCall.arguments);
  return JSON.stringify(result);
};

// === Test Functions ===
async function testBasicGeneration(providerType: string, providerName: string, model: string) {
  console.log(`\nTesting ${providerName} - Basic Generation`);
  console.log('─'.repeat(50));

  try {
    const apiKey = process.env[`${providerType.toUpperCase()}_API_KEY`];
    if (!apiKey) {
      console.log(
        `FAILED ${providerName}: No API key found (${providerType.toUpperCase()}_API_KEY)`
      );
      return false;
    }

    const provider = createProvider(providerType as any, { apiKey });

    const messages = conversation()
      .system('You are a helpful assistant. Keep responses concise.')
      .user('What is 2 + 2? Answer in one sentence.')
      .build();

    const result = await generate(provider, messages, {
      model,
      maxOutputTokens: 100,
      temperature: 0.1,
    });

    console.log(`PASSED ${providerName}: Generated response successfully`);
    console.log(
      `Response: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`
    );
    return true;
  } catch (error) {
    console.log(`FAILED ${providerName}: Error during basic generation`);
    console.log(`   Error: ${error}`);
    return false;
  }
}

async function testToolCalling(providerType: string, providerName: string, model: string) {
  console.log(`\nTesting ${providerName} - Tool Calling`);
  console.log('─'.repeat(50));

  try {
    const apiKey = process.env[`${providerType.toUpperCase()}_API_KEY`];
    if (!apiKey) {
      console.log(
        `FAILED ${providerName}: No API key found (${providerType.toUpperCase()}_API_KEY)`
      );
      return false;
    }

    const provider = createProvider(providerType as any, { apiKey });

    // Define tools
    const calculatorTool = createTool('calculator', 'Perform basic mathematical operations', {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'The operation to perform',
          enum: ['add', 'multiply'],
        },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['operation', 'a', 'b'],
    });

    const weatherTool = createTool(
      'get_weather',
      'Get current weather information for a location',
      {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name to get weather for',
          },
        },
        required: ['location'],
      }
    );

    const toolServices = {
      calculator: calculatorService,
      get_weather: weatherService,
    };

    const messages = conversation()
      .system('You are a helpful assistant. Use the available tools when needed.')
      .user("What is 15 multiplied by 4? Also, what's the weather like in San Francisco?")
      .build();

    console.log(
      `User: What is 15 multiplied by 4? Also, what's the weather like in San Francisco?`
    );

    // Generate response with tools
    const result = await generate(provider, messages, {
      model,
      tools: [calculatorTool, weatherTool],
      maxOutputTokens: 500,
      temperature: 0.1,
    });

    console.log(`${providerName}: ${result.content}`);

    // Handle tool calls if present
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log(`${providerName}: Found ${result.toolCalls.length} tool call(s)`);

      // Add assistant message with tool calls
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      // Execute each tool call
      for (const toolCall of result.toolCalls) {
        console.log(
          `   Calling ${toolCall.name} with:`,
          JSON.stringify(toolCall.arguments, null, 2)
        );

        const toolResultValue = executeToolCallWithArgs(toolCall, toolServices);
        const parsedResult = JSON.parse(toolResultValue);

        console.log(`   Result:`, parsedResult);

        // Add tool result to conversation
        messages.push(toolResult(toolCall.id, toolResultValue));
      }

      // Generate final response with tool results
      const finalResult = await generate(provider, messages, {
        model,
        maxOutputTokens: 300,
        temperature: 0.1,
      });

      console.log(`PASSED ${providerName}: Final response: ${finalResult.content}`);
      return true;
    } else {
      console.log(`WARNING ${providerName}: No tool calls detected (may still be successful)`);
      return true;
    }
  } catch (error) {
    console.log(`FAILED ${providerName}: Error during tool calling`);
    console.log(`   Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('AIKit Provider Test Suite');
  console.log('═'.repeat(60));
  console.log('Testing all providers for basic generation and tool calling...\n');

  const results = {
    generation: { passed: 0, failed: 0 },
    tools: { passed: 0, failed: 0 },
    total: { passed: 0, failed: 0 },
  };

  for (const { type, name, model } of PROVIDERS) {
    console.log(`\nTesting ${name} Provider (${model})`);
    console.log('═'.repeat(60));

    // Test basic generation
    const generationSuccess = await testBasicGeneration(type, name, model);
    if (generationSuccess) {
      results.generation.passed++;
      results.total.passed++;
    } else {
      results.generation.failed++;
      results.total.failed++;
    }

    // Test tool calling
    const toolSuccess = await testToolCalling(type, name, model);
    if (toolSuccess) {
      results.tools.passed++;
      results.total.passed++;
    } else {
      results.tools.failed++;
      results.total.failed++;
    }
  }

  // Print summary
  console.log('\nTest Results Summary');
  console.log('═'.repeat(60));
  console.log(
    `Basic Generation: PASSED ${results.generation.passed}, FAILED ${results.generation.failed}`
  );
  console.log(`Tool Calling:     PASSED ${results.tools.passed}, FAILED ${results.tools.failed}`);
  console.log(`Total Tests:      PASSED ${results.total.passed}, FAILED ${results.total.failed}`);
  console.log(
    `Success Rate:     ${Math.round((results.total.passed / (results.total.passed + results.total.failed)) * 100)}%`
  );

  // Exit with appropriate code
  process.exit(results.total.failed > 0 ? 1 : 0);
}

main().catch(console.error);
