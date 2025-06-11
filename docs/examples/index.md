# Examples

This section contains practical examples showing how to use AIKit with different AI providers.

## Available Examples

The examples in this project demonstrate how to use AIKit with different AI providers. All examples are located in the `examples/` directory of the repository.

## Running Examples

All examples are available in the `examples/` directory of the repository. To run them:

1. Clone the repository:
```bash
git clone https://github.com/chinmaymk/aikit.git
cd aikit
```

2. Install dependencies:
```bash
npm install
```

3. Set up your API keys:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

4. Run any example:
```bash
npx tsx examples/openai.ts
npx tsx examples/anthropic.ts
npx tsx examples/google.ts 
npx tsx examples/tools-example.ts
```

## Common Patterns

### Error Handling

```typescript
import { createAIProvider } from 'aikit';

const provider = createAIProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

try {
  for await (const chunk of provider.generate(messages, { model: 'gpt-4o' })) {
    process.stdout.write(chunk.delta);
  }
} catch (error) {
  console.error('Generation failed:', error);
}
```

### Temperature and Other Parameters

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
  stopSequences: ['END']
};

for await (const chunk of provider.generate(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

### Working with System Messages

```typescript
const messages = [
  {
    role: 'system' as const,
    content: [{ 
      type: 'text' as const, 
      text: 'You are a helpful assistant that speaks like a pirate.' 
    }]
  },
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Hello!' }]
  }
];
``` 