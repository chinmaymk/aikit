---
title: Custom Headers
description: How to add sticky notes to your AI requests for tracking, auth, and debugging.
---

# Custom Headers

Think of custom headers as sticky notes you attach to your AI requests before sending them off. You can add a request ID for tracking, an authentication token for a proxy, or a user ID for analytics. It's metadata that travels with your request, giving you more control and visibility.

AIKit makes this easy with the `mutateHeaders` option, a simple function that lets you modify headers before any request is sent.

## How It Works

When you create a provider, you can pass a `mutateHeaders` function. This function will be called right before _every_ request, receiving an object with the current headers. You can add, change, or remove any of them.

It's the perfect place to inject dynamic data.

```typescript
import { createProvider, userText, printStream } from '@chinmaymk/aikit';
import { randomUUID } from 'node:crypto';

let requestCount = 0;

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  // This function runs before every call
  mutateHeaders: headers => {
    const requestId = randomUUID();
    // Add a unique ID for tracing this specific request
    headers['X-Request-ID'] = requestId;

    // Add a counter
    requestCount++;
    headers['X-Request-Count'] = String(requestCount);

    console.log(`Sending request #${requestCount} with ID: ${requestId}`);
  },
});

const messages = [userText('Write a short poem.')];

// This call will trigger the mutateHeaders function
await printStream(provider(messages));
```

This works for all providers and even for embedding requests, giving you a single, consistent way to manage request metadata.

## The Golden Rules of Headers

- **Keep It Light**: Headers are for metadata, not for large payloads. Stick to simple strings.
- **Handle Errors**: If you're doing something dynamic (like getting a user ID from a session), wrap it in a `try...catch` block so a failure doesn't kill the entire request.
- **Don't Overwrite Core Headers**: Be careful not to modify essential headers like `Authorization` or `Content-Type` unless you know exactly what you're doing.

That’s all there is to it. Now go label your requests! 🚀
