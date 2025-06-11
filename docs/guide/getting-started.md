# Getting Started

So, you've decided to wrangle some AI models. Excellent choice. AIKit is here to make your life easier. Think of it as a universal translator for OpenAI, Anthropic, and Google Gemini. You speak once, they all understand. Mostly.

## 1. Installation

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

## 2. API Keys

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

## 3. Basic Generation

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

## 4. Streaming

Who has time to wait for a full response? Let's stream it like it's hot.

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Tell me a very short story.' }] }];

// Stream the response as it comes in
for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## Next Steps

You've learned the basics, but there's more to explore.

- Dive into the [API Reference](/api/generated/README) for all the nitty-gritty details.
- Check out the [Examples](/examples/README) for more copy-paste-able code.
