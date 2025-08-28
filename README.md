<div align="center">
  <img src="logo.svg" alt="AIKit Logo" width="320"/>
</div>

[![CI](https://github.com/chinmaymk/aikit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/chinmaymk/aikit/actions/workflows/ci.yml)
![NPM Version](https://img.shields.io/npm/v/%40chinmaymk%2Faikit)

> **AIKit** is a minimal TypeScript wrapper that gives you unified access to the generation APIs of OpenAI, Anthropic, and Google Gemini—complete with streaming, multimodal inputs, and tool calling. No extra runtime packages: just the `fetch` that ships with modern Node and browsers.

---

## Features

Use **AIKit** for: Generation & streaming, multimodal prompts (text + images + audio), tool/function calling, embeddings, and usage tracking.

_Use the official provider SDKs for everything else (fine-tuning, file management, etc.)._

| Feature                 | What That Means                                                        |
| ----------------------- | ---------------------------------------------------------------------- |
| **Zero Dependencies**   | Uses only the built-in `fetch`; no freeloaders.                        |
| **No Surprises**        | Every provider option is right there—no secret sauce.                  |
| **Multimodal**          | Text, images, and audio get equal treatment.                           |
| **Embeddings Included** | Vectors are first-class citizens.                                      |
| **Tool-Friendly**       | Utilities for tool and function calls, ready to go.                    |
| **Reasoning Support**   | Access model reasoning for Claude and OpenAI o-series models.          |
| **Usage Tracking**      | Monitor token consumption, costs, and timing across all providers.     |
| **Unified API**         | Same call shape for OpenAI, Anthropic & Gemini.                        |
| **Type-Safe**           | Exhaustive TypeScript types for requests & responses.                  |
| **Streaming**           | `for await` over tokens or deltas.                                     |
| **Utility Functions**   | Helper functions for messages, tools, and content, and stream handling |

---

## Installation

```bash
npm install @chinmaymk/aikit
```

## Quick Start

### Text Generation

```ts
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Hello!')];

// Simple approach - print directly to console
await printStream(openai(messages, { model: 'gpt-4o' }));

// Or use the classic streaming approach
for await (const chunk of openai(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

### Embeddings

```ts
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

const embeddings = createOpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Turn text into vectors
const result = await embeddings(['Hello, world!', 'How are you?']);
console.log(result.embeddings[0].values); // [0.123, -0.456, ...]
```

---

## FAQ

<details>
<summary><strong>How does this work?</strong></summary>

AIKit directly calls apis of underlying llm providers, and maps responses to a unified result stream and consistent types.

</details>

<details>
<summary><strong>How does this differ from the official SDKs?</strong></summary>

AIKit focuses only on **generation** features across providers. That narrow focus lets us ship a smaller,
unified API surface. If you need file uploads, fine-tuning, vector stores, etc., use the vendor SDK.

</details>

<details>
<summary><strong>Will the API change under my feet?</strong></summary>

Vendor generation endpoints rarely break. When they occasionally do, we publish a new **major** AIKit version right away so you can upgrade with minimal fuss. We follow semantic versioning and document any change in the changelog.

</details>

<details>
<summary><strong>What are the best use cases for AIKit?</strong></summary>

When you want streaming, multimodal inputs, consistent typings across providers, tool calls, environment-agnostic execution, or when you're simply interested in the generative features of large models, AIKit makes it easy—all in just a few lines.

</details>

---

## Documentation

📚 **Full docs & API reference:** https://chinmaymk.github.io/aikit/

---

## License

MIT © 2025
