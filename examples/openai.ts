import { OpenAIProvider } from '../src/providers/openai';
import type { Message, GenerationOptions } from '../src/types';

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize OpenAI provider
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Create messages
  const messages: Message[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: 'You are a helpful assistant.' }],
    },
    {
      role: 'user',
      content: [{ type: 'text', text: 'Write a haiku about artificial intelligence.' }],
    },
  ];

  // Generation options
  const options: GenerationOptions = {
    model: 'gpt-4o',
    maxTokens: 100,
    temperature: 0.7,
  };

  console.log('🤖 OpenAI GPT-4o Response:');
  console.log('---');

  // Stream the response
  for await (const chunk of provider.generate(messages, options)) {
    process.stdout.write(chunk.delta);

    if (chunk.finishReason) {
      console.log(`\n---\nFinish reason: ${chunk.finishReason}`);
    }
  }
}

main().catch(console.error);
