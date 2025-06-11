import { AnthropicProvider } from '../src/providers/anthropic';
import type { Message, GenerationOptions } from '../src/types';

async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Please set ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize Anthropic provider
  const provider = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Create messages
  const messages: Message[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: 'You are Claude, an AI assistant created by Anthropic.' }],
    },
    {
      role: 'user',
      content: [{ type: 'text', text: 'Explain quantum computing in simple terms.' }],
    },
  ];

  // Generation options
  const options: GenerationOptions = {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 200,
    temperature: 0.7,
  };

  console.log('🧠 Anthropic Claude Response:');
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
