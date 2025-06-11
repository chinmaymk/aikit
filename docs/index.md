# AIKit Documentation

**Lightweight generation abstraction for OpenAI, Anthropic, and Google Gemini.**

Minimal wrapper that preserves native generation capabilities while providing a unified interface.

## Scope

**Use AIKit for**: Generation, streaming, tool calling (text and image inputs)  
**Use official SDKs for**: Fine-tuning, embeddings, moderation, file management, assistants

## Features

- 🪶 **Minimal**: Lightweight wrapper preserving native capabilities
- ⚙️ **Complete**: Full access to provider-specific generation options
- 🔄 **Unified**: Consistent API across providers
- 📡 **Streaming**: Native streaming support
- 🖼️ **Multimodal**: Text and image inputs
- 🛠️ **Tools**: Function calling support
- 📝 **TypeScript**: Full type safety

## Quick Start

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

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
