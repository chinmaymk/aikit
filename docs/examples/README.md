# Examples

Welcome to the AIKit snack bar—bite-sized snippets you can copy-paste straight into your codebase. Each one runs with a single `npx tsx` and _zero_ extra dependencies. We won't tell anyone you didn't cook them yourself.

## Running the examples

Before you can run these examples, you'll need to clone the repo and install the dependencies.

```bash
git clone https://github.com/chinmaymk/aikit.git
cd aikit
npm install
```

Clone the repo, install the dev deps (the library itself ships lean), and you're ready to roll.

You'll also need to set your API keys as environment variables. Don't worry, your secrets are safe with us.

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Now you're ready to cook. You can run each example directly from your terminal.

## Basic Generation

These examples show how to generate text with each of the supported providers. It's like "Hello, World!" but with more AI.

- [**OpenAI**](https://github.com/chinmaymk/aikit/blob/main/examples/openai.ts): `npx tsx examples/openai.ts`
- [**Anthropic**](https://github.com/chinmaymk/aikit/blob/main/examples/anthropic.ts): `npx tsx examples/anthropic.ts`
- [**Google Gemini**](https://github.com/chinmaymk/aikit/blob/main/examples/google.ts): `npx tsx examples/google.ts`

## Tool Use

This example shows how to use function calling with AIKit. Because what's the point of an AI that can't do anything?

- [**Tools Example**](https://github.com/chinmaymk/aikit/blob/main/examples/tools-example.ts): `npx tsx examples/tools-example.ts`

## Common Patterns

Here are a few common patterns you might find useful.

### Configuration Options

You can pass a variety of options to the `generate` method to control the output. It's like being a director, but for an AI.

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7, // 0.0 - 2.0, how creative?
  maxTokens: 1000, // max length of the response
  topP: 0.9, // nucleus sampling
  stopSequences: ['END'], // when to stop
};

for await (const chunk of provider.generate(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

### System Messages

You can use system messages to give the AI instructions or a persona. "You are a pirate" is a classic for a reason.

```typescript
const messages = [
  {
    role: 'system',
    content: [{ type: 'text', text: 'You are a helpful assistant that speaks in rhymes.' }],
  },
  {
    role: 'user',
    content: [{ type: 'text', text: 'How much wood would a woodchuck chuck?' }],
  },
];
```

### Error Handling

Sometimes things go wrong. It's not you, it's the AI. Here's how to catch errors gracefully.

```typescript
try {
  for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
    process.stdout.write(chunk.delta);
  }
} catch (error) {
  console.error('Houston, we have a problem:', error);
}
```
