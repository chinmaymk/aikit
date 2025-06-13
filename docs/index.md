---
layout: home

hero:
  name: 'AIKit'
  text: 'Zero Dependencies. Maximum Flexibility.'
  tagline: Minimal TypeScript wrapper for OpenAI, Anthropic, and Google Gemini. One import for all major LLMs.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/chinmaymk/aikit
---

## Why AIKit?

AIKit is a minimal TypeScript wrapper that gives you unified access to the generation APIs of OpenAI, Anthropic, and Google Gemini—complete with streaming, multimodal inputs, and tool calling. No extra runtime packages: just the `fetch` that ships with modern Node and browsers.

**Use AIKit for:** Generation & streaming, multimodal prompts (text + images), tool/function calling, and embeddings.

_Use the official provider SDKs for everything else (fine-tuning, file management, etc.)._

## Features at a Glance

| Feature                 | What That Means                                                        |
| ----------------------- | ---------------------------------------------------------------------- |
| **Zero Dependencies**   | Uses only the built-in `fetch`; no freeloaders.                        |
| **No Surprises**        | Every provider option is right there—no secret sauce.                  |
| **Multimodal**          | Text and images get equal treatment.                                   |
| **Embeddings Included** | Vectors are first-class citizens.                                      |
| **Tool-Friendly**       | Utilities for tool and function calls, ready to go.                    |
| **Reasoning Support**   | Access model reasoning for Claude and OpenAI o-series models.          |
| **Unified API**         | Same call shape for OpenAI, Anthropic & Gemini.                        |
| **Type-Safe**           | Exhaustive TypeScript types for requests & responses.                  |
| **Streaming**           | `for await` over tokens or deltas.                                     |
| **Utility Functions**   | Helper functions for messages, tools, and content, and stream handling |
| **Model Flexible**      | Use any model string accepted by the provider APIs.                    |

## Quick Start

```ts
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

// Create your AI provider
const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Prepare your message
const messages = [userText('Hello!')];

// Simple approach - print directly to console
await printStream(
  openai.generate(messages, {
    model: 'gpt-4o'
  })
);

// Or use the classic streaming approach
for await (const chunk of openai.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}

> **💡 Helper Functions are Optional**
> AIKit provides helper functions like `userText()`, `systemText()`, and `userImage()` for convenience, but they're completely optional. You can always construct message objects manually or mix approaches as you prefer. The helpers just make common patterns more readable.
```

## Streaming, Natively

Stream tokens as they're generated for real-time UX. AIKit exposes a simple async iterator for streaming, so you can build responsive apps without extra plumbing.

```ts
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: '...',
});

// Start streaming generation
const stream = provider.generate([userText('Tell me a story')], {
  model: 'gpt-4o',
});

// Custom stream processing with progress tracking
await processStream(stream, {
  onDelta: delta => process.stdout.write(delta),
  onChunk: chunk => console.log(`[${chunk.finishReason || 'generating'}]`),
  onFinish: reason => console.log(`\nCompleted: ${reason}`),
});
```

## Multi-Modal, Fully Supported

Send images and text together to models like GPT-4o and Claude 3.5 Sonnet. AIKit's API is designed for completeness—if the model supports it, so do we.

```ts
import { createProvider, userImage } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: '...',
});

// Simple helper for text + image
const message = userImage('What is in this image?', 'data:image/jpeg;base64,...');

// Generate response
const result = await provider.generate([message], {
  model: 'gpt-4o',
});

console.log(result.content);
```

## Tool Use, No Compromises

Define tools (function calling) and let the model invoke them as needed. AIKit exposes all provider options, so you can build advanced, automated workflows with minimal code.

```ts
import { createProvider, createTool, executeToolCall } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: '...',
});

// Define a weather tool
const weatherTool = createTool('get_weather', 'Get the weather for a location', {
  type: 'object',
  properties: {
    location: {
      type: 'string',
      description: 'City name',
    },
    unit: {
      type: 'string',
      enum: ['celsius', 'fahrenheit'],
    },
  },
  required: ['location'],
});

// Generate with tools available
const result = await provider.generate([userText("What's the weather in Tokyo?")], {
  model: 'gpt-4o',
  tools: [weatherTool],
});

// Execute tool calls if any were made
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const toolResult = executeToolCall(toolCall, {
      get_weather: (location, unit) => getWeatherData(location, unit),
    });
    console.log('Tool result:', toolResult);
  }
}
```

## Reasoning Models, Transparently

Access the reasoning process of models that support it, like Claude (Anthropic) and o-series models (OpenAI). See how the model thinks through problems in real-time.

```ts
import { createProvider, userText, collectDeltas, processStream } from '@chinmaymk/aikit';

// Anthropic Claude reasoning
const anthropic = createProvider('anthropic', {
  apiKey: '...',
});

// Generate with reasoning enabled
const result = await collectDeltas(
  anthropic.generate([userText('Solve this math problem step by step: 2x + 5 = 15')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning); // Access the model's thinking process

// Stream reasoning in real-time
await processStream(
  anthropic.generate([userText('Explain quantum entanglement')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
  }),
  {
    onReasoning: reasoning => {
      if (reasoning.delta) {
        console.log('[THINKING]:', reasoning.delta);
      }
    },
    onDelta: delta => process.stdout.write(delta),
  }
);

// OpenAI o-series reasoning
const openai = createProvider('openai', {
  apiKey: '...',
});

const o1Result = await collectDeltas(
  openai.generate([userText('Design a simple algorithm for sorting')], {
    model: 'o1-mini',
    reasoning: {
      effort: 'medium',
    },
  })
);

console.log('Answer:', o1Result.content);
console.log('Reasoning:', o1Result.reasoning);
```

## Provider Flexibility

Switch between providers with a single line change. Same API, different AI behind the scenes.

```ts
import { createProvider } from '@chinmaymk/aikit';

// Pick your AI provider
const openai = createProvider('openai', {
  apiKey: '...',
});

const anthropic = createProvider('anthropic', {
  apiKey: '...',
});

const google = createProvider('google', {
  apiKey: '...',
});

// Same interface for all
const messages = [userText('Explain quantum computing')];
const options = { temperature: 0.7, maxOutputTokens: 200 };

// They all work the same way
const openaiResult = await openai.generate(messages, { ...options, model: 'gpt-4o' });

const anthropicResult = await anthropic.generate(messages, {
  ...options,
  model: 'claude-3-5-sonnet-20241022',
});
```

## Model Support

**AIKit doesn't restrict which models you can use**—pass any model string that the provider API accepts. This includes new models, custom fine-tuned models, or beta releases.

```ts
// Use any model supported by the provider
await openai.generate(messages, { model: 'gpt-4o' });
await openai.generate(messages, { model: 'your-custom-model' });

await anthropic.generate(messages, { model: 'claude-3-5-sonnet-20241022' });
await google.generate(messages, { model: 'gemini-2.0-flash' });
```

_AIKit includes a reference list of available models per provider in the library, but this is purely informational and doesn't limit what you can use._

## What's Next?

Ready to dive deeper? Here's where to go:

- **[Getting Started Guide](/guide/getting-started)** - Your first steps with AIKit
- **[API Reference](/api/generated/README)** - Complete API documentation
- **[Examples](/examples/README)** - Copy-paste ready code snippets
- **[GitHub](https://github.com/chinmaymk/aikit)** - Source code and issues

---

_Built with ❤️ for developers who want AI integration without the complexity tax._
