---
title: Embeddings
description: How to turn text into numbers that understand meaning, perfect for semantic search and recommendations.
---

# Embeddings

What if you could turn text into a set of coordinates on a giant "map of meaning"? That's exactly what embeddings do. They translate words, sentences, or entire documents into mathematical vectors—a series of numbers that represent the text's conceptual essence.

On this map, "dog" is right next to "puppy," "king" is close to "queen," and "AIKit is awesome" is... well, you get the picture.

This is the magic behind semantic search, recommendations, and finding related content. AIKit gives you a simple, unified way to create these vectors with leading providers.

## How It Works

You give AIKit some text, and it gives you back a vector (or a list of them). Simple as that.

Let's turn a few phrases into numbers.

```typescript
import { createOpenAIEmbeddings } from '@chinmaymk/aikit';

// 1. Create an embeddings provider
const embed = createOpenAIEmbeddings({
  model: 'text-embedding-3-small',
});

// 2. Give it some text
const texts = [
  'The cat sat on the mat.',
  'My dog loves to chase squirrels.',
  'The weather is sunny today.',
];

const { embeddings, usage } = await embed(texts);

// 3. Get back the vectors
embeddings.forEach((e, i) => {
  console.log(`Text: "${texts[e.index]}"`);
  console.log(`Vector (first 3 dims): [${e.values.slice(0, 3).join(', ')}...]`);
  console.log(`Vector dimensions: ${e.values.length}`);
  console.log('---');
});

console.log(`Total tokens used: ${usage.totalTokens}`);
/*
  Text: "The cat sat on the mat."
  Vector (first 3 dims): [0.01, -0.02, 0.03...]
  Vector dimensions: 1536
  ---
  Text: "My dog loves to chase squirrels."
  Vector (first 3 dims): [0.02, -0.01, 0.04...]
  Vector dimensions: 1536
  ---
  Text: "The weather is sunny today."
  Vector (first 3 dims): [-0.03, 0.05, -0.01...]
  Vector dimensions: 1536
  ---
  Total tokens used: 21
*/
```

## A Real-World Example: Semantic Search

This is where embeddings truly shine. Let's build a simple search engine that understands meaning, not just keywords.

```typescript
// A tiny helper for comparing vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// 1. Our "database" of documents
const documents = [
  'The new AI models are powerful.',
  'TypeScript makes JavaScript better.',
  'How to brew the perfect cup of coffee.',
  'Getting started with neural networks.',
];

// 2. Create embeddings for all documents
const docEmbeddings = (await embed(documents)).embeddings;

// 3. The user's search query
const query = 'I want to learn about artificial intelligence';
const queryEmbedding = (await embed([query])).embeddings[0].values;

// 4. Find the most similar document
const results = documents
  .map((doc, i) => ({
    text: doc,
    score: cosineSimilarity(queryEmbedding, docEmbeddings[i].values),
  }))
  .sort((a, b) => b.score - a.score);

console.log('Search Results:');
console.log(results);
/*
  Search Results:
  [
    { text: 'Getting started with neural networks.', score: 0.85 },
    { text: 'The new AI models are powerful.', score: 0.82 },
    { text: 'TypeScript makes JavaScript better.', score: 0.34 },
    { text: 'How to brew the perfect cup of coffee.', score: 0.11 }
  ]
*/
```

Notice how the query "artificial intelligence" correctly matched "neural networks" and "AI models," even though the exact words were different. That's the power of semantic understanding.

## Provider Differences

- **OpenAI**: The workhorse. Fast, reliable, and offers different model sizes. The `createOpenAIEmbeddings` helper is your friend.
- **Google**: Also a strong contender. Their models often ask for a `taskType` (e.g., `'SEMANTIC_SIMILARITY'`, `'RETRIEVAL_DOCUMENT'`) to optimize the vectors. Use `createGoogleEmbeddings` to set this.
- **Anthropic**: Doesn't currently offer embedding models.

## The Golden Rules of Embeddings

- **Batch Your Texts**: Sending multiple texts in one request is much more efficient than sending them one by one.
- **Cache Everything**: An embedding for a given text and model will not change. Store them in a database or file to avoid re-calculating and save money.
- **Choose Your Dimensions**: Some models (like OpenAI's) let you specify the number of `dimensions` for your vector. Smaller vectors are faster and cheaper to store, but may be less accurate. Test what works for your use case.
- **Pre-process for Clarity**: Clean up your text before embedding it. Removing irrelevant characters or HTML tags can lead to better, more focused vectors.

Now go turn some words into wisdom! 🚀
