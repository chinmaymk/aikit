/**
 * Streaming Responses with AIKit
 *
 * This example demonstrates real-time streaming responses:
 * 1. Basic streaming with printStream
 * 2. Custom stream handlers for progress tracking
 * 3. Collecting all deltas before processing
 * 4. Comparing streaming vs non-streaming approaches
 */

import { getAvailableProvider } from '../src/factory';
import {
  userText,
  systemText,
  conversation,
  processStream,
  collectDeltas,
  printStream,
} from '../src/utils';
import { getModelName, printDelimiter, printSectionHeader } from './utils';

async function step1_BasicStreaming() {
  printSectionHeader('Basic Streaming');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

  const messages = [
    systemText('You are a creative storyteller. Write engaging, concise stories.'),
    userText('Write a short story about a robot learning to paint. Keep it under 150 words.'),
  ];

  const stream = provider.generate(messages, {
    model: getModelName(type!),
    maxTokens: 200,
    temperature: 0.8,
  });

  console.log('Basic streaming (real-time output):');
  const result = await printStream(stream);
  console.log(`\nCompleted: ${result.finishReason}\n`);
}

async function step2_CustomStreamHandlers() {
  printSectionHeader('Custom Stream Handlers');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const messages = [userText('Explain how photosynthesis works in simple terms, step by step.')];
  let wordCount = 0;
  let chunkCount = 0;

  const stream = provider.generate(messages, {
    model: getModelName(type!),
    maxTokens: 300,
    temperature: 0.3,
  });

  console.log('Custom stream processing:');
  const result = await processStream(stream, {
    onDelta: delta => {
      wordCount += delta.split(/\s+/).filter(word => word.length > 0).length;
      process.stdout.write(delta);
    },
    onChunk: () => {
      chunkCount++;
      if (chunkCount % 10 === 0) {
        process.stdout.write(`\n[${wordCount} words so far]\n`);
      }
    },
    onFinish: finishReason => {
      console.log(`\nCompleted: ${finishReason} (${wordCount} words, ${chunkCount} chunks)`);
    },
  });

  console.log(`Total length: ${result.content.length} characters\n`);
}

async function step3_CollectingDeltas() {
  printSectionHeader('Collecting Complete Responses');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const messages = conversation()
    .system('You are a senior software engineer. Provide practical, actionable advice.')
    .user('List 5 programming best practices with brief explanations.')
    .build();

  const stream = provider.generate(messages, {
    model: getModelName(type!),
    maxTokens: 250,
    temperature: 0.4,
  });

  console.log('Collecting complete response...');
  const result = await collectDeltas(stream);

  console.log('Complete response:');
  console.log(result.content);
  console.log(`Collected: ${result.content.length} characters\n`);
}

async function step4_StreamingComparison() {
  printSectionHeader('Streaming vs Non-Streaming Comparison');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const messages = [userText('Write a haiku about programming.')];

  console.log('Streaming approach:');
  const streamStart = Date.now();

  const stream = provider.generate(messages, {
    model: getModelName(type!),
    maxTokens: 100,
    temperature: 0.7,
  });

  await printStream(stream);
  const streamTime = Date.now() - streamStart;
  console.log(`Time: ${streamTime}ms\n`);

  console.log('Collect-all approach:');
  const collectStart = Date.now();

  const collectStream = provider.generate(messages, {
    model: getModelName(type!),
    maxTokens: 100,
    temperature: 0.7,
  });

  const collectResult = await collectDeltas(collectStream);
  const collectTime = Date.now() - collectStart;

  console.log(collectResult.content);
  console.log(`Time: ${collectTime}ms\n`);
}

async function main() {
  printDelimiter('Streaming Responses with AIKit');

  try {
    await step1_BasicStreaming();
    await step2_CustomStreamHandlers();
    await step3_CollectingDeltas();
    await step4_StreamingComparison();

    printDelimiter('Streaming Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
