# Reasoning Support

AIKit provides access to AI model reasoning processes, allowing you to see how models think through problems step-by-step.

## Supported Models

**Anthropic Claude 4 Series** (Latest)

- `claude-opus-4-20250514` - Most capable reasoning
- `claude-sonnet-4-20250514` - Balanced performance
- `claude-3-7-sonnet-20250219` - Fast reasoning

**OpenAI o-series** (Latest)

- `o4-mini-2025-04-16` - Latest compact reasoning model
- `o1-2024-12-17` - Production reasoning model
- `o1-pro-2025-03-19` - Advanced reasoning capabilities

**Google Gemini 2.5 Series** (Latest)

- `gemini-2.5-pro-preview-06-05` - Advanced reasoning with thinking budgets
- `gemini-2.5-flash-preview-05-20` - Fast reasoning with adaptive thinking
- `gemini-2.0-flash` - Experimental thinking support

## Quick Start

### Anthropic Claude 4

```ts
import { createProvider, userText, collectDeltas } from '@chinmaymk/aikit';

const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const result = await collectDeltas(
  anthropic.generate([userText('Solve: 2x + 5 = 15')], {
    model: 'claude-sonnet-4-20250514',
    thinking: {
      type: 'enabled',
      budget_tokens: 1024,
    },
    temperature: 1, // Required for thinking mode
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
  openai.generate([userText('Design a sorting algorithm')], {
    model: 'o4-mini-2025-04-16',
    reasoning: { effort: 'medium' },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning);
```

### Google Gemini 2.5

```ts
const google = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
});

const result = await collectDeltas(
  google.generate([userText('Analyze this complex problem step by step')], {
    model: 'gemini-2.5-pro-preview-06-05',
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: 1024,
    },
  })
);

console.log('Answer:', result.content);
console.log('Reasoning:', result.reasoning);
```

## Real-time Reasoning

Access reasoning as it happens:

```ts
import { processStream } from '@chinmaymk/aikit';

await processStream(
  anthropic.generate([userText('Explain quantum physics')], {
    model: 'claude-sonnet-4-20250514',
    thinking: { type: 'enabled', budget_tokens: 1024 },
    temperature: 1,
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
    budget_tokens: 1024 // 512-4096 recommended
  },
  temperature: 1, // Required when thinking is enabled
  maxOutputTokens: 1500, // Must exceed budget_tokens
}
```

### OpenAI Parameters

```ts
{
  reasoning: {
    effort: 'low' | 'medium' | 'high';
  }
}
```

### Google Gemini Parameters

```ts
{
  thinkingConfig: {
    includeThoughts: true, // Enable thought summaries
    thinkingBudget: 1024   // 128-32768 for Pro, 0-24576 for Flash
  }
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
  anthropic.generate([mathProblem], {
    model: 'claude-opus-4-20250514',
    thinking: { type: 'enabled', budget_tokens: 1536 },
    temperature: 1,
  })
);
```

### Code Analysis

```ts
const result = await collectDeltas(
  openai.generate([userText('Find longest palindromic substring - optimize for time complexity')], {
    model: 'o4-mini-2025-04-16',
    reasoning: { effort: 'high' },
  })
);
```

### Decision Analysis

```ts
const result = await collectDeltas(
  anthropic.generate([userText('Investment advice: $10k, moderate risk, 5-year timeline')], {
    model: 'claude-sonnet-4-20250514',
    thinking: { type: 'enabled', budget_tokens: 2048 },
    temperature: 1,
  })
);
```

### Multimodal Reasoning

```ts
const result = await collectDeltas(
  google.generate([userText('Analyze this chart and explain the trends')], {
    model: 'gemini-2.5-pro-preview-06-05',
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: 2048,
    },
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
const result = await collectDeltas(stream);
if (result.reasoning) {
  console.log('Reasoning:', result.reasoning);
} else {
  console.log('No reasoning available');
}
```

**Cost Management:**

- Set appropriate `budget_tokens` limits
- Use `effort: 'low'` for simple tasks
- Monitor reasoning token usage

## Limitations

- **Model Support**: Limited to specific model series
- **API Access**: May require specific tiers
- **Token Costs**: Reasoning significantly increases usage
- **Streaming**: Not all providers stream reasoning tokens

## Troubleshooting

**No reasoning content?**

1. Verify model supports reasoning
2. Check API access level
3. Use correct parameters (`thinking` vs `reasoning` vs `thinkingConfig`)
4. Ensure `temperature: 1` for Anthropic thinking mode
5. Set `includeThoughts: true` for Google Gemini

**High token usage?**

1. Lower `budget_tokens` or `effort` settings
2. Use more focused prompts
3. Monitor usage patterns

See `/examples/07-reasoning-models.ts` for complete implementation examples.
