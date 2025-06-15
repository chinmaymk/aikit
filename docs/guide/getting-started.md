# Getting Started

Ready to pilot some LLMs? AIKit gets you from zero to **"Hello, LLM"** in one import. One interface for OpenAI, Anthropic, and Gemini. Zero runtime dependencies, fully typed, and small enough to tweet about.

## Installation

First things first, let's get this installed. Open your terminal and run:

[![npm version](https://badge.fury.io/js/@chinmaymk%2Faikit.svg)](https://www.npmjs.com/package/@chinmaymk/aikit)

::: code-group

```bash [npm]
npm install @chinmaymk/aikit
```

```bash [yarn]
yarn add @chinmaymk/aikit
```

```bash [pnpm]
pnpm add @chinmaymk/aikit
```

:::

## API Keys

AIKit is great, but it's not magic. You still need API keys from the providers you want to use.

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Don't have them yet? Here's where to get them:

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com/dashboard](https://console.anthropic.com/dashboard)
- **Google**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## Basic Generation

Let's make the magic happen. Here's how to get a simple response from a model. AIKit offers two approaches—use what feels right for your situation:

### Factory Pattern vs Direct Functions

```typescript
import { createProvider, openai, userText } from '@chinmaymk/aikit';

// Factory pattern - configure once, use many times
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
});

const result1 = await provider([userText('Hello!')]);
const result2 = await provider([userText('Tell me a joke')], { temperature: 0.9 }); // Override

// Direct functions - configure each time
const result3 = await openai([userText('Hello!')], {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
});
```

**Use factory pattern when:** Making multiple calls, building services, setting defaults  
**Use direct functions when:** One-off calls, comparing providers, quick scripts

> **💡 Helper Functions are Optional**  
> Functions like `userText()`, `systemText()`, and `createProvider()` are convenience helpers. You can always construct message objects and providers manually if you prefer.

## Streaming Responses

Real-time responses, character by character:

```typescript
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});

// Simple streaming - print directly to console
await printStream(provider([userText('Tell me a story')]));

// Manual control
for await (const chunk of provider([userText('Count to 10')])) {
  process.stdout.write(chunk.delta);
  if (chunk.finishReason) console.log('\nDone!');
}
```

## Configuration Flexibility

AIKit uses a flexible configuration system where you can set defaults at construction time and override them at generation time. This gives you maximum flexibility while maintaining clean, readable code.

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

// Set defaults at construction
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
  maxOutputTokens: 200,
});

// Use defaults
const result1 = await provider([userText('Hello!')]);

// Override specific options
const result2 = await provider([userText('Be creative!')], {
  temperature: 0.9, // Higher creativity
  maxOutputTokens: 100, // Shorter response
});
```

## Switching Between Providers

Need to try different AI providers? AIKit makes it seamless:

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

const messages = [userText('Explain TypeScript in one sentence.')];

// Try OpenAI first
const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const openaiResult = await openai(messages, { model: 'gpt-4o' });

// Switch to Anthropic - same message, different AI
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
const anthropicResult = await anthropic(messages, { model: 'claude-3-5-sonnet-20241022' });

// Or try Google - still the same message format
const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
const googleResult = await google(messages, { model: 'gemini-2.0-flash' });

// Compare the responses
console.log('OpenAI says:', openaiResult.content);
console.log('Anthropic says:', anthropicResult.content);
console.log('Google says:', googleResult.content);
```

**Why switch providers?**

- Compare response quality for your specific use case
- Test different pricing models
- Avoid downtime if one provider has issues
- Use provider-specific features (like OpenAI's o-series reasoning)

## Switching Between Models

Each provider offers different models with different capabilities:

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const messages = [userText('Write a haiku about programming')];

// Fast and cheap for simple tasks
const fastResult = await provider(messages, { model: 'gpt-4o-mini' });

// More capable for complex tasks
const smartResult = await provider(messages, { model: 'gpt-4o' });

// Reasoning model for complex problem-solving
const reasoningResult = await provider(messages, { model: 'o1-mini' });

console.log('Fast model:', fastResult.content);
console.log('Smart model:', smartResult.content);
console.log('Reasoning model:', reasoningResult.content);
```

## Working with Images

Modern AI models can see. Let's show them something.

```typescript
import { createProvider, userImage, userMultipleImages } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Single image analysis
const message = userImage(
  'What do you see in this image?',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // Your base64 image
);

const result = await provider([message], { model: 'gpt-4o' });
console.log(result.content);

// Multiple images
const multiMessage = userMultipleImages('Compare these images. What are the differences?', [
  imageData1,
  imageData2,
  imageData3,
]);

const comparison = await provider([multiMessage], { model: 'gpt-4o' });
console.log(comparison.content);
```

## Function Calling (Tools)

Let your AI call functions. It's like giving it superpowers, but with more TypeScript.

```typescript
import { createProvider, createTool, userText, executeToolCall } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define a weather tool
const weatherTool = createTool('get_weather', 'Get current weather information for a location', {
  type: 'object',
  properties: {
    location: {
      type: 'string',
      description: 'City name or location',
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
      description: 'Temperature unit',
    },
  },
  required: ['location'],
});

// Implement the actual function
const toolServices = {
  get_weather: (location: string, unit = 'celsius') => {
    // Your weather API call here
    return JSON.stringify({
      location,
      temperature: `22°${unit === 'fahrenheit' ? 'F' : 'C'}`,
      condition: 'Sunny',
    });
  },
};

// Use the tool
const result = await provider([userText("What's the weather like in Tokyo?")], {
  model: 'gpt-4o',
  tools: [weatherTool],
});

// Handle tool calls
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const toolResult = executeToolCall(toolCall, toolServices);
    console.log('Tool result:', toolResult);
  }
}
```

## Conversation Management

Keep context across multiple exchanges. Because good conversations need memory.

```typescript
import { createProvider, conversation, userText, assistantText } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Build conversations fluently
const messages = conversation()
  .system('You are a helpful programming tutor.')
  .user('What is the difference between let and const?')
  .build();

const response1 = await provider(messages, { model: 'gpt-4o' });
console.log('AI:', response1.content);

// Continue the conversation
messages.push(assistantText(response1.content));
messages.push(userText('Can you show me an example?'));

const response2 = await provider(messages, { model: 'gpt-4o' });
console.log('AI:', response2.content);
```

## Configuration Options

Fine-tune your AI's personality and behavior.

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7, // 0.0 (focused) to 2.0 (creative)
  maxOutputTokens: 1000, // Response length limit
  topP: 0.9, // Nucleus sampling
  frequencyPenalty: 0, // Reduce repetition
  presencePenalty: 0, // Encourage topic diversity
  stopSequences: ['END'], // Stop generation at these strings
};

const result = await provider(messages, options);
```

### Custom Headers

Need to add custom headers for tracking, authentication, or debugging? Use the `mutateHeaders` option:

```typescript
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  mutateHeaders: headers => {
    headers['X-Request-ID'] = `req-${Date.now()}`;
    headers['X-User-Agent'] = 'MyApp/1.0';
  },
});
```

Learn more in the [Custom Headers guide](/guide/custom-headers).

## Error Handling

Sometimes things go sideways. Here's how to catch them gracefully.

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

try {
  const stream = provider([userText('Hello!')], { model: 'gpt-4o' });

  // Collect the full response
  const result = await collectStream(stream);
  console.log(result.content);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Houston, we have an API key problem:', error);
  } else if (error.message.includes('rate limit')) {
    console.error('Slow down there, speed racer:', error);
  } else {
    console.error('Something went sideways:', error);
  }
}
```

## Testing Your Code

Need to fake an LLM call in CI? Providers in AIKit are plain async generators, so you can stub them with just a function:

```typescript
// Mock provider for testing
const mockProvider = async function* (messages, options) {
  yield { delta: 'Hello ' };
  yield { delta: 'test!' };
  yield { delta: '', finishReason: 'stop', content: 'Hello test!' };
};

// Use it just like a real provider
for await (const chunk of mockProvider(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

## What's Next?

You've mastered the basics! Here's where to level up:

- **[API Reference](/api/generated/README)** - All the technical details
- **[Examples](/examples/README)** - More copy-paste-able code
- **[GitHub Issues](https://github.com/chinmaymk/aikit/issues)** - Report bugs or request features

Remember: AIKit is all about keeping things simple. If something feels too complex, it probably is. File an issue and let's make it better together!
