---
title: Streaming Responses
description: Make your AI feel alive with real-time, character-by-character responses from your models.
---

# Streaming Responses

Waiting for an AI to finish thinking is like watching paint dry. Streaming is the difference between that and watching a live concert. Both take time, but one is an engaging, real-time experience.

With AIKit, you can stream responses from any provider, giving your users instant feedback and making your application feel incredibly dynamic.

## The Main Tool: `processStream`

For 99% of use cases, the `processStream` helper is all you'll ever need. It's a powerful and flexible way to handle the events of a stream as they happen.

Think of it as setting up listeners for different moments in the stream's lifecycle:

- `onContent`: Fires every time a new piece of text arrives. This is what you'll use to display the response in your UI.
- `onToolCall`: Fires when the model decides to use a tool.
- `onFinish`: Fires when the stream is complete, giving you the final state.

### Example: A Live-Updating Console Log

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});
const messages = [userText('Write a 50-word story about a robot who discovers coffee.')];

// Get a Node.js stream of events
const responseStream = openai(messages, { model: 'gpt-4o' });

// Process the stream to get text as it arrives
await processStream(responseStream, {
  onContent: text => {
    // This will print each new word as it arrives
    process.stdout.write(text);
  },
  onFinish: reason => {
    console.log(`\n\nStream finished: ${reason}`);
  },
});
```

This pattern is the foundation for building real-time chatbots, interactive tools, and anything that needs to feel _alive_.

## Full Control: Manual Iteration

If you need to do something truly custom, you can always iterate over the stream yourself with a `for...await` loop. Under the hood, this is what the helpers do.

```typescript
import { createProvider, userText } from '@chinmaymk/aikit';

const provider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const messages = [userText('Tell me a joke.')];

const responseStream = provider(messages, {
  model: 'claude-3-5-sonnet-20240620',
});

for await (const chunk of responseStream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.text);
  } else if (chunk.type === 'finish') {
    console.log(`\n\nDone! Reason: ${chunk.reason}`);
  }
}
```

Each `event` in the stream is a typed object (`TextEvent`, `ToolCallEvent`, etc.), giving you full type-safe control over the stream's flow.

## Get Everything at the End: `collectStream`

What if you want the responsiveness of streaming but only care about the final, complete message? `collectStream` is your answer. It processes the stream internally and returns a single promise that resolves with the final result once the stream is finished.

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const messages = [userText('Hello!')];

const responseStream = provider(messages);

// No need for handlers, just await the final result
const { text, finishReason, toolCalls } = await collectStream(responseStream);

console.log('Final Content:', text);
```

This is great for logging or when a downstream function needs the full text, but you still want your application to feel like it's working in real-time.

## The Golden Rules of Streaming

- **Always Handle Errors**: A stream can fail for many reasons (network issues, rate limits, etc.). Wrap your streaming logic in a `try...catch` block to handle failures gracefully.
- **It Just Works**: The same streaming logic works for all providers, with and without tools or multimodal content. AIKit normalizes the underlying data so you don't have to.
- **Think UX**: The point of streaming is to improve the user experience. Make sure your UI reflects the real-time nature of the data you're receiving.

Happy streaming! 🚀
