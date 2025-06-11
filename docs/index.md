# AIKit Documentation

A unified TypeScript abstraction over OpenAI, Anthropic, and Google Gemini APIs.

## Features

- 🔄 **Unified Interface**: Single API for OpenAI, Anthropic, and Google Gemini
- 📡 **Streaming Support**: Real-time response streaming for all providers
- 🖼️ **Multimodal**: Support for text and image inputs
- 🛠️ **Tool Use**: Function calling capabilities across providers
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Well Tested**: Comprehensive test suite with 100% coverage

## Quick Start

```typescript
import { createAIProvider } from 'aikit';

// Create a provider
const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate streaming response
const messages = [{ 
  role: 'user', 
  content: [{ type: 'text', text: 'Hello, world!' }] 
}];

for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

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

## Next Steps

- [Get Started](./guide/getting-started) - Learn the basics
- [API Reference](./api/) - Detailed API documentation
- [Examples](./examples/) - Code examples for each provider 