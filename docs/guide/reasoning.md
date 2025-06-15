# Reasoning Support

AIKit provides access to AI model reasoning processes, allowing you to see how models think through problems step-by-step. It's like having a window into the AI's brain—fascinating and occasionally terrifying.

## Quick Start

### Anthropic Claude

```ts
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const result = await collectStream(
  anthropic([userText('Solve: 2x + 5 = 15')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning);
```

### OpenAI o-series

```ts
const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await collectStream(
  openai([userText('Design a sorting algorithm')], {
    model: 'o1-mini',
    reasoning: { effort: 'medium' },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning);
```

### Google Gemini

```ts
const google = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
});

const result = await collectStream(
  google([userText('Analyze this complex problem step by step')], {
    model: 'gemini-2.0-flash',
    // Note: Google's reasoning support is experimental
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning);
```

## Real-time Reasoning

Access reasoning as it happens—it's like watching someone think out loud, but faster:

```ts
import { processStream } from '@chinmaymk/aikit';

await processStream(
  anthropic([userText('Explain quantum physics')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 1024 },
  }),
  {
    onReasoning: reasoning => {
      console.log('[THINKING]:', reasoning.delta);
    },
    onDelta: delta => process.stdout.write(delta),
  }
);
```

## Configuration

### Anthropic Parameters

```ts
{
  thinking: {
    type: 'enabled',
    budget_tokens: 1024, // 512-4096 recommended
  },
  maxOutputTokens: 1500, // Should exceed budget_tokens
}
```

### OpenAI Parameters

```ts
{
  reasoning: {
    effort: 'low' | 'medium' | 'high',
  },
}
```

### Google Gemini Parameters

Google's reasoning support is currently experimental and may vary by model:

```ts
{
  // Standard parameters - reasoning extraction handled automatically
  temperature: 0.7,
  maxOutputTokens: 1024,
}
```

## Use Cases

### Complex Problem Solving

```ts
const mathProblem = userText(`
Two trains approach each other on parallel tracks.
Train A: 60 mph, leaves at 2:00 PM
Train B: 80 mph, leaves at 2:30 PM  
Distance: 300 miles apart
When do they meet?
`);

const result = await collectStream(
  anthropic([mathProblem], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 1536 },
  })
);
```

### Code Analysis

```ts
const result = await collectStream(
  openai([userText('Find longest palindromic substring - optimize for time complexity')], {
    model: 'o1',
    reasoning: { effort: 'high' },
  })
);
```

### Decision Analysis

```ts
const result = await collectStream(
  anthropic([userText('Investment advice: $10k, moderate risk, 5-year timeline')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 2048 },
  })
);
```

### Multimodal Reasoning

```ts
import { userImage } from '@chinmaymk/aikit';

const result = await collectStream(
  anthropic([userImage('Analyze this chart and explain the trends', imageData)], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 2048 },
  })
);
```

## Best Practices

**Token Budget Guidelines:**

- Simple problems: 512 tokens
- Complex analysis: 1024-2048 tokens
- Deep reasoning: 2048-4096 tokens

**Error Handling:**

```ts
try {
  const result = await collectStream(stream);
  if (result.reasoning) {
    console.log('Reasoning:', result.reasoning);
  } else {
    console.log('No reasoning available - model may not support it');
  }
} catch (error) {
  console.error('Reasoning failed:', error);
}
```

**Cost Management:**

- Set appropriate `budget_tokens` limits (reasoning tokens cost extra)
- Use `effort: 'low'` for simple tasks with OpenAI
- Monitor reasoning token usage in your API dashboard
- Consider caching results for repeated queries

## Limitations

- **Model Support**: Limited to specific model series that support reasoning
- **API Access**: Some reasoning features may require higher API tiers
- **Token Costs**: Reasoning significantly increases token usage and costs
- **Streaming**: Not all reasoning content streams in real-time
- **Availability**: Google's reasoning support is experimental

## Troubleshooting

**No reasoning content?**

1. Verify model supports reasoning (check supported models above)
2. Check your API access level with the provider
3. Use correct parameters (`thinking` for Anthropic, `reasoning` for OpenAI)
4. Ensure you're calling `collectStream()` or using `processStream()`
5. Try a different model that definitely supports reasoning

**High token usage?**

1. Reduce `budget_tokens` for Anthropic
2. Use `effort: 'low'` for OpenAI
3. Be more specific in your prompts
4. Consider if reasoning is necessary for your use case

**Stream not working?**

1. Use `processStream()` with `onReasoning` handler
2. Check that the model actually returns reasoning content
3. Verify your stream processing logic handles all chunk types

---

**Pro tip:** Reasoning models are like having a really smart friend who shows their work. They're incredibly powerful but use more tokens, so use them when you actually need to see the thinking process—not just for simple Q&A.

## Supported Models

**OpenAI**

- `o1`
- `o1-mini`
- `o1-preview`
- `o1-pro`
- `o3-mini`
- `o4-mini`

**Anthropic**

- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `claude-3-7-sonnet-20250219`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

**Google**

- `gemini-2.5-pro-preview-06-05`
- `gemini-2.5-flash-preview-05-20`
- `gemini-2.0-flash`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
