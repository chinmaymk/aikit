# Conversation Management

Great AI conversations are more than single exchanges—they're contextual, coherent, and purposeful. AIKit gives you the tools to build conversations that remember, adapt, and engage. Let's turn your AI from a parrot into a conversation partner.

## Why Conversation Management?

Single-shot AI interactions are like speed dating—quick, but shallow. Real conversations build context, maintain state, and develop over time. Whether you're building a chatbot, a coding assistant, or an AI tutor, good context management is crucial.

## Basic Conversation Flow

Start simple with back-and-forth exchanges:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Build a conversation fluently
const messages = conversation()
  .system('You are a helpful programming tutor. Keep explanations concise but clear.')
  .user('What is the difference between let and const in JavaScript?')
  .build();

console.log('User: What is the difference between let and const?');

// First exchange
const response1 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 200 });
console.log('AI:', response1.content);

// Continue the conversation
messages.push(assistantText(response1.content));
messages.push(userText('Can you show me a practical example?'));

console.log('\nUser: Can you show me a practical example?');

const response2 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 250 });
console.log('AI:', response2.content);

// Keep going...
messages.push(assistantText(response2.content));
messages.push(userText('What happens if I try to reassign a const variable?'));

console.log('\nUser: What happens if I try to reassign a const?');

const response3 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 150 });
console.log('AI:', response3.content);
```

## Context Preservation

The AI should remember what you've talked about. Here's how to maintain context effectively:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Rich context from the start
const messages = conversation()
  .system(
    'You are a helpful assistant. Remember details from our conversation and refer back to them when relevant.'
  )
  .user("Hi! My name is Sarah and I'm a software engineer working on a React project.")
  .build();

console.log("User: Hi! My name is Sarah and I'm working on a React project.");

const response1 = await provider.generate(messages, { model: 'gpt-4o' });
console.log('AI:', response1.content);

// Test context retention
messages.push(assistantText(response1.content));
messages.push(userText("I'm having trouble with state management. What would you recommend?"));

console.log("\nUser: I'm having trouble with state management. What would you recommend?");

const response2 = await provider.generate(messages, { model: 'gpt-4o' });
console.log('AI:', response2.content);

// Check if AI remembers personal details
messages.push(assistantText(response2.content));
messages.push(userText('What was my name again, and what technology am I working with?'));

console.log('\nUser: What was my name and what technology am I working with?');

const response3 = await provider.generate(messages, { model: 'gpt-4o' });
console.log('AI:', response3.content);
```

## Memory Management

Long conversations can exceed token limits. Here's how to manage memory intelligently:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Track conversation length and manage memory
class ConversationManager {
  private messages: any[] = [];
  private maxMessages = 10; // Keep last 10 messages + system

  constructor(systemPrompt: string) {
    this.messages = conversation().system(systemPrompt).build();
  }

  addMessage(message: any) {
    this.messages.push(message);
    this.trimIfNeeded();
  }

  private trimIfNeeded() {
    // Keep system message + last N messages
    if (this.messages.length > this.maxMessages + 1) {
      const systemMessage = this.messages[0];
      const recentMessages = this.messages.slice(-this.maxMessages);
      this.messages = [systemMessage, ...recentMessages];
      console.log('[Memory trimmed - keeping recent context]');
    }
  }

  getMessages() {
    return [...this.messages];
  }

  async chat(provider: any, userMessage: string) {
    this.addMessage(userText(userMessage));

    const response = await provider.generate(this.getMessages(), {
      model: 'gpt-4o',
      maxTokens: 200,
    });

    this.addMessage(assistantText(response.content));
    return response.content;
  }
}

// Use the conversation manager
const chatManager = new ConversationManager(
  'You are a helpful assistant. Keep track of our conversation context.'
);

const topics = [
  'What is machine learning?',
  'How does neural network training work?',
  'What are the different types of ML?',
  'Can you explain supervised learning?',
  'What about unsupervised learning?',
  'How do I get started with ML?',
  'What programming languages should I learn?',
  'Can you recommend some resources?',
];

for (const topic of topics) {
  console.log(`\nUser: ${topic}`);
  const response = await chatManager.chat(provider, topic);
  console.log(`AI: ${response}`);
}

// Test context retention after trimming
console.log('\nUser: What was the first question I asked?');
const finalResponse = await chatManager.chat(provider, 'What was the first question I asked?');
console.log(`AI: ${finalResponse}`);
```

## Structured Conversation Patterns

Build conversations with specific patterns and purposes:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Interview-style conversation
class InterviewBot {
  private messages: any[] = [];
  private currentStep = 0;
  private answers: Record<string, string> = {};

  private questions = [
    'What programming language do you use most often?',
    'How many years of experience do you have?',
    'What type of projects do you enjoy working on?',
    'What are your career goals?',
    'Any questions about our company?',
  ];

  constructor() {
    this.messages = conversation()
      .system(
        'You are conducting a friendly technical interview. Ask questions one at a time and show interest in the answers.'
      )
      .build();
  }

  async start(provider: any) {
    const greeting = "Hi! I'm excited to chat with you today. Let's start with some questions.";
    this.messages.push(assistantText(greeting));
    console.log('AI:', greeting);

    return this.askNextQuestion(provider);
  }

  async askNextQuestion(provider: any) {
    if (this.currentStep >= this.questions.length) {
      return this.conclude(provider);
    }

    const question = this.questions[this.currentStep];
    this.messages.push(assistantText(question));
    console.log('\nAI:', question);

    return { question, stepComplete: false };
  }

  async handleAnswer(provider: any, answer: string) {
    this.messages.push(userText(answer));
    this.answers[`question_${this.currentStep}`] = answer;

    // Generate a contextual follow-up comment
    this.messages.push(userText(`My answer: ${answer}`));
    const response = await provider.generate(
      [...this.messages, assistantText("Great! That's helpful to know.")],
      { model: 'gpt-4o', maxTokens: 100 }
    );

    console.log('AI:', response.content);
    this.messages.push(assistantText(response.content));

    this.currentStep++;
    return this.askNextQuestion(provider);
  }

  async conclude(provider: any) {
    const summary = `Thanks for the interview! Based on our conversation, I learned that you primarily use ${this.answers.question_0}, have ${this.answers.question_1} of experience, and enjoy ${this.answers.question_2}.`;

    this.messages.push(assistantText(summary));
    console.log('\nAI:', summary);

    return { summary: this.answers, complete: true };
  }
}

// Run the interview
const interview = new InterviewBot();
await interview.start(provider);

// Simulate user responses (in a real app, these would come from user input)
await interview.handleAnswer(provider, 'I mainly use TypeScript and Python');
await interview.handleAnswer(provider, 'About 5 years');
await interview.handleAnswer(provider, 'I love building web applications and APIs');
await interview.handleAnswer(
  provider,
  'I want to become a senior developer and eventually lead a team'
);
await interview.handleAnswer(provider, 'What technologies does your team use?');
```

## Conversation with Context Switching

Handle multiple conversation threads or topics:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

class MultiTopicChat {
  private conversations: Map<string, any[]> = new Map();
  private currentTopic = 'general';

  constructor() {
    this.createTopic('general', 'You are a helpful general assistant.');
  }

  createTopic(topicId: string, systemPrompt: string) {
    const messages = conversation().system(systemPrompt).build();
    this.conversations.set(topicId, messages);
  }

  switchTopic(topicId: string) {
    if (!this.conversations.has(topicId)) {
      throw new Error(`Topic ${topicId} not found`);
    }
    this.currentTopic = topicId;
    console.log(`[Switched to topic: ${topicId}]`);
  }

  async chat(provider: any, message: string, topicId?: string) {
    const topic = topicId || this.currentTopic;
    const messages = this.conversations.get(topic)!;

    messages.push(userText(message));

    const response = await provider.generate(messages, {
      model: 'gpt-4o',
      maxTokens: 200,
    });

    messages.push(assistantText(response.content));
    return response.content;
  }

  listTopics() {
    return Array.from(this.conversations.keys());
  }
}

// Set up multiple conversation topics
const multiChat = new MultiTopicChat();
multiChat.createTopic(
  'coding',
  'You are a coding mentor. Help with programming questions and provide code examples.'
);
multiChat.createTopic(
  'cooking',
  'You are a chef assistant. Help with recipes and cooking techniques.'
);

// Chat about coding
multiChat.switchTopic('coding');
console.log('User: How do I implement a binary search?');
let response = await multiChat.chat(provider, 'How do I implement a binary search?');
console.log('AI:', response);

// Switch to cooking
multiChat.switchTopic('cooking');
console.log('\nUser: How do I make a perfect risotto?');
response = await multiChat.chat(provider, 'How do I make a perfect risotto?');
console.log('AI:', response);

// Continue cooking conversation
console.log('\nUser: What type of rice should I use?');
response = await multiChat.chat(provider, 'What type of rice should I use?');
console.log('AI:', response);

// Switch back to coding - context preserved
multiChat.switchTopic('coding');
console.log('\nUser: Can you show me the binary search code?');
response = await multiChat.chat(provider, 'Can you show me the binary search code?');
console.log('AI:', response);
```

## Conversation with Personality

Give your AI consistent personality traits across conversations:

```typescript
import { createProvider, conversation, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

class PersonalityBot {
  private messages: any[] = [];
  private personality: string;
  private traits: string[];

  constructor(personality: string, traits: string[]) {
    this.personality = personality;
    this.traits = traits;

    const systemPrompt = `You are ${personality}. Your key traits: ${traits.join(', ')}. 
    Maintain these characteristics consistently throughout our conversation while being helpful and engaging.
    Never break character or mention that you are an AI.`;

    this.messages = conversation().system(systemPrompt).build();
  }

  async chat(provider: any, message: string) {
    this.messages.push(userText(message));

    const response = await provider.generate(this.messages, {
      model: 'gpt-4o',
      maxTokens: 200,
      temperature: 0.8, // Higher temperature for more personality
    });

    this.messages.push(assistantText(response.content));
    return response.content;
  }
}

// Create different personality bots
const cheerfulBot = new PersonalityBot('an enthusiastic and optimistic tech mentor', [
  'always positive',
  'uses lots of exclamation points',
  'loves sharing knowledge',
  'encouraging',
]);

const sarcasticBot = new PersonalityBot('a witty and slightly sarcastic senior developer', [
  'dry humor',
  'skeptical of new trends',
  'speaks from experience',
  'direct but helpful',
]);

// Chat with the cheerful bot
console.log('=== Cheerful Bot ===');
console.log("User: I'm struggling with JavaScript promises.");
let response = await cheerfulBot.chat(provider, "I'm struggling with JavaScript promises.");
console.log('AI:', response);

console.log('\nUser: This is really hard...');
response = await cheerfulBot.chat(provider, 'This is really hard...');
console.log('AI:', response);

// Chat with the sarcastic bot
console.log('\n=== Sarcastic Bot ===');
console.log("User: I'm struggling with JavaScript promises.");
response = await sarcasticBot.chat(provider, "I'm struggling with JavaScript promises.");
console.log('AI:', response);

console.log('\nUser: Should I learn the latest JavaScript framework?');
response = await sarcasticBot.chat(provider, 'Should I learn the latest JavaScript framework?');
console.log('AI:', response);
```

## Best Practices

1. **Start with clear context** - Use system messages to set expectations
2. **Manage conversation length** - Trim old messages when approaching limits
3. **Preserve important context** - Keep system messages and key information
4. **Handle context switching gracefully** - Clear transitions between topics
5. **Maintain consistency** - Keep personality and context coherent
6. **Plan for interruptions** - Handle conversation breaks and resumptions

## Common Patterns

### Conversation State Persistence

```typescript
class PersistentChat {
  async saveConversation(conversationId: string, messages: any[]) {
    // Save to database, file, or localStorage
    localStorage.setItem(`chat_${conversationId}`, JSON.stringify(messages));
  }

  async loadConversation(conversationId: string): Promise<any[]> {
    const saved = localStorage.getItem(`chat_${conversationId}`);
    return saved ? JSON.parse(saved) : [];
  }
}
```

### Context Summarization

```typescript
async function summarizeContext(provider: any, messages: any[]) {
  const summaryPrompt = [
    userText(
      'Please summarize the key points from this conversation:\n' +
        messages.map(m => `${m.role}: ${m.content}`).join('\n')
    ),
  ];

  const summary = await provider.generate(summaryPrompt, {
    model: 'gpt-4o',
    maxTokens: 200,
  });

  return summary.content;
}
```

### Conversation Analytics

```typescript
class ConversationAnalytics {
  analyzeConversation(messages: any[]) {
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length,
      averageMessageLength:
        messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length,
      topics: this.extractTopics(messages),
    };
  }

  private extractTopics(messages: any[]) {
    // Simple topic extraction logic
    const allText = messages
      .map(m => m.content)
      .join(' ')
      .toLowerCase();
    const keywords = ['javascript', 'python', 'react', 'api', 'database'];
    return keywords.filter(keyword => allText.includes(keyword));
  }
}
```

## What's Next?

- [Streaming Guide](./streaming.md) - Stream conversations in real-time
- [Tools Guide](./tools.md) - Add function calling to conversations
- [Multimodal Guide](./multimodal.md) - Include images in conversations
- [API Reference](/api/generated/README) - Technical details on message types

Remember: Great conversations are like jazz—they have structure but room for improvisation. Plan your flow, but let the AI surprise you with its responses!
