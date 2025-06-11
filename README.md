# AIKit

[![CI](https://github.com/chinmaymk/aikit/workflows/CI/badge.svg)](https://github.com/chinmaymk/aikit/actions)
[![codecov](https://codecov.io/gh/chinmaymk/aikit/branch/main/graph/badge.svg)](https://codecov.io/gh/chinmaymk/aikit)

A unified TypeScript abstraction over OpenAI, Anthropic, and Google Gemini APIs. Provides consistent interfaces for text generation, streaming, multimodal content, and tool use across all three providers.

## Features

- 🔄 **Unified Interface**: Single API for OpenAI, Anthropic, and Google Gemini
- 📡 **Streaming Support**: Real-time response streaming for all providers
- 🖼️ **Multimodal**: Support for text and image inputs
- 🛠️ **Tool Use**: Function calling capabilities across providers
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Well Tested**: Comprehensive test suite with 100% coverage

## Installation

```bash
npm install aikit
```

## Quick Start

```typescript
import { createProvider } from 'aikit';

// Create a provider
const provider = createProvider('openai', {
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

## Documentation

📚 **[View Full Documentation](https://chinmaymk.github.io/aikit/)**

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development setup and contribution guidelines.

## License

MIT © 2025
