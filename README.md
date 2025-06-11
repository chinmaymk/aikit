# AIKit

[![CI](https://github.com/chinmaymk/aikit/workflows/CI/badge.svg)](https://github.com/chinmaymk/aikit/actions)
[![Coverage Status](https://coveralls.io/repos/github/chinmaymk/aikit/badge.svg?branch=main)](https://coveralls.io/github/chinmaymk/aikit?branch=main)
[![codecov](https://codecov.io/gh/chinmaymk/aikit/branch/main/graph/badge.svg)](https://codecov.io/gh/chinmaymk/aikit)
[![npm version](https://badge.fury.io/js/aikit.svg)](https://badge.fury.io/js/aikit)

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

// Use any provider with the same interface
const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

for await (const chunk of openai.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## API Reference

### Messages

All providers use a consistent message format:

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: Content[];
  toolCalls?: ToolCall[];
}

type Content = TextContent | ImageContent | ToolResultContent;
```

### Generation Options

```typescript
interface GenerationOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number; // Google only
  stopSequences?: string[];
  tools?: Tool[];
  toolChoice?: 'auto' | 'required' | 'none' | { name: string };
}
```

### Streaming

All providers return async iterables for streaming:

```typescript
for await (const chunk of provider.generate(messages, options)) {
  console.log(chunk.delta); // Incremental text
  console.log(chunk.content); // Full content so far
  console.log(chunk.finishReason); // 'stop' | 'length' | 'tool_use'
  console.log(chunk.toolCalls); // Tool calls if any
}
```

## Supported Models

### OpenAI

- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo
- o1-preview
- o1-mini

### Anthropic

- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

### Google Gemini

- gemini-1.5-pro
- gemini-1.5-flash
- gemini-1.0-pro
- gemini-pro

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Build
npm run build
```

## License

ISC
