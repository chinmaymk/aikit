# Getting Started

So you want to pilot some LLMs? Good call. AIKit gets you from zero to **"Hello, LLM"** in one import. One interface for OpenAI, Anthropic, and Gemini. Zero runtime dependencies, fully typed, and small enough to tweet about.

## Installation

First things first, let's get this thing installed. Open your terminal and chant the sacred words:

::: code-group

```bash [npm]
npm install aikit
```

```bash [yarn]
yarn add aikit
```

```bash [pnpm]
pnpm add aikit
```

:::

## API Keys

AIKit is great, but it's not magic. You still need API keys from the providers you want to use.

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Don't have them yet? No problem. Here are the secret passages:

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com/dashboard](https://console.anthropic.com/dashboard)
- **Google**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## Basic Generation

Alright, let's make the magic happen. Here's how to get a simple response from a model.

```typescript
import { createProvider, userText } from 'aikit';

// Pick your player
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Hello, world!')];

// Get a complete response
const result = await provider.generate(messages, { model: 'gpt-4o' });
console.log(result.content);
```

## Streaming Responses

Who has time to wait for a full response? Let's stream it like it's hot.

```typescript
import { createProvider, userText, printStream } from 'aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Tell me a very short story.')];

// Simple streaming - print directly to console
await printStream(provider.generate(messages, { model: 'gpt-4o' }));

// Or handle the stream manually
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## Provider Switching

The beauty of AIKit? Same code, different AI. Switch providers with one line.

```typescript
import { createProvider, userText } from 'aikit';

// Define once, use anywhere
const question = [userText('Explain TypeScript in one sentence.')];
const options = { temperature: 0.7, maxTokens: 100 };

// OpenAI
const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const openaiResult = await openai.generate(question, { ...options, model: 'gpt-4o' });

// Anthropic
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
const anthropicResult = await anthropic.generate(question, {
  ...options,
  model: 'claude-3-5-sonnet-20241022',
});

// Google
const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
const googleResult = await google.generate(question, { ...options, model: 'gemini-1.5-pro' });
```

## Model Flexibility

**AIKit doesn't restrict which models you can use**—pass any model string that the provider API accepts. This gives you access to new models, custom fine-tuned models, or beta releases without waiting for library updates.

```typescript
import { createProvider, userText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Use any model the provider supports
await provider.generate([userText('Hello!')], { model: 'gpt-4o' });
await provider.generate([userText('Hello!')], { model: 'gpt-4o-mini' });
await provider.generate([userText('Hello!')], { model: 'your-custom-fine-tuned-model' });

// Same for other providers
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
await anthropic.generate([userText('Hello!')], { model: 'claude-3-5-sonnet-20241022' });
await anthropic.generate([userText('Hello!')], { model: 'claude-3-5-haiku-20241022' });

const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
await google.generate([userText('Hello!')], { model: 'gemini-2.0-flash' });
await google.generate([userText('Hello!')], { model: 'gemini-1.5-pro' });
```

_AIKit includes a reference list of available models per provider for informational purposes, but you're not limited to those models._

## Working with Images

Modern AI models can see. Let's show them something.

```typescript
import { createProvider, userImage } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Single image analysis
const message = userImage(
  'What do you see in this image?',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // Your base64 image
);

const result = await provider.generate([message], { model: 'gpt-4o' });
console.log(result.content);

// Multiple images
import { userMultipleImages } from 'aikit';

const multiMessage = userMultipleImages('Compare these images. What are the differences?', [
  imageData1,
  imageData2,
  imageData3,
]);

const comparison = await provider.generate([multiMessage], { model: 'gpt-4o' });
console.log(comparison.content);
```

## Function Calling (Tools)

Let your AI call functions. It's like giving it superpowers, but with more TypeScript.

```typescript
import { createProvider, createTool, userText, executeToolCall } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Define a weather tool
const weatherTool = createTool(
  'get_weather',
  'Get current weather information for a location',
  {
    location: { type: 'string', description: 'City name or location' },
    unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' },
  },
  ['location'] // Required parameters
);

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
const result = await provider.generate([userText("What's the weather like in Tokyo?")], {
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
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Build conversations fluently
const messages = conversation()
  .system('You are a helpful programming tutor.')
  .user('What is the difference between let and const?')
  .build();

const response1 = await provider.generate(messages, { model: 'gpt-4o' });
console.log('AI:', response1.content);

// Continue the conversation
messages.push(assistantText(response1.content));
messages.push(userText('Can you show me an example?'));

const response2 = await provider.generate(messages, { model: 'gpt-4o' });
console.log('AI:', response2.content);
```

## Configuration Options

Fine-tune your AI's personality and behavior.

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7, // 0.0 (focused) to 2.0 (creative)
  maxTokens: 1000, // Response length limit
  topP: 0.9, // Nucleus sampling
  frequencyPenalty: 0, // Reduce repetition
  presencePenalty: 0, // Encourage topic diversity
  stopSequences: ['END'], // Stop generation at these strings
};

const result = await provider.generate(messages, options);
```

## Error Handling

Sometimes things go sideways. Here's how to catch them gracefully.

```typescript
import { createProvider, userText, collectDeltas } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

try {
  const stream = provider.generate([userText('Hello!')], { model: 'gpt-4o' });

  // Collect the full response
  const result = await collectDeltas(stream);
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
const mockProvider = {
  async *generate(messages, options) {
    yield { delta: 'Hello ' };
    yield { delta: 'test!' };
    yield { delta: '', finishReason: 'stop', content: 'Hello test!' };
  },
};

// Use it just like a real provider
for await (const chunk of mockProvider.generate(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

## What's Next?

You've mastered the basics! Here's where to level up:

- **[API Reference](/api/generated/README)** - All the technical details
- **[Examples](/examples/README)** - More copy-paste-able code
- **[GitHub Issues](https://github.com/chinmaymk/aikit/issues)** - Report bugs or request features

Remember: AIKit is all about keeping things simple. If something feels too complex, it probably is. File an issue and let's make it better together!
