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
    - theme: alt
      text: View on npm
      link: https://www.npmjs.com/package/@chinmaymk/aikit
---

AIKit is a minimal TypeScript wrapper that gives you unified access to the generation APIs of OpenAI, Anthropic, and Google Gemini—complete with streaming, multimodal inputs (text, images, and audio), and tool calling. No extra runtime packages: just the `fetch` that ships with modern Node and browsers.

**Use AIKit for:** Generation & streaming, multimodal prompts (text + images + audio), tool/function calling, and embeddings.

_Use the official provider SDKs for everything else (fine-tuning, file management, etc.)._

## Features at a Glance

| Feature                 | What That Means                                            |
| ----------------------- | ---------------------------------------------------------- |
| **Zero Dependencies**   | Uses only the built-in `fetch`—no freeloaders.             |
| **No Surprises**        | Every provider option is right there—no secret sauce.      |
| **Multimodal**          | Text, images, and audio get equal treatment.               |
| **Embeddings Included** | Vectors are first-class citizens.                          |
| **Tool-Friendly**       | Utilities for tool and function calls, ready to go.        |
| **Reasoning Support**   | Access model reasoning—watch AI think out loud.            |
| **Unified API**         | Same call shape for OpenAI, Anthropic & Gemini.            |
| **Type-Safe**           | Exhaustive TypeScript types for requests & responses.      |
| **Streaming**           | `for await` over tokens or deltas.                         |
| **Utility Functions**   | Helper functions for messages, tools, and stream handling. |
| **Model Flexible**      | Use any model string the provider APIs accept.             |

## Quick Start

```bash
npm install @chinmaymk/aikit
```

AIKit gives you two ways to work with providers. Pick what feels right:

```typescript
import { createProvider, openai, userText } from '@chinmaymk/aikit';

// Factory pattern - configure once, use many times
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});

const result1 = await provider([userText('Hello!')]);
const result2 = await provider([userText('Tell me a joke')], { temperature: 0.9 });

// Direct functions - configure each time
const result3 = await openai([userText('Hello!')], {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});
```

> **💡 Helper Functions are Optional**  
> Functions like `userText()`, `systemText()`, and `createProvider()` are convenience helpers. You can always construct message objects and providers manually if you prefer. For example:
>
> ```typescript
> // Using helpers (recommended)
> const messages = [userText('Hello!')];
>
> // Manual construction (also valid)
> const messages = [
>   {
>     role: 'user',
>     content: [{ type: 'text', text: 'Hello!' }],
>   },
> ];
> ```

## Streaming, Natively

Stream tokens as they're generated for real-time UX. AIKit exposes a simple async iterator for streaming, so you can build responsive apps without extra plumbing.

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Start streaming generation
const stream = provider([userText('Tell me a story')], {
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

Send images, audio, and text together to models like GPT-4o and Claude 3.5 Sonnet. AIKit's API is designed for completeness—if the model supports it, so do we.

```typescript
import { createProvider, userImage, userAudio } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple helper for text + image
const imageMessage = userImage('What is in this image?', 'data:image/jpeg;base64,...');
const imageResult = await provider([imageMessage], { model: 'gpt-4o' });

// Simple helper for text + audio
const audioMessage = userAudio('Transcribe this audio', 'data:audio/wav;base64,...', 'wav');
const audioResult = await provider([audioMessage], { model: 'gpt-4o-audio-preview' });

console.log('Image analysis:', imageResult.content);
console.log('Audio transcription:', audioResult.content);
```

## Tool Use, No Compromises

Define tools (function calling) and let the model invoke them as needed. AIKit exposes all provider options, so you can build advanced, automated workflows with minimal code.

```typescript
import { createProvider, createTool, executeToolCall, userText } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
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
const result = await provider([userText("What's the weather in Tokyo?")], {
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

```typescript
import { createProvider, userText, collectStream, processStream } from '@chinmaymk/aikit';

// Anthropic Claude reasoning
const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Generate with reasoning enabled
const result = await collectStream(
  anthropic([userText('Solve this math problem step by step: 2x + 5 = 15')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning); // Watch the AI think

// Stream reasoning in real-time
await processStream(
  anthropic([userText('Explain quantum entanglement')], {
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
  apiKey: process.env.OPENAI_API_KEY!,
});

const o1Result = await collectStream(
  openai([userText('Design a simple algorithm for sorting')], {
    model: 'o1-mini',
    reasoning: {
      effort: 'medium',
    },
  })
);

console.log('Answer:', o1Result.content);
console.log('Reasoning:', o1Result.reasoning);
```

## Switching Providers

Want to compare different AI models? AIKit makes it trivial to switch between OpenAI, Anthropic, and Google.

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

const messages = [userText('Explain quantum computing')];
const options = { temperature: 0.7, maxOutputTokens: 200 };

// Try OpenAI first
const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});
const openaiResult = await openai(messages, {
  ...options,
  model: 'gpt-4o',
});

// Try Anthropic with the same messages
const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
const anthropicResult = await anthropic(messages, {
  ...options,
  model: 'claude-3-5-sonnet-20241022',
});

// Try Google with the same messages
const google = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
});
const googleResult = await google(messages, {
  ...options,
  model: 'gemini-2.0-flash',
});

// Now compare their answers!
console.log('OpenAI:', openaiResult.content);
console.log('Anthropic:', anthropicResult.content);
console.log('Google:', googleResult.content);
```

## Choosing the Right Model

Each provider has different models optimized for different tasks. Pick the one that fits your needs:

```typescript
// OpenAI
await openai(messages, { model: 'gpt-4o-mini' });
await openai(messages, { model: 'gpt-4o' });
await openai(messages, { model: 'gpt-4.1' });
await openai(messages, { model: 'o1' });
await openai(messages, { model: 'o3-mini' });

// Anthropic
await anthropic(messages, { model: 'claude-3-5-haiku-20241022' });
await anthropic(messages, { model: 'claude-3-5-sonnet-20241022' });
await anthropic(messages, { model: 'claude-opus-4-20250514' });
await anthropic(messages, { model: 'claude-3-7-sonnet-20250219' });

// Google
await google(messages, { model: 'gemini-1.5-flash' });
await google(messages, { model: 'gemini-2.0-flash' });
await google(messages, { model: 'gemini-2.5-pro-preview-06-05' });
```

**Use any model the provider supports:**

- New models as soon as they're released
- Your custom fine-tuned models
- Beta or experimental models

```typescript
// These all work if the provider supports them
await openai(messages, { model: 'your-custom-model' });
await anthropic(messages, { model: 'claude-4-when-it-exists' });
await google(messages, { model: 'your-tuned-gemini' });
```

## What's Next?

Ready to dive deeper? Here's where to go:

- **[Getting Started Guide](/guide/getting-started)** - Your first steps with AIKit
- **[API Reference](/api/generated/README)** - Complete API documentation
- **[Examples](https://github.com/chinmaymk/aikit/tree/main/examples)** - Copy-paste ready code snippets
- **[GitHub](https://github.com/chinmaymk/aikit)** - Source code and issues

---

Built with ❤️ for developers who want AI integration without the complexity tax.
