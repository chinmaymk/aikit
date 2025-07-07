---
title: Usage Tracking
description: How to monitor your AI's speed, cost, and token consumption with AIKit's built-in dashboard.
---

# Usage Tracking

Think of AIKit's usage tracking like the dashboard in your favorite car. You wouldn't drive without knowing your speed, fuel, or how far you've gone—so why run AI models without knowing your tokens, latency, and cost? AIKit gives you a clear, consistent dashboard for every request, no matter which provider you use.

## What Is Usage Tracking?

Every time you make a request with AIKit, you can get a `usage` object—a simple, provider-agnostic summary of how many tokens you used, how long things took, and (for some models) how much "thinking" happened behind the scenes. It's your one-stop shop for monitoring performance and cost.

## The Core Logic: One Flag, Full Dashboard

For most providers, usage tracking is automatic. For OpenAI, just flip a switch. Here’s the essential pattern:

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});
const messages = [userText('Explain the theory of relativity in 100 words.')];

const stream = provider(messages, {
  model: 'gpt-4o',
  // For OpenAI, just add this flag
  includeUsage: true,
});

const { content, usage } = await collectStream(stream);

console.log('The AI said:');
console.log(content);

console.log('\n--- The Dashboard ---');
console.log(`Input Tokens: ${usage.inputTokens}`);
console.log(`Output Tokens: ${usage.outputTokens}`);
console.log(`Total Tokens: ${usage.totalTokens}`);
console.log(`Time to First Token: ${usage.timeToFirstToken}ms`);
console.log(`Total Time: ${usage.totalTime}ms`);
```

That’s it. No extra setup, no complex plumbing—just a clear dashboard for every call.

## What You Get (and What You Might Not)

The `usage` object always has the same structure, but the data inside depends on the provider:

- **OpenAI**: The gold standard. All metrics, but you must set `includeUsage: true`.
- **Google**: Excellent. Most metrics are automatic.
- **Anthropic**: Good, but limited. Some fields (like input tokens) may be missing.

| Provider  | inputTokens | outputTokens | totalTokens | timeToFirstToken | totalTime | reasoningTokens |
| --------- | ----------- | ------------ | ----------- | ---------------- | --------- | --------------- |
| OpenAI    | ✅          | ✅           | ✅          | ✅               | ✅        | ✅ (o-series)   |
| Google    | ✅          | ✅           | ✅          | ✅               | ✅        |                 |
| Anthropic | (may miss)  | ✅           | (partial)   | ✅               | ✅        |                 |

If a field isn’t available, it’ll be `undefined`—but your code doesn’t have to change.

## Beyond the Basics: Pro Tips

- **Monitor Your Costs**: Tokens = money. Use `totalTokens` (and `reasoningTokens` for some models) to keep an eye on your spend.
- **Watch Your Latency**: `timeToFirstToken` is the best measure of responsiveness. If it’s high, your app will feel slow.
- **Trust but Verify**: Providers tokenize differently. AIKit reports what the provider says, but always double-check your provider dashboard for real-world costs.

## See It in Action

Want a full working example? Check out [`examples/10-usage-tracking.ts`](../../examples/10-usage-tracking.ts) for a complete, ready-to-run demo.

## The Bottom Line

AIKit’s usage tracking is your AI dashboard—simple, consistent, and always there when you need it. Flip the switch, keep an eye on your metrics, and build smarter, more cost-effective AI apps. Happy driving!
