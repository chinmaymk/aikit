/**
 * Content Accumulation with AIKit
 *
 * Demonstrates collectStream vs collectDeltas and content accumulation behavior.
 */

import {
  getAvailableProvider,
  userText,
  collectDeltas,
  collectStream,
  processStream,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader } from './utils';

async function step1_BasicContentAccumulation() {
  printSectionHeader('Basic Content Accumulation');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

  const messages = [userText('Say "Hello World" and explain what it means in one sentence.')];

  const stream = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.3,
  });

  console.log('Demonstrating content accumulation:');
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    console.log(`Chunk ${chunkCount}:`);
    console.log(`  Delta: "${chunk.delta}"`);
    console.log(`  Content: "${chunk.content}"`);
    console.log(`  Content Length: ${chunk.content.length}`);
    console.log();

    if (chunk.finishReason) {
      console.log(`Stream finished: ${chunk.finishReason}\n`);
      break;
    }
  }
}

async function step2_CollectDeltasVsCollectStream() {
  printSectionHeader('collectDeltas vs collectStream');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const messages = [userText('Count from 1 to 5.')];

  // Test with collectDeltas
  console.log('Using collectDeltas:');
  const stream1 = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 50,
    temperature: 0.1,
  });

  const resultDeltas = await collectDeltas(stream1);
  console.log(`Result: "${resultDeltas.content}"`);
  console.log(`Length: ${resultDeltas.content.length} characters\n`);

  // Test with collectStream  
  console.log('Using collectStream:');
  const stream2 = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 50,
    temperature: 0.1,
  });

  const resultStream = await collectStream(stream2);
  console.log(`Result: "${resultStream.content}"`);
  console.log(`Length: ${resultStream.content.length} characters\n`);

  console.log('Note: Both functions should give identical results for properly');
  console.log('implemented providers, but collectStream is more reliable as it');
  console.log('uses the provider\'s own content accumulation.\n');
}

async function step3_ReasoningAccumulation() {
  printSectionHeader('Reasoning Content Accumulation (OpenAI o1 models only)');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  // Only test reasoning with OpenAI o1 models
  if (type !== 'openai') {
    console.log('Reasoning is only supported with OpenAI o1 models.');
    console.log('Set OPENAI_API_KEY to test reasoning accumulation.\n');
    return;
  }

  const messages = [
    userText('Solve this step by step: What is 15 × 23? Show your reasoning.'),
  ];

  console.log('Testing reasoning accumulation with o1 model:');
  
  try {
    const stream = provider(messages, {
      model: 'o1-mini', // Use o1 model for reasoning
      maxOutputTokens: 200,
    });

    let hasReasoning = false;
    const result = await processStream(stream, {
      onReasoning: (reasoning) => {
        hasReasoning = true;
        console.log(`Reasoning update (${reasoning.content.length} chars):`);
        console.log(`  Delta: "${reasoning.delta}"`);
        const preview = reasoning.content.length > 100 
          ? reasoning.content.substring(0, 100) + '...'
          : reasoning.content;
        console.log(`  Full content: "${preview}"`);
        console.log();
      },
      onDelta: (delta) => {
        process.stdout.write(`Content: ${delta}`);
      },
    });

    console.log('\n');
    if (hasReasoning) {
      console.log('Final reasoning length:', result.reasoning?.length || 0, 'characters');
    } else {
      console.log('No reasoning content detected. This might be because:');
      console.log('1. The model doesn\'t support reasoning');
      console.log('2. Reasoning is not included in the response');
      console.log('3. The request didn\'t trigger reasoning mode');
    }
    console.log();
  } catch (error: any) {
    console.log('Error testing reasoning:', error.message);
    console.log('This is expected if using a non-o1 model.\n');
  }
}

async function step4_StreamProcessingPatterns() {
  printSectionHeader('Different Stream Processing Patterns');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const messages = [userText('Write a haiku about programming.')];

  console.log('Pattern 1: Manual iteration');
  const stream1 = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.7,
  });

  let manualContent = '';
  for await (const chunk of stream1) {
    manualContent = chunk.content; // Use accumulated content
    process.stdout.write(chunk.delta);
    if (chunk.finishReason) break;
  }
  console.log(`\nFinal content length: ${manualContent.length}\n`);

  console.log('Pattern 2: collectStream');
  const stream2 = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.7,
  });

  const result = await collectStream(stream2);
  console.log(result.content);
  console.log(`Final content length: ${result.content.length}\n`);

  console.log('Pattern 3: processStream with handlers');
  const stream3 = provider(messages, {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.7,
  });

  let finalContent = '';
  await processStream(stream3, {
    onContent: (content) => {
      finalContent = content; // Track accumulated content
    },
    onDelta: (delta) => {
      process.stdout.write(delta);
    },
  });
  console.log(`\nFinal content length: ${finalContent.length}\n`);
}

async function main() {
  printDelimiter('Content Accumulation Examples with AIKit');

  try {
    await step1_BasicContentAccumulation();
    await step2_CollectDeltasVsCollectStream();
    await step3_ReasoningAccumulation();
    await step4_StreamProcessingPatterns();

    printDelimiter('Content Accumulation Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}

export { main }; 