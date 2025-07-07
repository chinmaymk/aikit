---
title: Framework Integration
description: How to safely use AIKit in web apps by letting your backend handle the secret keys.
---

# Framework Integration

Think of your AI provider API keys like the keys to a very expensive, very fast car. You wouldn't hand them over to just anyone who walks into your web app, right? That's where AIKit's proxy pattern comes in. It's a secure valet for your API keys.

The concept is simple:

1.  Your frontend (the browser) makes requests to your backend.
2.  Your backend (the valet) securely holds the API keys and forwards the request to the actual AI provider (OpenAI, Anthropic, etc.).
3.  The response is streamed back through your backend to the frontend.

This keeps your secret keys safe on the server, where they belong, while giving you a seamless experience on the client.

## The Backend

AIKit provides a `callProxyProvider` function that makes setting up this backend endpoint a piece of cake. Here’s how you’d do it in Express and Next.js.

### Express Example

```typescript
// server.ts
import express from 'express';
import { callProxyProvider } from '@chinmaymk/aikit/proxy';

const app = express();
app.use(express.json());

// Your secret keys live safely here on the server
const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

app.post('/api/aikit', async (req, res) => {
  try {
    const stream = await callProxyProvider({
      ...req.body,
      // Securely inject the right API key
      providerOptions: {
        ...req.body.providerOptions,
        apiKey: apiKeys[req.body.providerType],
      },
    });

    // Stream the response back to the client
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(3000);
```

### Next.js Example

The logic is identical for Next.js, just adapted for a Route Handler.

```typescript
// app/api/aikit/route.ts
import { callProxyProvider, toReadableStream } from '@chinmaymk/aikit/proxy';

const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

export async function POST(request: Request) {
  const body = await request.json();

  const stream = await callProxyProvider({
    ...body,
    providerOptions: {
      ...body.providerOptions,
      apiKey: apiKeys[body.providerType],
    },
  });

  // Convert to a ReadableStream for the Next.js Response
  const readable = toReadableStream(stream).pipeThrough(new TextEncoderStream());

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  });
}
```

## The Frontend

Here's the magic trick: using the proxy from your frontend looks almost _exactly_ the same as using AIKit on the backend. Just use `createProxyProvider` instead of `createProvider`.

```typescript
// app.tsx
import { createProxyProvider, userText, printStream } from '@chinmaymk/aikit';

// Point this to your new backend endpoint
const provider = createProxyProvider('openai', {
  baseURL: 'http://localhost:3000/api/aikit',
});

// From here, the code is identical to backend-only usage!
const messages = [userText('Why is the sky blue?')];

await printStream(provider(messages, { model: 'gpt-4o' }));
```

## The Bottom Line

The proxy pattern is the secure way to build web applications with AIKit. It gives you the best of both worlds: the full power of server-side AI processing with the interactive feel of a modern web app, all without ever exposing your secret keys.

Happy (and safe) building! 🚀
