# Embeddings

Turn your text into numbers. Math-savvy vectors that know which words are friends. Perfect for semantic search, clustering, and making your text data actually useful.

## Quick Start

```typescript
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

const embeddings = createOpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Single text → vector
const result = await embeddings(['Hello, world!']);
console.log(result.embeddings[0].values); // [0.123, -0.456, 0.789, ...]

// Multiple texts → multiple vectors
const results = await embeddings([
  'I love TypeScript',
  'Python is cool too',
  'The weather is nice',
]);
```

## Supported Providers

- **OpenAI**: The embedding champions. Fast, reliable, and they actually have embedding models.
- **Google**: Also does embeddings. Different flavors for different tasks.
- **Anthropic**: Nope. They're focused on chat, not vectors. Can't blame them.

## Provider Creation

### OpenAI (The Obvious Choice)

```typescript
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

const embeddings = createOpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small', // The sweet spot
  dimensions: 1536, // Shrink if you need to
});
```

**Models that won't disappoint:**

- `text-embedding-3-small`: 1536 dimensions, easy on the wallet
- `text-embedding-3-large`: 3072 dimensions, maximum performance
- `text-embedding-ada-002`: The old reliable

### Google (Task-Specific)

```typescript
import { createGoogleEmbeddings } from '@chinmaymk/aikit';

const embeddings = createGoogleEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'text-embedding-004',
  taskType: 'SEMANTIC_SIMILARITY', // Tell Google what you're up to
});
```

**Models:**

- `text-embedding-004`: The latest and greatest
- `textembedding-gecko@003`: Still pretty good
- `embedding-001`: The Gemini one

**Task Types** (Google loves specificity):

- `RETRIEVAL_QUERY`: For search queries
- `RETRIEVAL_DOCUMENT`: For things you want to find
- `SEMANTIC_SIMILARITY`: For "how similar are these?"
- `CLASSIFICATION`: For sorting things into buckets
- `CLUSTERING`: For "what goes together?"

## Basic Usage

### Single Text

```typescript
const result = await embeddings(['The quick brown fox']);
console.log(result.embeddings[0].values.length); // However many dimensions
console.log(result.usage?.totalTokens); // How much it cost you
```

### Batch Processing

```typescript
const texts = ['Machine learning is cool', 'I prefer TypeScript', 'Coffee makes everything better'];

const results = await embeddings(texts);
// OpenAI: Up to 2048 texts in one go
// Google: One at a time, but AIKit handles it
```

## Semantic Search Example

```typescript
// Your document collection
const docs = [
  'Machine learning fundamentals',
  'TypeScript best practices',
  'Coffee brewing techniques',
  'Neural network architectures',
];

// Get embeddings for all docs
const docEmbeddings = await embeddings(docs);

// Search query
const query = 'AI and neural networks';
const queryEmbedding = await embeddings([query]);

// Find similar docs using cosine similarity
function similarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

const matches = docEmbeddings.embeddings
  .map((doc, i) => ({
    text: docs[i],
    score: similarity(queryEmbedding.embeddings[0].values, doc.values),
  }))
  .sort((a, b) => b.score - a.score);

console.log('Best match:', matches[0]); // Probably about neural networks
```

## Provider-Specific Options

### OpenAI Extras

```typescript
const result = await embeddings(['Hello'], {
  dimensions: 512, // Smaller vectors
  encodingFormat: 'float', // or 'base64' if you're feeling fancy
  user: 'user-123', // For tracking
});
```

## Universal Factory

Because consistency is nice:

```typescript
import { createProvider } from '@chinmaymk/aikit';

const openai = createProvider('openai_embeddings', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const google = createProvider('google_embeddings', {
  apiKey: process.env.GOOGLE_API_KEY!,
});

// Use them like any other embedding function
const openaiResult = await openai(['Hello, world!']);
const googleResult = await google(['Hello, world!']);
```

## Response Format

All providers return the same structure (because we're nice like that):

```typescript
interface EmbeddingResponse {
  embeddings: Array<{
    values: number[]; // The actual vector
    index?: number; // Position in batch
  }>;
  usage?: {
    totalTokens?: number; // What it cost you
  };
}
```

## Common Use Cases

**Semantic Search**: Find documents similar to a query
**Text Classification**: "Is this about tech or cooking?"
**Clustering**: "Which of these texts belong together?"
**Recommendations**: "People who liked this also liked..."
**Duplicate Detection**: "Have I seen this before?"

## Best Practices

1. **Batch when possible**: More texts per request = better performance
2. **Cache embeddings**: Vectors don't change, so save them
3. **Choose dimensions wisely**: Bigger isn't always better
4. **Preprocess text**: Clean up before embedding
5. **Pick the right model**: Small for speed, large for accuracy
