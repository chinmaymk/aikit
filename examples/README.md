# AIKit Examples

This directory contains comprehensive examples demonstrating how to use the AIKit library. The examples are organized progressively, from basic usage to advanced features.

## Setup

Before running any examples, you need to set up API keys for the providers you want to use:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

You only need to set the API keys for the providers you plan to use.

## Examples

- [`01-getting-started.ts`](./01-getting-started.ts) - Basic usage patterns
- [`02-streaming.ts`](./02-streaming.ts) - Streaming responses
- [`03-multimodal.ts`](./03-multimodal.ts) - Working with images
- [`04-tools-basic.ts`](./04-tools-basic.ts) - Function calling
- [`05-conversations.ts`](./05-conversations.ts) - Multi-turn conversations
- [`06-configuration-patterns.ts`](./06-configuration-patterns.ts) - Advanced configuration patterns

## Running Examples

You can run any example directly with TypeScript:

```bash
npx tsx examples/01-getting-started.ts
npx tsx examples/06-configuration-patterns.ts
```
