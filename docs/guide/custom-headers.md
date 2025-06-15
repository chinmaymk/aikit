# Custom Headers

Add custom HTTP headers to your AI requests for tracking, authentication, debugging, and more.

## Quick Start

```typescript
import { createProvider, userText, collectDeltas } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: 'your-api-key',
  model: 'gpt-4o',
  mutateHeaders: headers => {
    headers['X-Request-ID'] = `req-${Date.now()}`;
    headers['X-User-Agent'] = 'MyApp/1.0';
  },
});

const result = await collectDeltas(provider([userText('Hello, world!')]));
```

## How It Works

- **Called before every request** - Dynamic headers for each call
- **Non-destructive** - Original headers remain unchanged
- **All providers** - Works with OpenAI, Anthropic, Google, and embeddings

```typescript
let requestCount = 0;

const provider = createProvider('anthropic', {
  apiKey: 'your-api-key',
  model: 'claude-3-5-sonnet-20241022',
  mutateHeaders: headers => {
    requestCount++;
    headers['X-Request-Count'] = requestCount.toString();
    headers['X-Timestamp'] = new Date().toISOString();
  },
});
```

## Embeddings Support

Works with all embedding providers:

```typescript
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

const embeddings = createOpenAIEmbeddings({
  apiKey: 'your-api-key',
  model: 'text-embedding-3-small',
  mutateHeaders: headers => {
    headers['X-Embedding-Request'] = 'true';
    headers['X-Batch-Size'] = 'small';
  },
});
```

## Error Handling

Always handle potential errors to avoid breaking requests:

```typescript
mutateHeaders: headers => {
  try {
    headers['X-User-ID'] = getCurrentUserId();
  } catch (error) {
    console.warn('Failed to get user ID:', error);
    headers['X-User-ID'] = 'unknown';
  }
};
```

## Best Practices

**Keep headers lightweight**

```typescript
// Good
headers['X-Request-ID'] = generateShortId();

// Avoid
headers['X-Large-Data'] = JSON.stringify(largeObject);
```

## Debugging

Log headers during development:

```typescript
mutateHeaders: headers => {
  headers['X-Debug'] = 'true';

  if (process.env.NODE_ENV === 'development') {
    console.log('Headers:', Object.keys(headers));
  }
};
```

## TypeScript

Fully typed for safety:

```typescript
mutateHeaders: (headers: Record<string, string>) => {
  headers['X-Custom'] = 'value';
  // headers['X-Number'] = 123; // Type error
};
```

The `mutateHeaders` feature gives you complete control over request headers while keeping your code clean and maintainable.
