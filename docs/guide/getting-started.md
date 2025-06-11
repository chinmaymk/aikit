# Getting Started

AIKit provides a unified interface for working with OpenAI, Anthropic, and Google Gemini APIs. This guide will help you get up and running quickly.

## Installation

Install AIKit using your preferred package manager:

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

## Setup API Keys

Before using AIKit, you'll need API keys from the providers you want to use:

### OpenAI

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set the environment variable:

```bash
export OPENAI_API_KEY="your-openai-api-key"
```

### Anthropic

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Set the environment variable:

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Google Gemini

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Set the environment variable:

```bash
export GOOGLE_API_KEY="your-google-api-key"
```

## Basic Usage

Here's a simple example using OpenAI:

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Hello, how are you?' }],
  },
];

// Simple generation
const response = await provider
  .generate(messages, {
    model: 'gpt-4o',
  })
  .next();

console.log(response.value?.content);
```

## Streaming Responses

AIKit supports streaming for real-time responses:

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Tell me a story' }],
  },
];

// Stream the response
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);

  if (chunk.finishReason) {
    console.log('\nFinished:', chunk.finishReason);
    break;
  }
}
```

## Using Different Providers

The beauty of AIKit is that you can switch between providers with the same interface:

```typescript
import { createAIProvider } from 'aikit';

// OpenAI
const openai = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Anthropic
const anthropic = createAIProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Google Gemini
const google = createAIProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
});

const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Explain quantum computing' }],
  },
];

// Same interface for all providers
const openaiResponse = openai.generate(messages, { model: 'gpt-4o' });
const anthropicResponse = anthropic.generate(messages, { model: 'claude-3-5-sonnet-20241022' });
const googleResponse = google.generate(messages, { model: 'gemini-1.5-pro' });
```

## Next Steps

- Check out the [API Reference](/api/) for detailed documentation
- Browse [Examples](/examples/) for more code samples
- View the complete [Factory Functions](/api/factory) documentation
