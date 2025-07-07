---
title: 'Model Reasoning: Showing the Work'
description: How to peek inside an AI's "brain" and see its step-by-step thinking process.
---

# Model Reasoning: Showing the Work

Ever wonder _how_ an AI gets to its answer? With reasoning-capable models, you can ask them to "show their work." It’s like getting a window into the model's thought process as it breaks down a problem, considers options, and formulates a plan.

This is incredibly powerful for:

- **Debugging**: See _why_ the model gave a weird answer.
- **Transparency**: Understand the logic behind a recommendation.
- **Building Agents**: Use the model's plan to orchestrate complex tool calls.

AIKit normalizes the output from different providers, giving you a consistent way to access this "behind-the-scenes" thinking.

## Getting the Full Thought Process

The easiest way to see a model's reasoning is to let it finish completely and then inspect the `reasoning` property on the result.

This example uses Anthropic's Claude 3.5 Sonnet, which has explicit support for this feature. We just have to enable it with the `thinking` parameter.

```typescript
import { createProvider, userText, collectStream } from '@chinmaymk/aikit';

const provider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const messages = [userText('Solve this equation: 2 * (x + 3) = 14')];

const stream = provider(messages, {
  model: 'claude-3-5-sonnet-20240620',
  // Just enable thinking to get the goods
  thinking: true,
});

const { text, reasoning } = await collectStream(stream);

console.log('Final Answer:');
console.log(text);
// "The value of x is 4."

console.log('\nHow it got there (Reasoning):');
console.log(reasoning);
/*
  "The user wants me to solve a linear equation.
  1.  First, I need to distribute the 2 on the left side: 2*x + 2*3 = 14, which simplifies to 2x + 6 = 14.
  2.  Next, I'll isolate the term with x by subtracting 6 from both sides: 2x = 14 - 6, which is 2x = 8.
  3.  Finally, I'll solve for x by dividing both sides by 2: x = 8 / 2, which gives x = 4.
  I will now state the final answer."
*/
```

For other providers, the process is similar:

- **OpenAI**: Use an `o-series` model (e.g., `'o1-mini'`) and set `reasoning: { effort: 'medium' }`.
- **Google**: Use a recent Gemini model (e.g., `'gemini-2.5-pro'`). Support is automatic but can be experimental.

## Watching the Thoughts Form (Streaming)

For a real-time view into the model's head, you can stream its reasoning. Use the `processStream` helper and provide an `onReasoning` handler to capture the thought process as it unfolds.

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

const provider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const messages = [userText('Solve this equation: 2 * (x + 3) = 14')];

const responseStream = provider(messages, {
  model: 'claude-3-5-sonnet-20240620',
  thinking: true,
});

await processStream(responseStream, {
  onReasoning: text => {
    // In a UI, you could render this to a "thinking..." box
    process.stdout.write(text);
  },
  onText: text => {
    // The final answer still comes through onText
  },
});
```

## The Golden Rules of Reasoning

- **It Costs Extra**: "Showing your work" takes more effort from the model, which means it uses more tokens and costs more. Use it when you actually need the process, not just the answer.
- **Check for Support**: Not all models support reasoning. It's generally available on the latest flagship models from OpenAI (`o-series`), Anthropic (`Claude 3+`), and Google (`Gemini 1.5+`).
- **It's Not Always Perfect**: Sometimes the reasoning is a better answer than the final content! It's a fascinating, powerful, and occasionally quirky feature. Experiment with it.

Now go see what your AI is really thinking! 🚀
