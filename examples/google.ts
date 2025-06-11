import { GoogleGeminiProvider } from '../src/providers/google';
import type { Message, GenerationOptions } from '../src/types';

async function main() {
  // Check for API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('Please set GOOGLE_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize Google Gemini provider
  const provider = new GoogleGeminiProvider({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // Create messages
  const messages: Message[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Write a haiku about a rusty robot.',
        },
      ],
    },
  ];

  // Generation options
  const options: GenerationOptions = {
    model: 'gemini-1.5-pro-latest',
    maxTokens: 1024,
    temperature: 0,
  };

  console.log('💎 Google Gemini Response:');
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
