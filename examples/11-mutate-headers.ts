import { createProvider, userText, collectDeltas } from '../src';

/**
 * Example: Using mutateHeaders to modify request headers
 *
 * The mutateHeaders function allows you to modify headers before each request.
 * This is useful for:
 * - Adding custom headers for tracking or authentication
 * - Modifying existing headers based on runtime conditions
 * - Adding request IDs or correlation IDs
 */

async function main() {
  // Example 1: Adding custom headers for tracking
  const providerWithTracking = createProvider('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
    mutateHeaders: headers => {
      // Add custom tracking headers
      headers['X-Request-ID'] = `req-${Date.now()}`;
      headers['X-User-Agent'] = 'AIKit-Example/1.0';
      headers['X-Custom-Tracking'] = 'enabled';

      console.log('Headers before request:', Object.keys(headers));
    },
  });

  console.log('=== Example 1: Custom Tracking Headers ===');
  const result1 = await collectDeltas(
    providerWithTracking([userText('What is the capital of France?')])
  );
  console.log('Response:', result1.content);
  console.log();

  // Example 2: Dynamic authentication headers
  const providerWithDynamicAuth = createProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-haiku-20241022',
    mutateHeaders: headers => {
      // Add dynamic authentication or session headers
      const sessionId = `session-${Math.random().toString(36).substr(2, 9)}`;
      headers['X-Session-ID'] = sessionId;
      headers['X-Timestamp'] = new Date().toISOString();

      // You could also modify existing headers
      if (headers['x-api-key']) {
        console.log('API key is present and will be sent');
      }
    },
  });

  console.log('=== Example 2: Dynamic Authentication Headers ===');
  const result2 = await collectDeltas(
    providerWithDynamicAuth([userText('Explain quantum computing in one sentence.')])
  );
  console.log('Response:', result2.content);
  console.log();

  // Example 3: Conditional header modification
  let requestCount = 0;
  const providerWithConditionalHeaders = createProvider('google', {
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-1.5-flash',
    mutateHeaders: headers => {
      requestCount++;

      // Add different headers based on request count
      if (requestCount === 1) {
        headers['X-Request-Type'] = 'first-request';
      } else {
        headers['X-Request-Type'] = 'subsequent-request';
        headers['X-Request-Count'] = requestCount.toString();
      }

      // Add a correlation ID that persists across requests
      headers['X-Correlation-ID'] = 'example-session-123';
    },
  });

  console.log('=== Example 3: Conditional Header Modification ===');

  // First request
  const result3a = await collectDeltas(
    providerWithConditionalHeaders([userText('What is machine learning?')])
  );
  console.log('First request response:', result3a.content.substring(0, 100) + '...');

  // Second request
  const result3b = await collectDeltas(
    providerWithConditionalHeaders([userText('What is deep learning?')])
  );
  console.log('Second request response:', result3b.content.substring(0, 100) + '...');
  console.log();

  // Example 4: Headers for embeddings
  const { createOpenAIEmbeddings } = await import('../src/providers/openai_embeddings');

  const embeddingProvider = createOpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-3-small',
    mutateHeaders: headers => {
      headers['X-Embedding-Request'] = 'true';
      headers['X-Model-Type'] = 'embedding';
      console.log('Embedding request headers prepared');
    },
  });

  console.log('=== Example 4: Headers for Embeddings ===');
  const embeddings = await embeddingProvider(['Hello world', 'How are you?']);
  console.log(`Generated ${embeddings.embeddings.length} embeddings`);
  console.log(`First embedding dimensions: ${embeddings.embeddings[0].values.length}`);
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
