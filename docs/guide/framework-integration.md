---
title: Framework Integration
description: Integration guide for popular web frameworks using AIKit's proxy provider pattern
---

# Framework Integration

This guide demonstrates how to integrate AIKit with popular web frameworks using the proxy provider pattern for secure API key management.

## Overview

AIKit's proxy provider allows you to:

- Keep API keys secure on the server
- Use the same AIKit interface on both frontend and backend
- Stream responses using Server-Sent Events (SSE)

## Express

```javascript
import express from 'express';
import { callProxyProvider } from '@chinmaymk/aikit';

const app = express();
app.use(express.json());

const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

app.post('/aikit/proxy', async (req, res) => {
  const { messages, providerType, providerOptions, options } = req.body;
  const apiKey = apiKeys[providerType];

  if (!apiKey) {
    return res.status(400).json({
      error: `API key not found for ${providerType}`,
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const stream = callProxyProvider({
    messages,
    providerType,
    providerOptions: { ...(providerOptions || {}), apiKey },
    options,
  });

  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.end();
});

app.listen(3000);
```

## Next.js

```javascript
// app/api/aikit/proxy/route.js
import { callProxyProvider, toReadableStream } from '@chinmaymk/aikit';

const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

export async function POST(request) {
  const body = await request.json();
  const { messages, providerType, providerOptions, options } = body;
  const apiKey = apiKeys[providerType];

  if (!apiKey) {
    return Response.json({ error: `API key not found for ${providerType}` }, { status: 400 });
  }

  const stream = callProxyProvider({
    messages,
    providerType,
    providerOptions: { ...(providerOptions || {}), apiKey },
    options,
  });

  const readable = toReadableStream(stream).pipeThrough(new TextEncoderStream());

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

## Frontend Usage

```javascript
import { createProxy, userText, processStream } from '@chinmaymk/aikit';

// Create proxy provider
const provider = createProxy('openai', {
  baseURL: 'http://localhost:3000',
  model: 'gpt-4o',
});

// Use the provider
const messages = [userText('Hello world!')];
const stream = provider(messages);

await processStream(stream, {
  onDelta: delta => console.log('New text:', delta),
  onContent: content => console.log('Full content:', content),
});
```

## Multiple Providers

```javascript
// Frontend - create different providers
const providers = {
  openai: createProxy('openai', {
    baseURL: origin,
    model: 'gpt-4o',
  }),
  anthropic: createProxy('anthropic', {
    baseURL: origin,
    model: 'claude-3-5-sonnet-20241022',
  }),
  google: createProxy('google', {
    baseURL: origin,
    model: 'gemini-1.5-pro',
  }),
};

// Use the selected provider
const stream = providers[selectedProvider](messages);
```

## Environment Setup

```bash
# .env
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key
```

This guide shows how AIKit's proxy provider system provides a consistent, secure integration pattern across different web frameworks.
