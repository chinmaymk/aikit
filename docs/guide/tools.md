# Function Calling (Tools)

Function calling lets your AI use tools—turning it from a chatbot into an action-taking assistant. Weather data, calculations, database queries, API calls—your AI can do them all. Let's give your AI some superpowers.

## Why Function Calling?

Pure text generation is useful, but sometimes you need your AI to _do_ things: fetch data, perform calculations, trigger actions. Function calling bridges the gap between AI reasoning and real-world functionality.

## The Basic Pattern

1. **Define tools** - Tell the AI what functions are available
2. **AI decides** - The model chooses which tools to use
3. **Execute functions** - Your code runs the actual functions
4. **Return results** - Feed the results back to the AI
5. **AI responds** - The model incorporates tool results into its response

## Simple Tool Example

Let's start with a basic calculator tool:

```typescript
import { createProvider, createTool, userText, executeToolCall } from '@chinmaymk/aikit';

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

// Implement the actual function
const toolServices = {
  calculator: (operation: string, a: number, b: number) => {
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
  },
};

// Use the tool
const result = await provider.generate([userText('What is 15 multiplied by 7?')], {
  model: 'gpt-4o',
  tools: [calculatorTool],
});

console.log('AI:', result.content);

// Handle tool calls
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const toolResult = executeToolCall(toolCall, toolServices);
    console.log('Tool result:', toolResult);
  }
}
```

> **💡 Helper Functions are Optional**  
> Functions like `createTool()` and `executeToolCall()` are convenience helpers. You can work with tools manually:
>
> ```typescript
> // Using helpers (recommended)
> const tool = createTool('my_tool', 'Description', schema);
>
> // Manual construction (also valid)
> const tool = {
>   name: 'my_tool',
>   description: 'Description',
>   parameters: schema,
> };
> ```

## Complete Tool Workflow

Here's a full example showing the entire conversation flow:

```typescript
import {
  createProvider,
  createTool,
  userText,
  executeToolCall,
  assistantWithToolCalls,
  toolResult,
  conversation,
} from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Define a weather tool
const weatherTool = createTool('get_weather', 'Get current weather information for a location', {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'City name or location' },
    unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' },
  },
  required: ['location'],
});

// Mock weather service
const toolServices = {
  get_weather: (location: string, unit = 'celsius') => {
    const weatherData = {
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
  },
};

// Start conversation
const messages = conversation()
  .system(
    'You are a helpful weather assistant. Use the weather tool to provide current conditions.'
  )
  .user("What's the weather like in Tokyo?")
  .build();

console.log("User: What's the weather like in Tokyo?");

// Generate with tools
const result = await provider.generate(messages, {
  model: 'gpt-4o',
  tools: [weatherTool],
  maxOutputTokens: 300,
});

console.log('AI:', result.content);

// Handle tool calls
if (result.toolCalls && result.toolCalls.length > 0) {
  // Add assistant message with tool calls
  messages.push(assistantWithToolCalls(result.content, result.toolCalls));

  // Execute each tool call
  for (const toolCall of result.toolCalls) {
    console.log(`\nExecuting: ${toolCall.name}`);
    console.log('Arguments:', JSON.stringify(toolCall.arguments, null, 2));

    const toolResultData = executeToolCall(toolCall, toolServices);
    console.log('Result:', toolResultData);

    // Add tool result to conversation
    messages.push(toolResult(toolCall.id, toolResultData));
  }

  // Generate final response with tool results
  const finalResult = await provider.generate(messages, {
    model: 'gpt-4o',
    maxOutputTokens: 200,
  });

  console.log('\nAI (final):', finalResult.content);
}
```

## Multiple Tools

Your AI can use multiple tools in a single conversation:

```typescript
import { createProvider, createTool, userText } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Weather tool
const weatherTool = createTool('get_weather', 'Get weather information', {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'City name' },
  },
  required: ['location'],
});

// Time tool
const timeTool = createTool('get_time', 'Get current time for a timezone', {
  type: 'object',
  properties: {
    timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
  },
  required: ['timezone'],
});

// Calculator tool
const calculatorTool = createTool('calculate', 'Perform mathematical calculations', {
  type: 'object',
  properties: {
    expression: { type: 'string', description: 'Mathematical expression to evaluate' },
  },
  required: ['expression'],
});

const toolServices = {
  get_weather: (location: string) => {
    return JSON.stringify({ location, temp: '22°C', condition: 'Sunny' });
  },
  get_time: (timezone: string) => {
    return JSON.stringify({
      timezone,
      time: new Date().toLocaleString('en-US', { timeZone: timezone }),
    });
  },
  calculate: (expression: string) => {
    try {
      // Simple calculator (in production, use a proper math parser)
      const result = eval(expression);
      return JSON.stringify({ expression, result });
    } catch (error) {
      return JSON.stringify({ error: 'Invalid expression' });
    }
  },
};

// The AI can now use any of these tools
const result = await provider.generate(
  [userText("What's the weather in Tokyo, what time is it there, and what's 15% of 2000?")],
  {
    model: 'gpt-4o',
    tools: [weatherTool, timeTool, calculatorTool],
    maxOutputTokens: 400,
  }
);

console.log('AI:', result.content);

// Handle multiple tool calls...
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const toolResultData = executeToolCall(toolCall, toolServices);
    console.log(`${toolCall.name}:`, toolResultData);
  }
}
```

## Tool Choice Control

Sometimes you want to force the AI to use a specific tool, or prevent tool use entirely:

```typescript
import { createProvider, createTool, userText } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const calculatorTool = createTool(
  'calculator',
  'Do math',
  {
    expression: { type: 'string', description: 'Math expression' },
  },
  ['expression']
);

// Force tool use
const forcedResult = await provider.generate([userText('What is 2 + 2?')], {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'required', // Force the AI to use a tool
});

// Prefer tool use but allow text-only response
const preferredResult = await provider.generate([userText('What is 2 + 2?')], {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'auto', // Let AI decide (default)
});

// Disable tool use
const noToolsResult = await provider.generate([userText('What is 2 + 2?')], {
  model: 'gpt-4o',
  tools: [calculatorTool],
  toolChoice: 'none', // Disable tools for this request
});
```

## Error Handling

Tools can fail. Handle errors gracefully:

```typescript
import { createProvider, createTool, userText, executeToolCall } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const databaseTool = createTool(
  'query_database',
  'Query the user database',
  {
    query: { type: 'string', description: 'SQL query to execute' },
  },
  ['query']
);

const toolServices = {
  query_database: (query: string) => {
    try {
      // Simulate database error
      if (query.includes('DROP')) {
        throw new Error('DROP operations not allowed');
      }

      // Simulate successful query
      return JSON.stringify({
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        count: 2,
      });
    } catch (error) {
      return JSON.stringify({
        error: error.message,
        query: query,
      });
    }
  },
};

const result = await provider.generate([userText('Show me all users from the database')], {
  model: 'gpt-4o',
  tools: [databaseTool],
});

if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    try {
      const toolResultData = executeToolCall(toolCall, toolServices);
      const parsedResult = JSON.parse(toolResultData);

      if (parsedResult.error) {
        console.error(`Tool error: ${parsedResult.error}`);
        // You could retry, use a fallback, or inform the user
      } else {
        console.log('Tool success:', parsedResult);
      }
    } catch (error) {
      console.error('Failed to execute tool:', error);
    }
  }
}
```

## Streaming with Tools

Tools work with streaming too, though tool calls typically complete before streaming the final response:

```typescript
import { createProvider, createTool, userText, processStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const weatherTool = createTool('get_weather', 'Get weather data', {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'City name' },
  },
  required: ['location'],
});

const toolServices = {
  get_weather: (location: string) =>
    JSON.stringify({
      location,
      temp: '25°C',
      condition: 'Sunny',
    }),
};

// Stream the response
const stream = provider.generate(
  [userText("What's the weather in Sydney and should I go for a walk?")],
  { model: 'gpt-4o', tools: [weatherTool] }
);

await processStream(stream, {
  onDelta: delta => process.stdout.write(delta),
  onChunk: chunk => {
    if (chunk.toolCalls) {
      console.log('\n[Tool calls detected]');
      // Handle tool calls here
    }
  },
  onFinish: reason => console.log(`\nCompleted: ${reason}`),
});
```

## Real-World Tool Examples

### File Operations

```typescript
const fileOperationsTool = createTool('file_operations', 'Read, write, or list files', {
  type: 'object',
  properties: {
    operation: { type: 'string', enum: ['read', 'write', 'list'] },
    path: { type: 'string', description: 'File or directory path' },
    content: { type: 'string', description: 'Content to write (for write operation)' },
  },
  required: ['operation', 'path'],
});
```

### API Calls

```typescript
const apiCallTool = createTool('api_call', 'Make HTTP requests to external APIs', {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'API endpoint URL' },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
    headers: { type: 'object', description: 'Request headers' },
    body: { type: 'string', description: 'Request body for POST/PUT' },
  },
  required: ['url', 'method'],
});
```

### Database Queries

```typescript
const databaseTool = createTool('database_query', 'Execute database queries', {
  type: 'object',
  properties: {
    table: { type: 'string', description: 'Table name' },
    operation: { type: 'string', enum: ['select', 'insert', 'update', 'delete'] },
    conditions: { type: 'object', description: 'Query conditions' },
  },
  required: ['table', 'operation'],
});
```

## Best Practices

1. **Keep tools focused** - Each tool should do one thing well
2. **Validate inputs** - Always check tool parameters before execution
3. **Handle errors gracefully** - Return meaningful error messages
4. **Provide good descriptions** - Help the AI understand when to use each tool
5. **Return structured data** - JSON is your friend
6. **Be security conscious** - Validate and sanitize all tool inputs

## Common Patterns

### Tool Result Validation

```typescript
function validateToolResult(result: string) {
  try {
    const parsed = JSON.parse(result);
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid tool result: ${error.message}`);
  }
}
```

### Async Tool Services

```typescript
const toolServices = {
  async fetch_data(url: string) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
};
```

### Tool Result Caching

```typescript
const toolCache = new Map();

const toolServices = {
  expensive_operation: (input: string) => {
    if (toolCache.has(input)) {
      return toolCache.get(input);
    }

    const result = performExpensiveOperation(input);
    toolCache.set(input, result);
    return result;
  },
};
```

## What's Next?

- [Conversations Guide](./conversations.md) - Manage context with tools
- [Streaming Guide](./streaming.md) - Stream responses with tool results
- [API Reference](/api/generated/README) - Technical details on tool interfaces

Remember: Tools are about empowering your AI to take action. Start simple, validate everything, and always think about security. Your AI assistant just became a lot more capable!
