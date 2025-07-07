/**
 * Getting Started with AIKit
 *
 * This example progressively introduces AIKit concepts:
 * 1. Simple text generation
 * 2. Configuration options
 * 3. System messages for behavior control
 * 4. Multiple provider comparison
 */

import { userText, systemText, collectStream } from '@chinmaymk/aikit';
import { getModelName, printDelimiter, createProviderFromEnv } from './utils';

async function main() {
  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);
  console.log(`Using provider: ${type} (${modelName})`);
  printDelimiter('Provider Response');

  // A simple chat session
  const messages = [
    systemText('You are a helpful assistant that provides concise and accurate information.'),
    userText('What are the top 3 benefits of using a language model?'),
  ];

  const result = await collectStream(
    provider(messages, {
      model: modelName,
      maxOutputTokens: 200,
      temperature: 0.5,
    })
  );

  console.log(result.content);
}

main().catch(console.error);
