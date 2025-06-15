# Streaming Responses

Real-time AI responses make your app feel alive. Streaming provides immediate feedback to users instead of making them wait for complete responses—it's the difference between watching paint dry and watching a movie. Both take time, but one keeps you engaged.

AIKit gives you multiple ways to handle streaming, from simple console output to advanced progress tracking. Let's explore them all.

## Basic Streaming

The simplest way to stream is with `printStream()`. It handles everything and outputs directly to the console.

```typescript
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Prepare message
const messages = [userText('Tell me a short story about a robot learning to paint.')];

console.log('Streaming story:');

// Stream with configuration
const result = await printStream(
  provider(messages, {
    model: 'gpt-4o',
    maxOutputTokens: 200,
    temperature: 0.8,
  })
);

console.log(`\nCompleted: ${result.finishReason}`);
```

> **💡 Helper Functions are Optional**
> Functions like `printStream()` and `processStream()` are convenience helpers for common streaming patterns. You can always handle streams manually:

```typescript
// Using helper (recommended)
await printStream(stream);

// Manual handling (also valid)
for await (const chunk of stream) {
  process.stdout.write(chunk.delta);
  if (chunk.finishReason) {
    console.log(`\nFinished: ${chunk.finishReason}`);
  }
}
```

## Manual Stream Handling

For more control, handle the stream manually. Perfect for custom UIs or specific output formatting.

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const messages = [userText('Explain photosynthesis step by step.')];

console.log('Manual streaming:');
for await (const chunk of provider(messages, { model: 'gpt-4o', maxOutputTokens: 300 })) {
  // chunk.delta contains the new text
  process.stdout.write(chunk.delta);

  // chunk.finishReason tells you when it's done
  if (chunk.finishReason) {
    console.log(`\nFinished: ${chunk.finishReason}`);
    break;
  }
}
```

## Advanced Stream Processing

Use `processStream()` for custom handlers and progress tracking. It's like having a personal assistant for your streams.

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const messages = [userText('List 5 programming best practices with explanations.')];

let wordCount = 0;
let chunkCount = 0;

const result = await processStream(provider(messages, { model: 'gpt-4o', maxOutputTokens: 400 }), {
  onDelta: delta => {
    // Count words as they arrive
    wordCount += delta.split(/\s+/).filter(word => word.length > 0).length;
    process.stdout.write(delta);
  },
  onChunk: chunk => {
    chunkCount++;
    // Show progress every 10 chunks
    if (chunkCount % 10 === 0) {
      process.stdout.write(`\n[${wordCount} words so far]\n`);
    }
  },
  onFinish: finishReason => {
    console.log(`\nCompleted: ${finishReason} (${wordCount} words, ${chunkCount} chunks)`);
  },
});

console.log(`\nFinal result: ${result.content.length} characters`);
```

## Collecting Complete Responses

Sometimes you want to stream for responsiveness but still need the complete response. Use `collectStream()` to get both.

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const messages = [userText('Write a haiku about programming.')];

console.log('Collecting complete response...');
const stream = provider(messages, { model: 'gpt-4o', maxOutputTokens: 100 });

// This streams internally but returns the complete response
const result = await collectStream(stream);

console.log('Complete response:');
console.log(result.content);
console.log(`Length: ${result.content.length} characters`);
console.log(`Finish reason: ${result.finishReason}`);
```

## Streaming with Different Providers

All providers support streaming the same way. Here's how to stream with each:

```typescript
import { createProvider, userText, printStream } from '@chinmaymk/aikit';

const question = [userText('What is machine learning?')];

// OpenAI streaming
const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
console.log('OpenAI:');
await printStream(openai(question, { model: 'gpt-4o', maxOutputTokens: 150 }));

// Anthropic streaming
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
console.log('\nAnthropic:');
await printStream(
  anthropic(question, { model: 'claude-3-5-sonnet-20241022', maxOutputTokens: 150 })
);

// Google streaming
const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
console.log('\nGoogle:');
await printStream(google(question, { model: 'gemini-1.5-pro', maxOutputTokens: 150 }));
```

## Error Handling in Streams

Streams can fail at any point. Here's how to handle errors gracefully:

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

try {
  await processStream(provider([userText('Hello!')], { model: 'gpt-4o' }), {
    onDelta: delta => process.stdout.write(delta),
    onFinish: reason => {
      console.log(`\nStream completed: ${reason}`);
    },
  });
} catch (error) {
  console.error('Stream error occurred:', error.message);
  // Handle specific errors
  if (error.message.includes('rate limit')) {
    console.log('Too many requests - try again later');
  } else if (error.message.includes('API key')) {
    console.log('Check your API key configuration');
  }
}
```

## Performance Comparison

Here's how streaming compares to collecting full responses:

```typescript
import { createProvider, userText, printStream, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const messages = [userText('Write a paragraph about TypeScript benefits.')];

// Streaming approach - user sees immediate output
console.log('Streaming approach:');
const streamStart = Date.now();
await printStream(provider(messages, { model: 'gpt-4o', maxOutputTokens: 200 }));
const streamTime = Date.now() - streamStart;
console.log(`Streaming time: ${streamTime}ms\n`);

// Collect-all approach - user waits for complete response
console.log('Collect-all approach:');
const collectStart = Date.now();
const collectResult = await collectStream(
  provider(messages, { model: 'gpt-4o', maxOutputTokens: 200 })
);
const collectTime = Date.now() - collectStart;

console.log(collectResult.content);
console.log(`Collection time: ${collectTime}ms`);

// Streaming feels faster because users see immediate feedback
console.log('\nTakeaway: Streaming provides better UX even when total time is similar');
```

## Custom Stream Handlers

Build your own stream processing functions for specific use cases:

````typescript
import { createProvider, userText } from '@chinmaymk/aikit';

// Custom markdown processor
async function streamMarkdown(stream: AsyncIterable<any>) {
  let buffer = '';
  let inCodeBlock = false;

  for await (const chunk of stream) {
    buffer += chunk.delta;

    // Simple markdown detection
    if (buffer.includes('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        process.stdout.write('\n[CODE BLOCK START]\n');
      } else {
        process.stdout.write('\n[CODE BLOCK END]\n');
      }
    }

    // Style the output based on context
    if (inCodeBlock) {
      process.stdout.write(`\x1b[36m${chunk.delta}\x1b[0m`); // Cyan for code
    } else {
      process.stdout.write(chunk.delta);
    }
  }

  return buffer;
}

// Use your custom handler
const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const stream = provider([userText('Show me a simple JavaScript function with explanation.')], {
  model: 'gpt-4o',
  maxOutputTokens: 300,
});

await streamMarkdown(stream);
````

## Best Practices

1. **Always handle errors** - Streams can fail at any point
2. **Show progress indicators** - Let users know something is happening
3. **Use appropriate buffer sizes** - Don't overwhelm with too frequent updates
4. **Provide cancellation** - Let users stop long-running streams
5. **Optimize for perceived performance** - Streaming feels faster than waiting

## What's Next?

- [Multimodal Guide](./multimodal.md) - Add images to your streaming conversations
- [Tools Guide](./tools.md) - Stream responses that include function calls
- [API Reference](/api/generated/README) - Technical details on all streaming functions

Remember: Good streaming is about user experience, not just technical implementation. Make it feel responsive and engaging!
