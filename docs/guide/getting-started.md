# Getting Started

So you want to pilot some LLMs? Good call. AIKit gets you from zero to **"Hello, LLM"** in one import. One interface for OpenAI, Anthropic, and Gemini. Zero runtime dependencies, fully typed, and small enough to tweet about.

## Installation

First things first, let's get this thing installed. Open your terminal and chant the sacred words:

::: code-group

```bash [npm]
npm install aikit
```

```bash [yarn]
yarn add aikit
```

```bash [pnpm]
pnpm add aikit
```

:::

## API keys

AIKit is great, but it's not magic. You still need API keys from the providers you want to use.

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Don't have them yet? No problem. Here are the secret passages:

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com/dashboard](https://console.anthropic.com/dashboard)
- **Google**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

## Basic generation

Alright, let's make the magic happen. Here's how to get a simple response from a model.

```typescript
import { createAIProvider } from 'aikit';

// Pick your player
const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello, world!' }] }];

// Get a single response
const { value } = await provider.generate(messages, { model: 'gpt-4o' }).next();
console.log(value?.content);
```

## Streaming

Who has time to wait for a full response? Let's stream it like it's hot.

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [
  { role: 'user', content: [{ type: 'text', text: 'Tell me a very short story.' }] },
];

// Stream the response as it comes in
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## Unit testing

Need to fake an LLM call in CI? Providers in AIKit are plain async generators, so you can stub them with just a function:

```typescript
const mockProvider = {
  async *generate() {
    yield { delta: 'Hello test!' };
  },
};
```

Swap it in wherever you expect a real provider and carry on—no special helpers required.

## Next Steps

You've learned the basics, but there's more to explore.

- Dive into the [API Reference](/api/generated/README) for all the nitty-gritty details.
- Check out the [Examples](/examples/README) for more copy-paste-able code.
