# Function Calling (Tools)

Welcome to the world of AI tools! This is where your AI stops being just a chatbot and becomes your personal assistant that can actually DO things. Weather data, calculations, database queries, API calls—your AI can do them all.

Pure text generation is useful, but sometimes you need your AI to _do_ things: fetch data, perform calculations, trigger actions. Function calling bridges the gap between AI reasoning and real-world functionality. It's like giving your AI hands to interact with the world, instead of just a mouth to talk about it.

Think of it as teaching your AI to use tools. First a calculator, then a whole toolbox!

## The Basic Pattern

Here's how it works (don't worry, we'll break this down step by step):

1. **Define tools** - Tell the AI what functions are available
2. **AI decides** - The model chooses which tools to use
3. **Execute functions** - Your code runs the actual functions
4. **Return results** - Feed the results back to the AI
5. **AI responds** - The model incorporates tool results into its response

Think of it as a conversation where your AI can pause mid-sentence and say "Hold on, let me check something" and actually go check it!

## Your First Tool: A Calculator

Let's start simple. Even AIs need help with math sometimes! 🧮

```typescript
import {
  createProvider,
  createTool,
  conversation,
  generate,
  assistantWithToolCalls,
  toolResult,
} from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define the tool
const calculatorTool = createTool('calculator', 'Perform basic mathematical operations', {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      description: 'The operation to perform',
      enum: ['add', 'subtract', 'multiply', 'divide'],
    },
    a: {
      type: 'number',
      description: 'First number',
    },
    b: {
      type: 'number',
      description: 'Second number',
    },
  },
  required: ['operation', 'a', 'b'],
});

// Step 3: Implement the actual function
// Note: LLMs can only pass objects, so we accept an object and destructure it
interface CalculatorArgs {
  operation: string;
  a: number;
  b: number;
}

function calculateMath(args: CalculatorArgs): string {
  const { operation, a, b } = args;

  switch (operation) {
    case 'add':
      return JSON.stringify({ result: a + b });
    case 'subtract':
      return JSON.stringify({ result: a - b });
    case 'multiply':
      return JSON.stringify({ result: a * b });
    case 'divide':
      return JSON.stringify({
        result: b !== 0 ? a / b : 'Cannot divide by zero',
      });
    default:
      return JSON.stringify({ error: 'Unknown operation' });
  }
}

// Step 4: Use the tool
const messages = conversation()
  .system(
    'You are a helpful math assistant. Use the calculator tool for any mathematical operations.'
  )
  .user('What is 15 multiplied by 7?')
  .build();

const result = await generate(provider, messages, {
  model: 'gpt-4o',
  tools: [calculatorTool],
});

console.log('AI:', result.content);

// Step 5: Handle tool calls if the AI decided to use them
if (result.toolCalls && result.toolCalls.length > 0) {
  // Add the AI's message (with tool calls) to our conversation
  messages.push(assistantWithToolCalls(result.content, result.toolCalls));

  // Execute each tool call
  for (const toolCall of result.toolCalls) {
    console.log(`Executing: ${toolCall.name}`);
    console.log('Input:', JSON.stringify(toolCall.arguments, null, 2));

    // Execute our calculator function
    const toolResponse = calculateMath(toolCall.arguments);
    console.log('Output:', toolResponse);

    // Add the result back to the conversation
    messages.push(toolResult(toolCall.id, toolResponse));
  }

  // Let the AI give a final response with the tool results
  const finalResult = await generate(provider, messages, {
    model: 'gpt-4o',
    maxOutputTokens: 200,
  });

  console.log('AI (final):', finalResult.content);
}
```

**What just happened?**

1. We defined a calculator tool that the AI can use
2. The AI decided it needed to use the calculator for multiplication
3. We executed the calculation and gave the result back to the AI
4. The AI incorporated the result into its final response

Magic! ✨ (Well, actually just good software engineering, but it feels like magic!)

## Multiple Tools: Building a Toolkit

Now let's give your AI a whole Swiss Army knife of tools:

```typescript
import {
  createProvider,
  createTool,
  conversation,
  generate,
  assistantWithToolCalls,
  toolResult,
} from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define multiple tools
const tools = [
  createTool('get_weather', 'Get current weather information for a location', {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name or location' },
      unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' },
    },
    required: ['location'],
  }),

  createTool('calculator', 'Perform mathematical calculations', {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number', description: 'First number' },
      b: { type: 'number', description: 'Second number' },
    },
    required: ['operation', 'a', 'b'],
  }),

  createTool('get_time', 'Get current time for a timezone', {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
    },
    required: ['timezone'],
  }),
];

// Implement your tool functions
interface WeatherArgs {
  location: string;
  unit?: string;
}

interface CalculatorArgs {
  operation: string;
  a: number;
  b: number;
}

interface TimeArgs {
  timezone: string;
}

function getWeather(args: WeatherArgs): string {
  const { location, unit = 'celsius' } = args;

  // Mock weather data (in real life, you'd call a weather API)
  const weatherData: Record<string, { temp: number; condition: string }> = {
    tokyo: { temp: 18, condition: 'Rainy' },
    london: { temp: 15, condition: 'Cloudy' },
    'new york': { temp: 22, condition: 'Sunny' },
  };

  const data = weatherData[location.toLowerCase()];
  if (!data) {
    return JSON.stringify({ error: 'Weather data not available for this location' });
  }

  const temp = unit === 'fahrenheit' ? Math.round((data.temp * 9) / 5 + 32) : data.temp;
  return JSON.stringify({
    location,
    temperature: `${temp}°${unit === 'fahrenheit' ? 'F' : 'C'}`,
    condition: data.condition,
  });
}

function calculate(args: CalculatorArgs): string {
  const { operation, a, b } = args;

  switch (operation) {
    case 'add':
      return JSON.stringify({ result: a + b });
    case 'subtract':
      return JSON.stringify({ result: a - b });
    case 'multiply':
      return JSON.stringify({ result: a * b });
    case 'divide':
      return JSON.stringify({
        result: b !== 0 ? a / b : 'Cannot divide by zero',
      });
    default:
      return JSON.stringify({ error: 'Unknown operation' });
  }
}

function getTime(args: TimeArgs): string {
  const { timezone } = args;

  try {
    const now = new Date();
    const time = now.toLocaleString('en-US', { timeZone: timezone });
    return JSON.stringify({ timezone, time });
  } catch {
    return JSON.stringify({ error: 'Invalid timezone' });
  }
}

// Simple tool execution helper
function handleToolCall(toolCall: any): string {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case 'get_weather':
      return getWeather(args);
    case 'calculator':
      return calculate(args);
    case 'get_time':
      return getTime(args);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// Use multiple tools in one conversation
const messages = conversation()
  .system('You are a helpful assistant with access to weather, calculator, and time tools.')
  .user("What's the weather in Tokyo? Also, what's 25°C in Fahrenheit? And what time is it there?")
  .build();

// The AI might need multiple rounds to use all the tools
let conversationComplete = false;
let iteration = 0;
const maxIterations = 3;

while (!conversationComplete && iteration < maxIterations) {
  iteration++;
  console.log(`--- Round ${iteration} ---`);

  const result = await generate(provider, messages, {
    model: 'gpt-4o',
    tools,
    maxOutputTokens: 500,
  });

  console.log('AI:', result.content);

  if (result.toolCalls && result.toolCalls.length > 0) {
    // Add assistant message with tool calls
    messages.push(assistantWithToolCalls(result.content, result.toolCalls));

    // Execute each tool call
    for (const toolCall of result.toolCalls) {
      console.log(`Using tool: ${toolCall.name}`);

      const toolResponse = handleToolCall(toolCall);
      console.log('Tool result:', JSON.parse(toolResponse));

      // Add tool result to conversation
      messages.push(toolResult(toolCall.id, toolResponse));
    }
  } else {
    conversationComplete = true;
  }
}
```

**What's happening here?**

The AI is smart enough to:

1. Use the weather tool to get Tokyo's weather
2. Use the calculator to convert 25°C to Fahrenheit
3. Use the time tool to get Tokyo's current time
4. Combine all the information into a helpful response

It's like having a really smart assistant who knows exactly which tools to use! 🤖

## Taking Control: Tool Choice Options

Sometimes you want to be the boss and tell your AI when to use tools:

```typescript
// Let the AI decide (default behavior)
const autoResult = await generate(provider, messages, {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'auto', // AI decides whether to use tools
});

// Force the AI to use a tool
const forcedResult = await generate(provider, messages, {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'required', // AI MUST use a tool
});

// Disable tools for this request
const noToolsResult = await generate(provider, messages, {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'none', // No tools allowed
});
```

**When to use each:**

- `auto` (default): Let the AI decide. Usually the best choice.
- `required`: When you know the AI needs to use a tool. Great for structured data extraction.
- `none`: When you want a pure text response, even if tools are available.

## Error Handling: When Things Go Wrong

Tools can fail. Here's how to handle it gracefully:

```typescript
function riskyCalculation(args: CalculatorArgs): string {
  const { operation, a, b } = args;

  try {
    if (operation === 'divide' && b === 0) {
      return JSON.stringify({
        error: 'Cannot divide by zero',
        suggestion: 'Try a different number for the second parameter',
      });
    }

    // ... rest of calculation logic
  } catch (error) {
    return JSON.stringify({
      error: 'Calculation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// In your tool execution
function handleToolCall(toolCall: any): string {
  try {
    const { name, arguments: args } = toolCall;

    switch (name) {
      case 'calculator':
        return riskyCalculation(args);
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    console.error('Tool execution failed:', error);
    return JSON.stringify({
      error: 'Tool execution failed',
      toolName: toolCall.name,
    });
  }
}
```

**Error handling best practices:**

1. Always return JSON, even for errors
2. Provide helpful error messages
3. Log errors for debugging
4. Consider fallback strategies
5. Let the AI know what went wrong so it can respond appropriately

## Advanced Patterns

### Pattern 1: Conditional Tool Loading

```typescript
// Load different tools based on user context
function getToolsForUser(userRole: string) {
  const baseTool = [calculatorTool, weatherTool];

  if (userRole === 'admin') {
    return [...baseTools, databaseTool, systemTool];
  }

  return baseTools;
}

const tools = getToolsForUser(currentUser.role);
```

### Pattern 2: Tool Result Validation

```typescript
function validateToolResult(toolName: string, result: string): boolean {
  try {
    const parsed = JSON.parse(result);

    switch (toolName) {
      case 'calculator':
        return typeof parsed.result === 'number' || parsed.error;
      case 'weather':
        return (parsed.temperature && parsed.condition) || parsed.error;
      default:
        return true;
    }
  } catch {
    return false;
  }
}
```

### Pattern 3: Tool Chaining

```typescript
// Tools that use results from other tools
function enhancedWeatherTool(args: WeatherArgs): string {
  const weatherResult = getWeather(args);
  const weather = JSON.parse(weatherResult);

  if (weather.error) return weatherResult;

  // Add additional context
  const temp = parseInt(weather.temperature);
  const recommendation =
    temp > 25
      ? 'Great day for outdoor activities!'
      : temp < 10
        ? "Bundle up, it's cold!"
        : 'Perfect weather for a walk!';

  return JSON.stringify({
    ...weather,
    recommendation,
  });
}
```

## Best Practices

### 🎯 Tool Design

- **Keep tools focused**: Each tool should do one thing well
- **Use clear names**: `get_weather` is better than `weather_api_call`
- **Provide good descriptions**: Help the AI understand when to use each tool
- **Define clear parameters**: Use enums and descriptions liberally

### 🔒 Security

- **Validate all inputs**: Never trust tool arguments blindly
- **Sanitize data**: Especially for database queries or file operations
- **Use least privilege**: Only give tools the permissions they need
- **Rate limit**: Prevent abuse of expensive operations

### 🚀 Performance

- **Cache results**: Don't call the same API twice
- **Use async operations**: Don't block on slow tools
- **Implement timeouts**: Don't let tools hang forever
- **Batch operations**: Combine multiple calls when possible

### 🐛 Debugging

- **Log everything**: Tool calls, arguments, results, errors
- **Use structured logging**: JSON logs are your friend
- **Provide context**: Include user ID, session ID, etc.
- **Monitor usage**: Track which tools are used most

## Streaming with Tools

Tools work with streaming too! The AI will typically complete tool calls before streaming the final response:

```typescript
import { processStream } from '@chinmaymk/aikit';

const stream = provider(messages, {
  model: 'gpt-4o',
  tools: [weatherTool],
});

await processStream(stream, {
  onContent: content => {
    process.stdout.write(content); // Stream the response
  },
  onToolCalls: toolCalls => {
    console.log('\nTool calls detected:', toolCalls);
    // Handle tool calls here
  },
  onFinish: (reason, result) => {
    console.log('\nStream completed:', reason);
  },
});
```

## What's Next?

You've mastered AI tools! Here's what to explore next:

- **[Conversations Guide](./conversations.md)** - Manage context with tools
- **[Streaming Guide](./streaming.md)** - Stream responses with tool results
- **[API Reference](/api/generated/README)** - Technical details on tool interfaces

## Quick Reference

```typescript
// Create a tool
const tool = createTool('name', 'description', {
  type: 'object',
  properties: {
    /* parameters */
  },
  required: ['param1', 'param2'],
});

// Use tools
const result = await generate(provider, messages, {
  tools: [tool1, tool2],
  toolChoice: 'auto' | 'required' | 'none',
});

// Handle tool calls
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const toolResult = executeYourFunction(toolCall.arguments);
    messages.push(toolResult(toolCall.id, toolResult));
  }
}
```

Remember: Tools are about empowering your AI to take action. Start simple, validate everything, and always think about security. Your AI assistant just became a lot more capable! 🚀
