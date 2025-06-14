# Reasoning Support

AIKit provides access to AI model reasoning processes, allowing you to see how models think through problems step-by-step. It's like having a window into the AI's brain—fascinating and occasionally terrifying.

## Supported Models

**Anthropic Claude** (Current)

- `claude-3-5-sonnet-20241022` - Latest and most capable
- `claude-3-5-haiku-20241022` - Fast with thinking capabilities
- `claude-3-opus-20240229` - Deep reasoning powerhouse

**OpenAI o-series** (Current)

- `o1-2024-12-17` - Latest production reasoning model
- `o1-mini` - Compact reasoning model
- `o1-preview` - Preview with advanced capabilities

**Google Gemini** (Current)

- `gemini-2.0-flash` - Latest with experimental thinking support
- `gemini-1.5-pro` - Advanced reasoning capabilities
- `gemini-1.5-flash` - Fast reasoning support

## Quick Start

### Anthropic Claude

```ts
import { createProvider, userText, collectDeltas } from '@chinmaymk/aikit';

const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const result = await collectDeltas(
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

const result = await collectDeltas(
  openai([userText('Design a sorting algorithm')], {
    model: 'o1-2024-12-17',
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

const result = await collectDeltas(
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

const result = await collectDeltas(
  anthropic([mathProblem], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 1536 },
  })
);
```

### Code Analysis

```ts
const result = await collectDeltas(
  openai([userText('Find longest palindromic substring - optimize for time complexity')], {
    model: 'o1-2024-12-17',
    reasoning: { effort: 'high' },
  })
);
```

### Decision Analysis

```ts
const result = await collectDeltas(
  anthropic([userText('Investment advice: $10k, moderate risk, 5-year timeline')], {
    model: 'claude-3-5-sonnet-20241022',
    thinking: { type: 'enabled', budget_tokens: 2048 },
  })
);
```

### Multimodal Reasoning

```ts
import { userImage } from '@chinmaymk/aikit';

const result = await collectDeltas(
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
  const result = await collectDeltas(stream);
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
4. Ensure you're calling `collectDeltas()` or using `processStream()`
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
