# Examples

Practical examples for AIKit generation.

## Setup

```bash
git clone https://github.com/chinmaymk/aikit.git
cd aikit
npm install
```

Set API keys:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

Run examples:

```bash
npx tsx examples/openai.ts
npx tsx examples/anthropic.ts
npx tsx examples/google.ts
npx tsx examples/tools-example.ts
```

## Common Patterns

### Basic Generation

```typescript
import { createProvider } from 'aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }];

for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

### Configuration Options

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  stopSequences: ['END'],
};

for await (const chunk of provider.generate(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

### System Messages

```typescript
const messages = [
  {
    role: 'system',
    content: [{ type: 'text', text: 'You are a helpful assistant.' }],
  },
  {
    role: 'user',
    content: [{ type: 'text', text: 'Hello!' }],
  },
];
```

### Error Handling

```typescript
try {
  for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
    process.stdout.write(chunk.delta);
  }
} catch (error) {
  console.error('Generation failed:', error);
}
```
