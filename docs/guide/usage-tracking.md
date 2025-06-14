# Usage Tracking

Track token consumption and costs across all providers. Because knowing how much you're spending is half the fun of AI development!

## Quick Start

### Basic Usage Tracking

```ts
import { createProvider, userText, collectDeltas } from '@chinmaymk/aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await collectDeltas(
  openai([userText('Hello!')], {
    model: 'gpt-4o',
    streamOptions: { includeUsage: true }, // Enable usage for OpenAI
  })
);

console.log('Content:', result.content);
console.log('Usage:', result.usage);
// Output: Usage: { inputTokens: 8, outputTokens: 6, totalTokens: 14 }
```

## Usage Information

### OpenAI Usage

OpenAI provides the most comprehensive usage tracking:

```ts
const openai = createProvider('openai', { apiKey: '...' });

// Enable usage tracking in stream options
const result = await collectDeltas(
  openai([userText('Explain quantum physics')], {
    model: 'gpt-4o',
    streamOptions: { includeUsage: true }, // Required for usage tracking
  })
);

console.log('Usage:', result.usage);
// { inputTokens: 15, outputTokens: 127, totalTokens: 142 }
```

**Reasoning Models (o-series):**

```ts
const result = await collectDeltas(
  openai([userText('Solve: 2x + 5 = 15')], {
    model: 'o1-mini',
    reasoning: { effort: 'medium' },
  })
);

console.log('Reasoning usage:', result.usage);
// {
//   inputTokens: 12,
//   outputTokens: 25,
//   reasoningTokens: 1847, // Extra cost!
//   totalTokens: 1884
// }
```

### Anthropic Usage

Anthropic currently provides output token counts:

```ts
const anthropic = createProvider('anthropic', { apiKey: '...' });

const result = await collectDeltas(
  anthropic([userText('Write a haiku')], {
    model: 'claude-3-5-sonnet-20241022',
  })
);

console.log('Usage:', result.usage);
// { outputTokens: 23 }
```

### Google Usage

Google provides comprehensive usage metadata when available:

```ts
const google = createProvider('google', { apiKey: '...' });

const result = await collectDeltas(
  google([userText('Explain machine learning')], {
    model: 'gemini-1.5-pro',
  })
);

console.log('Usage:', result.usage);
// { inputTokens: 18, outputTokens: 156, totalTokens: 174 }
```

## Embedding Usage

Track vector operation costs:

```ts
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

const embeddings = createOpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await embeddings(['Hello world'], {
  model: 'text-embedding-3-small',
});

console.log('Embedding usage:', result.usage);
// { inputTokens: 2, totalTokens: 2, truncated: false }
```

## Best Practices

### Enable Usage Tracking

- **OpenAI**: Set `streamOptions.includeUsage: true`
- **Anthropic**: Usage is automatic (output tokens only)
- **Google**: Usage is automatic when available

## Troubleshooting

### No Usage Information

**Problem**: `result.usage` is undefined

**Solutions**:

1. **OpenAI**: Enable `streamOptions: { includeUsage: true }`
2. **Provider Support**: Not all providers report all usage metrics
3. **API Access**: Some usage features require specific API tiers

### Incomplete Usage Data

**Problem**: Only some usage fields are populated

**Explanation**: Different providers report different metrics:

- OpenAI: Full usage data when enabled
- Anthropic: Output tokens only
- Google: Input/output/total when available

### High Reasoning Costs

**Problem**: Unexpected high token usage with reasoning models

**Solutions**:

1. Use lower effort settings: `reasoning: { effort: 'low' }`
2. Monitor reasoning tokens separately
3. Consider non-reasoning models for simple tasks

---

**Pro tip**: Usage tracking is essential for production applications. Different providers count tokens differently, so always test with your specific use case to understand real costs!
