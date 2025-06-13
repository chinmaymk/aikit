# Examples

Welcome to the AIKit cookbook—bite-sized, production-ready snippets you can copy-paste into your codebase. Each example runs with a single `npx tsx` and _zero_ extra dependencies. We won't tell anyone you didn't cook them yourself.

## Quick Start

Before you can run these examples, you'll need to clone the repo and set up your environment.

```bash
git clone https://github.com/chinmaymk/aikit.git
cd aikit
npm install
```

Set your API keys as environment variables (your secrets are safe with us):

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## Running Examples

Each example is a standalone TypeScript file that you can run directly:

```bash
npx tsx examples/01-getting-started.ts
npx tsx examples/02-streaming.ts
npx tsx examples/03-multimodal.ts
npx tsx examples/04-tools-basic.ts
npx tsx examples/05-conversations.ts
```

## 📚 Core Examples

### 1. Getting Started

**File:** [`01-getting-started.ts`](https://github.com/chinmaymk/aikit/blob/main/examples/01-getting-started.ts)

Your first steps with AIKit. This example progressively introduces:

- Simple text generation
- Configuration options (temperature, maxTokens)
- System messages for behavior control
- Conversation builder pattern
- Multiple provider comparison

```bash
npx tsx examples/01-getting-started.ts
```

**What you'll learn:**

- Basic provider creation and usage
- How to configure AI behavior
- Switching between providers seamlessly
- Building structured conversations

### 2. Streaming Responses

**File:** [`02-streaming.ts`](https://github.com/chinmaymk/aikit/blob/main/examples/02-streaming.ts)

Real-time AI responses for better UX. Covers:

- Basic streaming with `printStream()`
- Custom stream handlers for progress tracking
- Collecting complete responses with `collectDeltas()`
- Performance comparison: streaming vs batch

```bash
npx tsx examples/02-streaming.ts
```

**What you'll learn:**

- Multiple streaming patterns
- Custom progress tracking
- Error handling in streams
- When to use each streaming approach

### 3. Multimodal AI (Images)

**File:** [`03-multimodal.ts`](https://github.com/chinmaymk/aikit/blob/main/examples/03-multimodal.ts)

Combine text and images in your AI conversations:

- Single image analysis with helper functions
- Manual content creation (text + images)
- Multiple image comparison
- Images in conversation flows

```bash
npx tsx examples/03-multimodal.ts
```

**What you'll learn:**

- Image handling with AIKit helpers
- Building multimodal content manually
- Maintaining visual context in conversations
- Best practices for image prompting

### 4. Function Calling (Tools)

**File:** [`04-tools-basic.ts`](https://github.com/chinmaymk/aikit/blob/main/examples/04-tools-basic.ts)

Turn your AI into an action-taking assistant:

- Basic tool definition and usage
- Multiple tools in conversation
- Tool execution and response handling
- Error handling for tool failures

```bash
npx tsx examples/04-tools-basic.ts
```

**What you'll learn:**

- Creating and using AI tools
- Tool choice control
- Complete tool workflow patterns
- Real-world tool implementations

### 5. Conversation Management

**File:** [`05-conversations.ts`](https://github.com/chinmaymk/aikit/blob/main/examples/05-conversations.ts)

Build sophisticated conversation flows:

- Basic conversation patterns
- Context preservation across exchanges
- Memory management for long conversations
- Structured conversation patterns

```bash
npx tsx examples/05-conversations.ts
```

**What you'll learn:**

- Managing conversation state
- Context preservation strategies
- Memory trimming for long chats
- Building conversation personalities

## 🎯 Feature Showcase

### Provider Switching

```typescript
import { createProvider, userText } from 'aikit';

// Same code, different AI
const question = [userText('Explain quantum computing in simple terms.')];

// OpenAI
const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const openaiResult = await openai.generate(question, { model: 'gpt-4o' });

// Anthropic
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
const anthropicResult = await anthropic.generate(question, { model: 'claude-3-5-sonnet-20241022' });

// Google
const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
const googleResult = await google.generate(question, { model: 'gemini-1.5-pro' });
```

### Configuration Control

```typescript
const options = {
  model: 'gpt-4o',
  temperature: 0.7, // 0.0 (focused) to 2.0 (creative)
  maxTokens: 1000, // Response length limit
  topP: 0.9, // Nucleus sampling
  frequencyPenalty: 0, // Reduce repetition
  presencePenalty: 0, // Encourage topic diversity
  stopSequences: ['END'], // Stop generation at these strings
};

const result = await provider.generate(messages, options);
```

### Helper Functions

```typescript
import {
  userText,
  systemText,
  assistantText,
  userImage,
  conversation,
  printStream,
  collectDeltas,
} from 'aikit';

// Build messages easily
const messages = conversation().system('You are a helpful assistant').user('Hello!').build();

// Add images
const imageMessage = userImage('What do you see?', 'data:image/jpeg;base64,...');

// Stream handling
await printStream(provider.generate(messages, { model: 'gpt-4o' }));

// Collect complete responses
const result = await collectDeltas(provider.generate(messages, { model: 'gpt-4o' }));
```

## 🧪 Advanced Patterns

### Error Handling

```typescript
try {
  const result = await provider.generate(messages, { model: 'gpt-4o' });
  console.log(result.content);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Check your API key configuration');
  } else if (error.message.includes('rate limit')) {
    console.error('Slow down there, speed racer');
  } else {
    console.error('Something went sideways:', error.message);
  }
}
```

### Testing with Mocks

```typescript
// Mock provider for testing
const mockProvider = {
  async *generate(messages, options) {
    yield { delta: 'Hello ' };
    yield { delta: 'test!' };
    yield { delta: '', finishReason: 'stop', content: 'Hello test!' };
  },
};

// Use it just like a real provider
for await (const chunk of mockProvider.generate(messages, options)) {
  process.stdout.write(chunk.delta);
}
```

### Custom Stream Processing

```typescript
import { processStream } from 'aikit';

let wordCount = 0;
await processStream(stream, {
  onDelta: delta => {
    wordCount += delta.split(/\s+/).length;
    process.stdout.write(delta);
  },
  onChunk: chunk => {
    if (chunk.finishReason) {
      console.log(`\nCompleted with ${wordCount} words`);
    }
  },
  onError: error => console.error('Stream error:', error),
});
```

## 🔧 Production Patterns

### Conversation State Management

```typescript
class ChatManager {
  private messages = conversation().system('You are helpful').build();

  async chat(userMessage: string) {
    this.messages.push(userText(userMessage));

    const response = await provider.generate(this.messages, { model: 'gpt-4o' });
    this.messages.push(assistantText(response.content));

    return response.content;
  }

  reset() {
    this.messages = conversation().system('You are helpful').build();
  }
}
```

### Tool Integration

```typescript
import { createTool, executeToolCall } from 'aikit';

const weatherTool = createTool('get_weather', 'Get weather for a location', {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'City name' },
  },
  required: ['location'],
});

const toolServices = {
  get_weather: async (location: string) => {
    const weather = await fetch(`/api/weather?location=${location}`);
    return JSON.stringify(await weather.json());
  },
};

// Use in generation
const result = await provider.generate(messages, {
  model: 'gpt-4o',
  tools: [weatherTool],
});

// Execute tool calls
if (result.toolCalls) {
  for (const toolCall of result.toolCalls) {
    const result = await executeToolCall(toolCall, toolServices);
    console.log('Tool result:', result);
  }
}
```

## 🚀 Quick Recipes

### Chat with Image

```typescript
import { createProvider, userImage, printStream } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const message = userImage('Describe this image', 'data:image/jpeg;base64,...');

await printStream(provider.generate([message], { model: 'gpt-4o' }));
```

### Streaming Tool Use

```typescript
import { createProvider, createTool, processStream } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const tool = createTool('calculator', 'Do math', {
  type: 'object',
  properties: {
    /* tool properties */
  },
  required: [],
});

await processStream(
  provider.generate([userText('What is 2+2?')], { model: 'gpt-4o', tools: [tool] }),
  {
    onDelta: delta => process.stdout.write(delta),
    onChunk: chunk => {
      if (chunk.toolCalls) console.log('\n[Tool call detected]');
    },
  }
);
```

### Multi-Provider Comparison

```typescript
const providers = [
  { name: 'OpenAI', provider: createProvider('openai', {...}), model: 'gpt-4o' },
  { name: 'Anthropic', provider: createProvider('anthropic', {...}), model: 'claude-3-5-sonnet-20241022' },
  { name: 'Google', provider: createProvider('google', {...}), model: 'gemini-2.0-flash' }
];

for (const { name, provider, model } of providers) {
  console.log(`\n${name}:`);
  const result = await provider.generate([userText('Hello!')], { model });
  console.log(result.content);
}
```

## 💡 Tips & Best Practices

1. **Start simple** - Use basic generation first, add complexity gradually
2. **Handle errors gracefully** - Always wrap AI calls in try-catch
3. **Manage context** - Trim long conversations to stay within token limits
4. **Test with mocks** - Use mock providers for reliable testing
5. **Stream for UX** - Use streaming for better perceived performance
6. **Validate tool inputs** - Always sanitize tool parameters for security
7. **Use helpers** - AIKit's helper functions make code cleaner and more readable

## 🔗 What's Next?

- **[Getting Started Guide](/guide/getting-started)** - Comprehensive introduction to AIKit
- **[API Reference](/api/generated/README)** - Complete technical documentation
- **[GitHub Repository](https://github.com/chinmaymk/aikit)** - Source code, issues, and contributions

---

Ready to build something amazing? Pick an example and start coding. Remember: the best way to learn AIKit is to get your hands dirty with real code. Happy building! 🚀
