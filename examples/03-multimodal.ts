/**
 * Multimodal AI with Images
 *
 * This example demonstrates working with images in AI conversations:
 * 1. Single image analysis with helper functions
 * 2. Manual content creation (with and without helpers)
 * 3. Multiple image comparison
 * 4. Images in conversation flows
 * 5. Best practices and tips
 */

import {
  getAvailableProvider,
  userText,
  userImage,
  userMultipleImages,
  userContent,
  imageContent,
  textContent,
  generate,
  conversation,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createValidSampleImage } from './utils';

async function step1_SingleImageAnalysis() {
  printSectionHeader('Single Image Analysis');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

  const sampleImage = createValidSampleImage('yellow');

  const message = userImage('What do you see in this image? Describe it briefly.', sampleImage);

  const result = await generate(provider!, [message], {
    model: getModelName(type!),
    maxOutputTokens: 150,
    temperature: 0.3,
  });

  console.log('Single image analysis:');
  console.log(result.content + '\n');
}

async function step2_ManualContentCreation() {
  printSectionHeader('Manual Content Creation');

  const { provider, type } = getAvailableProvider();
  if (!provider) throw new Error('No API keys found, configure it manually');

  const sampleImage = createValidSampleImage('blue');

  // Method 1: Building content step by step
  const detailedMessage = userContent([
    textContent('What color is this image? Be specific.'),
    imageContent(sampleImage),
  ]);

  const detailedResult = await generate(provider!, [detailedMessage], {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.1,
  });

  // Method 2: Using userImage helper (simpler)
  const simpleMessage = userImage('What color is this image? Be specific.', sampleImage);

  const simpleResult = await generate(provider!, [simpleMessage], {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.1,
  });

  console.log('Method 1 (step by step):');
  console.log(detailedResult.content + '\n');

  console.log('Method 2 (simple helper):');
  console.log(simpleResult.content + '\n');
}

async function step3_MultipleImages() {
  printSectionHeader('Multiple Images Comparison');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const redImage = createValidSampleImage('red');
  const blueImage = createValidSampleImage('blue');
  const greenImage = createValidSampleImage('green');

  const message = userMultipleImages(
    'Compare these three images. What are the main differences between them?',
    [redImage, blueImage, greenImage]
  );

  const result = await generate(provider!, [message], {
    model: getModelName(type!),
    maxOutputTokens: 200,
    temperature: 0.4,
  });

  console.log('Multiple image comparison:');
  console.log(result.content + '\n');
}

async function step4_ImagesInConversation() {
  printSectionHeader('Images in Conversation Flow');

  const { provider, type } = getAvailableProvider();
  if (!provider) return;

  const sampleImage = createValidSampleImage('blue');

  const messages = conversation().system('You are a helpful visual analysis assistant.').build();

  messages.push(userImage('What do you see in this image?', sampleImage));

  const response1 = await generate(provider!, messages, {
    model: getModelName(type!),
    maxOutputTokens: 100,
    temperature: 0.3,
  });

  console.log('Question: What do you see in this image?');
  console.log(response1.content + '\n');

  // Continue conversation
  messages.push({ role: 'assistant', content: [textContent(response1.content)] });
  messages.push(userText('What emotions might this color evoke in people?'));

  const response2 = await generate(provider!, messages, {
    model: getModelName(type!),
    maxOutputTokens: 150,
    temperature: 0.5,
  });

  console.log('Question: What emotions might this color evoke?');
  console.log(response2.content + '\n');
}

async function main() {
  printDelimiter('Multimodal AI Examples');

  try {
    await step1_SingleImageAnalysis();
    await step2_ManualContentCreation();
    await step3_MultipleImages();
    await step4_ImagesInConversation();

    printDelimiter('Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
