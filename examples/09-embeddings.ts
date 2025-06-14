import { createOpenAIEmbeddings, createGoogleEmbeddings } from '@chinmaymk/aikit';

async function main() {
  console.log('🚀 AIKit Embeddings Demo\n');

  // Example texts
  const texts = [
    'Machine learning is fascinating',
    'I love programming in TypeScript',
    'The weather is nice today',
    'Artificial intelligence is the future',
  ];

  // OpenAI Embeddings
  if (process.env.OPENAI_API_KEY) {
    console.log('📊 OpenAI Embeddings');
    console.log('='.repeat(30));

    const embeddings = createOpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });

    try {
      // Single text
      const single = await embeddings(['Hello, world!']);
      console.log(`Single text: ${single.embeddings[0].values.length} dimensions`);
      console.log(`Tokens used: ${single.usage?.totalTokens || 0}`);

      // Multiple texts
      const batch = await embeddings(texts);
      console.log(`\nBatch of ${batch.embeddings.length} texts:`);
      batch.embeddings.forEach((emb, i) => {
        console.log(`  ${i + 1}. ${emb.values.length} dimensions`);
      });

      // Cosine similarity example
      const [vec1, vec2] = batch.embeddings.slice(0, 2);
      const similarity = cosineSimilarity(vec1.values, vec2.values);
      console.log(`\nSimilarity between first two texts: ${similarity.toFixed(4)}`);
    } catch (error) {
      console.error('OpenAI error:', error instanceof Error ? error.message : String(error));
    }
    console.log('');
  }

  // Google Embeddings
  if (process.env.GOOGLE_API_KEY) {
    console.log('🌟 Google Embeddings');
    console.log('='.repeat(30));

    const embeddings = createGoogleEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: 'text-embedding-004',
      taskType: 'SEMANTIC_SIMILARITY',
    });

    try {
      // Single text
      const single = await embeddings(['Hello, world!']);
      console.log(`Single text: ${single.embeddings[0].values.length} dimensions`);
      console.log(`Tokens used: ${single.usage?.totalTokens || 0}`);

      // Task-specific embeddings
      const docResult = await embeddings(['Important document content'], {
        taskType: 'RETRIEVAL_DOCUMENT',
        title: 'Sample Document',
      });
      console.log(`Document embedding: ${docResult.embeddings[0].values.length} dimensions`);
    } catch (error) {
      console.error('Google error:', error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n✅ Demo completed!');
}

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

if (require.main === module) {
  if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
    // Set API keys to run this demo
    process.exit(1);
  }
  main().catch(console.error);
}
