# API Reference

AIKit provides a simple and unified interface for working with multiple AI providers. The API consists of factory functions to create providers and a common interface that all providers implement.

## Overview

- **[Factory Functions](./factory.md)** - Functions to create provider instances

## Quick Reference

### Factory Functions

```typescript
import { createProvider, createOpenAI, createAnthropic, createGoogle } from 'aikit';

// Generic factory (recommended)
const provider = createProvider('openai', { apiKey: 'your-key' });

// Specific factories
const openai = createOpenAI({ apiKey: 'your-key' });
const anthropic = createAnthropic({ apiKey: 'your-key' });
const google = createGoogle({ apiKey: 'your-key' });
```

### Core Interface

All providers implement the `AIProvider` interface:

```typescript
interface AIProvider {
  readonly models: string[];
  generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk>;
}
```

### Basic Usage

```typescript
const messages = [
  {
    role: 'user',
    content: [{ type: 'text', text: 'Hello!' }],
  },
];

// Streaming generation
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  console.log(chunk.delta);
}
```

## Provider-Specific Models

### OpenAI Models

- `gpt-4o` - Latest GPT-4 Omni model
- `gpt-4o-mini` - Smaller, faster GPT-4 Omni
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - Standard GPT-4
- `gpt-3.5-turbo` - GPT-3.5 Turbo
- `o1-preview` - O1 reasoning model (preview)
- `o1-mini` - Smaller O1 model

### Anthropic Models

- `claude-3-5-sonnet-20241022` - Latest Claude 3.5 Sonnet
- `claude-3-5-haiku-20241022` - Latest Claude 3.5 Haiku
- `claude-3-opus-20240229` - Claude 3 Opus
- `claude-3-sonnet-20240229` - Claude 3 Sonnet
- `claude-3-haiku-20240307` - Claude 3 Haiku

### Google Gemini Models

- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash
- `gemini-1.0-pro` - Gemini 1.0 Pro
- `gemini-pro` - Gemini Pro (legacy)
