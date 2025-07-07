---
title: Getting Started with AIKit
description: Your first "Hello, World" with AIKit, the universal remote for large language models.
---

# Getting Started with AIKit

Welcome to AIKit, the universal remote for large language models. Tired of juggling different SDKs for OpenAI, Anthropic, and Google? AIKit gives you one simple, consistent interface to talk to all of them.

Let's get you from zero to "Hello, AI" in about 90 seconds.

## 1. Installation

First, pop open your terminal and add AIKit to your project.

```bash
npm install @chinmaymk/aikit
```

## 2. Set Your API Key

AIKit needs a key to unlock the magic. Grab one from your provider of choice and set it as an environment variable.

```bash
export OPENAI_API_KEY="your-secret-key-here"
```

> **Where to get keys?**
>
> - **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - **Anthropic**: [console.anthropic.com/dashboard](https://console.anthropic.com/dashboard)
> - **Google**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## 3. Your First AI Conversation

This is the moment you've been waiting for. Here’s how to have a basic conversation with an AI model.

### Get a Complete Response

If you just want the final, complete text from the model, you can `await` the provider call directly.

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

// 1. Create a provider and configure it with your API key
const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// 2. Craft your message
const messages = [userText('Why is the sky blue? Explain it like I am five.')];

// 3. Get the response stream and collect the final text
const stream = openai(messages, { model: 'gpt-4o' });
const { content } = await collectStream(stream);

console.log(content);
```

> **Note:**
> Helper functions like `collectStream`, `printStream`, and `userText` are provided for convenience, but they are entirely optional. You can always construct message objects manually and iterate over the stream with a `for await...of` loop if you want full control over how requests and responses are handled.

### Stream the Response

For a real-time, character-by-character effect, you can iterate over the stream or use a helper like `printStream`.

```typescript
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Write a 50-word story about a robot who discovers coffee.')];

// Get a Node.js stream of events and print it to the console
await printStream(openai(messages, { model: 'gpt-4o' }));
```

## What Now? You're Ready.

That's it. You've mastered the basics. You know how to install AIKit, connect to a provider, and get responses.

The beauty of AIKit is its consistency. The code you just wrote for OpenAI works the same way for Anthropic and Google. Just change `'openai'` to `'anthropic'` or `'google'`, and you're off to the races.

When you're ready to level up, here's where to go next:

- **[Function Calling with Tools](./tools.md)**: Give your AI superpowers to interact with the world.
- **[Multimodal AI](./multimodal.md)**: Teach your AI to see images and hear audio.
- **[Streaming](./streaming.md)**: Get a deeper look into handling real-time responses.
- **[Framework Integration](./framework-integration.md)**: Learn how to use AIKit securely in a web app.

Happy building! 🚀
