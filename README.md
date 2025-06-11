# AIKit

[![CI](https://github.com/chinmaymk/aikit/workflows/CI/badge.svg)](https://github.com/chinmaymk/aikit/actions)
[![codecov](https://codecov.io/gh/chinmaymk/aikit/branch/main/graph/badge.svg)](https://codecov.io/gh/chinmaymk/aikit)

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

## Installation

```bash
npm install aikit
```

## Quick Start

```typescript
import { createProvider } from 'aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## Documentation

📚 **[Full Documentation](https://chinmaymk.github.io/aikit/)**

## License

MIT © 2025
