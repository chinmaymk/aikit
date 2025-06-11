# API Reference

Unified interface for generation across AI providers.

## Overview

- **[Factory Functions](./factory.md)** - Create provider instances

## Core Interface

All providers implement `AIProvider`:

```typescript
interface AIProvider {
  readonly models: string[];
  generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk>;
}
```

## Quick Start

```typescript
import { createProvider } from 'aikit';

const provider = createProvider('openai', { apiKey: 'your-key' });

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  console.log(chunk.delta);
}
```

## Available Models

### OpenAI

- `gpt-4o` - Latest GPT-4 Omni
- `gpt-4o-mini` - Smaller GPT-4 Omni
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - Standard GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo
- `o1-preview` - O1 reasoning model
- `o1-mini` - Smaller O1 model

### Anthropic

- `claude-3-5-sonnet-20241022` - Latest Claude 3.5 Sonnet
- `claude-3-5-haiku-20241022` - Latest Claude 3.5 Haiku
- `claude-3-opus-20240229` - Claude 3 Opus
- `claude-3-sonnet-20240229` - Claude 3 Sonnet
- `claude-3-haiku-20240307` - Claude 3 Haiku

### Google Gemini

- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash
- `gemini-1.0-pro` - Gemini 1.0 Pro
- `gemini-pro` - Gemini Pro (legacy)
