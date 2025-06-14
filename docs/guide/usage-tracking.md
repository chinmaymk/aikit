# Usage Tracking

Track token consumption, costs, and response timing across all providers. Because knowing how much you're spending and how fast responses arrive is half the fun of AI development!

## Quick Start

### Basic Usage Tracking

```ts
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await collectStream(
  openai([userText('Hello!')], {
    model: 'gpt-4o',
    includeUsage: true, // Enable usage for OpenAI
  })
);

console.log('Content:', result.content);
console.log('Usage:', result.usage);
// Output: Usage: { inputTokens: 8, outputTokens: 6, totalTokens: 14, timeToFirstToken: 342 }
```

## Usage Information

### OpenAI Usage

OpenAI provides the most comprehensive usage tracking:

```ts
const openai = createProvider('openai', { apiKey: '...' });

// Enable usage tracking in stream options
const result = await collectStream(
  openai([userText('Explain quantum physics')], {
    model: 'gpt-4o',
    includeUsage: true, // Required for usage tracking
  })
);

console.log('Usage:', result.usage);
// { inputTokens: 15, outputTokens: 127, totalTokens: 142, timeToFirstToken: 287 }
```

**Reasoning Models (o-series):**

```ts
const result = await collectStream(
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
//   totalTokens: 1884,
//   timeToFirstToken: 1234 // Reasoning takes longer
// }
```

### Anthropic Usage

Anthropic provides output tokens and timing information:

```ts
const anthropic = createProvider('anthropic', { apiKey: '...' });

const result = await collectStream(
  anthropic([userText('Write a haiku')], {
    model: 'claude-3-5-sonnet-20241022',
  })
);

console.log('Usage:', result.usage);
// { outputTokens: 23, timeToFirstToken: 456 }
```

### Google Usage

Google provides comprehensive usage metadata and timing when available:

```ts
const google = createProvider('google', { apiKey: '...' });

const result = await collectStream(
  google([userText('Explain machine learning')], {
    model: 'gemini-1.5-pro',
  })
);

console.log('Usage:', result.usage);
// { inputTokens: 18, outputTokens: 156, totalTokens: 174, timeToFirstToken: 623 }
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

- **OpenAI**: Set `includeUsage: true`
- **Anthropic**: Usage is automatic (output tokens only)
- **Google**: Usage is automatic when available

## Troubleshooting

### No Usage Information

**Problem**: `result.usage` is undefined

**Solutions**:

1. **OpenAI**: Enable `includeUsage: true`
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

## Timing Metrics

### Time to First Token

`timeToFirstToken` measures the latency from request start until the first content token arrives (in milliseconds):

```ts
const result = await collectStream(provider([userText('Quick response needed!')], options));

if (result.usage?.timeToFirstToken) {
  console.log(`First token arrived in ${result.usage.timeToFirstToken}ms`);

  // Typical ranges:
  // - Fast models: 100-500ms
  // - Complex models: 500-2000ms
  // - Reasoning models: 1000-5000ms
}
```

**Use cases for timing data:**

- Performance monitoring and alerting
- Model comparison for latency-sensitive applications
- User experience optimization
- SLA compliance tracking
