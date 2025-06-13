# AIKit

[![CI](https://github.com/chinmaymk/aikit/actions/workflows/ci.yml/badge.svg)](https://github.com/chinmaymk/aikit/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/chinmaymk/aikit/branch/main/graph/badge.svg)](https://codecov.io/gh/chinmaymk/aikit)

> **AIKit** is a minimal TypeScript wrapper that gives you unified access to the generation APIs of OpenAI, Anthropic, and Google Gemini—complete with streaming, multimodal inputs, and tool calling. No extra runtime packages: just the `fetch` that ships with modern Node and browsers.

---

## Features

Use **AIKit** for: Generation & streaming, multimodal prompts (text + images), tool/function calling, and embeddings.

_Use the official provider SDKs for everything else (fine-tuning, file management, etc.)._

| Feature                 | What That Means                                                        |
| ----------------------- | ---------------------------------------------------------------------- |
| **Zero Dependencies**   | Uses only the built-in `fetch`; no freeloaders.                        |
| **No Surprises**        | Every provider option is right there—no secret sauce.                  |
| **Multimodal**          | Text and images get equal treatment.                                   |
| **Embeddings Included** | Vectors are first-class citizens.                                      |
| **Tool-Friendly**       | Utilities for tool and function calls, ready to go.                    |
| **Unified API**         | Same call shape for OpenAI, Anthropic & Gemini.                        |
| **Type-Safe**           | Exhaustive TypeScript types for requests & responses.                  |
| **Streaming**           | `for await` over tokens or deltas.                                     |
| **Utility Functions**   | Helper functions for messages, tools, and content, and stream handling |

---

## Quick Start

```ts
import { createProvider, userText, printStream } from 'aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Hello!')];

// Simple approach - print directly to console
await printStream(openai.generate(messages, { model: 'gpt-4o' }));

// Or use the classic streaming approach
for await (const chunk of openai.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
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

Hand-rolling works for simple cases, but when you want streaming, multimodal inputs, consistent typings across providers, tool calls, environment-agnostic execution, or when you're simply interested in the generative features of large models, AIKit makes it easy—all in just a few lines.

</details>

![image](https://github.com/user-attachments/assets/f9f94bb6-5911-4ecf-89d7-4a9f19101bf4)

---

## Documentation

📚 **Full docs & API reference:** https://chinmaymk.github.io/aikit/

---

## License

MIT © 2025
