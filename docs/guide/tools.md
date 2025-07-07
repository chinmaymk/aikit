---
title: Function Calling with Tools
description: How to give your AI hands to interact with the world, not just a mouth to talk about it.
---

# Function Calling with Tools

Function calling, or "tools," is what bridges the AI's reasoning with real-world action. It stops being a chatbot and starts being an assistant that can _do things_.

## How It Works

The dance is simple, and AIKit handles the choreography:

1.  **You**: Define your tools and give them to the AI.
2.  **AI**: Receives a prompt and decides if it needs a tool. If so, it pauses and says, "I need to use the `calculator`."
3.  **You**: Execute the actual code for the `calculator` function with the arguments the AI provided.
4.  **AI**: Gets the result back and uses it to give you a final, informed answer.

It’s a simple loop that makes your AI infinitely more capable.

## Your First Tool: A Simple Calculator

Let's teach our AI some basic math. Even the smartest models can't be trusted with arithmetic.

```typescript
import {
  createProvider,
  createTool,
  userText,
  assistant,
  toolResult,
  printStream,
  collectStream,
} from '@chinmaymk/aikit';

// 1. Define your tool's schema and implementation
const tools = {
  calculator: createTool(
    'calculator',
    'Performs basic math operations.',
    {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['operation', 'a', 'b'],
      additionalProperties: false,
    },
    async ({ operation, a, b }) => {
      if (operation === 'add') return a + b;
      if (operation === 'subtract') return a - b;
      throw new Error('Invalid operation');
    }
  ),
};

// 2. Create your provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// 3. Start the conversation
const messages = [userText('What is 42 minus 15?')];

// 4. Let the model decide which tool to use
const stream = provider(messages, {
  model: 'gpt-4o',
  tools,
});
const { toolCalls } = await collectStream(stream);

// 5. If a tool is called, execute it
if (toolCalls) {
  messages.push(assistantWithToolCalls(result.content, result.toolCalls));
  const tool_outputs = await Promise.all(
    tool_calls.map(async call => {
      // Find the tool implementation
      const tool = tools[call.tool_name];
      if (!tool) throw new Error(`Tool not found: ${call.tool_name}`);

      // Execute and return the result
      const output = await tool.execute(call.args);
      return toolResult(String(output), call.tool_call_id);
    })
  );
  messages.push(...tool_outputs);

  // 6. Get the final response from the model
  await printStream(provider(messages));
}
```

This example shows the complete, manual loop for tool calling:

1.  Define the tool with its schema and execution logic.
2.  Call the provider and check for `tool_calls` in the response.
3.  Execute the corresponding tool functions.
4.  Send the `toolResult` back to the provider.
5.  Stream the final answer.

It's a bit more work, but it gives you complete control over the process.

## Taking the Reins: Controlling Tool Usage

Sometimes you need to be the boss. AIKit lets you tell the AI exactly _how_ to use its tools with the `toolChoice` option.

- `toolChoice: 'auto'` (Default): The AI decides whether to use a tool or not. This is your go-to for most situations.
- `toolChoice: 'required'`: The AI _must_ use one of the provided tools. Perfect for forcing structured data extraction.
- `toolChoice: 'none'`: The AI is forbidden from using any tools, even if they are provided. Use this when you need a pure text-based response.

```typescript
// Force the AI to use the calculator
const stream = provider(messages, {
  model: 'gpt-4o',
  tools,
  tool_choice: 'required',
});
const { toolCalls } = await collectStream(stream);
```

## Streaming and Tools: A Perfect Match

Tools work seamlessly with streaming. The recommended way to handle this is with the `processStream` helper, which can listen for `onToolCall` events.

```typescript
import { createProvider, userText, processStream } from '@chinmaymk/aikit';

// ... (setup provider and tools as above)

const stream = provider(messages, {
  model: 'gpt-4o',
  tools,
});

await processStream(stream, {
  onToolCall: toolCall => {
    console.log('Model wants to call:', toolCall);
    // You would execute the tool here and send the result back
  },
  onText: text => process.stdout.write(text),
});
```

Check out the [Streaming Guide](./streaming.md) for a deeper dive.

## Golden Rules for Tools

- **Be Specific**: The better your tool descriptions, the better the model will be at using them. "Gets the 5-day weather forecast" is better than "Gets weather."
- **Handle Errors**: Your tool execution might fail. Wrap it in a `try...catch` block and return a helpful error message to the model so it can try again or inform the user.
- **Validate Inputs**: Use a validation library like `zod` or `jsonschema` to define your tool's input schema.
- **Keep It Simple**: Don't try to cram too much logic into a single tool. A few simple, focused tools are better than one complex one.

Happy building! 🚀
