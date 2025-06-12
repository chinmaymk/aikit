---
layout: home

hero:
  name: 'AIKit'
  text: 'Minimal, Complete AI Library. Zero Dependencies.'
  tagline: Minimal surface area. Maximum flexibility. One import for all major LLMs.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/chinmaymk/aikit
---

## Minimal, Unified API

AIKit is a TypeScript library that provides a minimal, complete interface for OpenAI, Anthropic, and Google Gemini. No bloat, no wrappers—just the full set of options you expect, with a single, consistent API. Switch providers with a single line change and keep your codebase clean.

```ts
import { createProvider } from 'aikit';

// Swap providers instantly
const provider = createProvider('openai', { apiKey: '...' });
// const provider = createProvider('anthropic', { apiKey: '...' });

const { content } = await provider.generate(...);
```

## Streaming, Natively

Stream tokens as they're generated for real-time UX. AIKit exposes a simple async iterator for streaming, so you can build responsive apps without extra plumbing.

```ts
const stream = await provider.generate(...);
for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
}
```

## Multi-Modal, Fully Supported

Send images and text together to models like GPT-4o and Claude 3.5 Sonnet. AIKit's API is designed for completeness—if the model supports it, so do we.

```ts
const messages = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      { type: 'image', image: 'data:image/jpeg;base64,...' },
    ],
  },
];

const { content } = await provider.generate({ messages });
```

## Tool Use, No Compromises

Define tools (function calling) and let the model invoke them as needed. AIKit exposes all provider options, so you can build advanced, automated workflows with minimal code.

```ts
const tools = [{
  name: 'get_weather',
  description: 'Get the weather for a location',
  parameters: { ... }
}];

const { finishReason, toolCalls } = await provider.generate({ tools });
if (finishReason === 'tool_use') {
  // ... execute toolCalls and return results
}
```
