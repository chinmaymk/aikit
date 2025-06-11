# Getting Started

AIKit provides lightweight generation abstraction for OpenAI, Anthropic, and Google Gemini APIs.

## Scope

**Use AIKit for**: Generation, streaming, tool calling (text and image inputs)  
**Use official SDKs for**: Fine-tuning, embeddings, moderation, file management, assistants

## Installation

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

Set environment variables for the providers you want to use:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Get API keys from:

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey

## Basic Usage

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

// Simple generation
const response = await provider.generate(messages, { model: 'gpt-4o' }).next();
console.log(response.value?.content);
```

## Streaming

```typescript
// Stream the response
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
  if (chunk.finishReason) break;
}
```

## Multiple Providers

```typescript
// Same interface for all providers
const openai = createAIProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const anthropic = createAIProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
const google = createAIProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

// Use any provider with the same interface
const openaiResponse = openai.generate(messages, { model: 'gpt-4o' });
const anthropicResponse = anthropic.generate(messages, { model: 'claude-3-5-sonnet-20241022' });
const googleResponse = google.generate(messages, { model: 'gemini-1.5-pro' });
```

## Next Steps

- [API Reference](/api/) for detailed documentation
- [Examples](/examples/) for more code samples
