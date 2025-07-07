/**
 * Audio Handling with AIKit
 *
 * This example demonstrates working with audio content in AI:
 * 1. Single audio analysis with helper functions
 * 2. Manual content creation with audio
 * 3. Multiple audio processing
 * 4. Audio in sequential analysis
 * 5. Audio format handling and best practices
 */

import {
  userAudio,
  userMultipleAudio,
  userContent,
  audioContent,
  textContent,
  systemText,
  collectStream,
} from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createProviderFromEnv } from './utils';

// Helper function to create sample audio data (Base64 encoded audio)
function createSampleAudio(type: 'speech' | 'music' | 'nature'): string {
  // In a real app, you would load actual audio files and convert them to base64
  // This is just a placeholder for demonstration
  const audioMap = {
    speech: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', // Minimal WAV header
    music:
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//OEZAAAAXpBbCqCyEQABJgjAgDBUAAAHwAAA9gAAAAFDBEjRamFghBAkOWToQUiwTEgCUYoFhgwaHgQaFeHJWIegYKAgRSIkmOBQKVsMLdxPt42MU8fLTPIWMJTLq2v3H2xq5hEjZe5x9cHoINmgKOFhYKCwkLhwkJaY4YcEhKQ1xYaGMjKBIh1A=',
    nature: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  };
  return audioMap[type];
}

async function step1_SingleAudioAnalysis() {
  printSectionHeader('Single Audio Analysis');

  const { provider, type } = createProviderFromEnv();

  // Only proceed if we have OpenAI provider since it has the best audio support
  if (type !== 'openai') {
    console.log('This example requires OpenAI provider for audio support.\n');
    return;
  }

  const sampleAudio = createSampleAudio('speech');

  const message = userAudio(
    'What do you hear in this audio? Please transcribe and analyze it.',
    sampleAudio,
    'wav'
  );

  try {
    const result = await collectStream(
      provider([message], {
        model: getModelName(type!),
        maxOutputTokens: 200,
        temperature: 0.5,
      })
    );

    console.log('Single audio analysis:');
    console.log(result.content + '\n');
  } catch {
    console.log('Audio analysis may not be supported by this model version.');
    console.log('Try with a model like gpt-4o-audio-preview or similar.\n');
  }
}

async function step2_ManualAudioContentCreation() {
  printSectionHeader('Manual Audio Content Creation');

  const { provider, type } = createProviderFromEnv();

  if (type !== 'openai') {
    console.log('This example requires OpenAI provider for audio support.\n');
    return;
  }

  const sampleAudio = createSampleAudio('music');

  // Method 1: Building content step by step
  const detailedMessage = userContent([
    textContent('Please analyze this audio file. What genre of music is this?'),
    audioContent(sampleAudio, 'mp3'),
  ]);

  // Method 2: Using userAudio helper (simpler)
  const simpleMessage = userAudio('What genre of music is this?', sampleAudio, 'mp3');

  try {
    const detailedResult = await collectStream(
      provider([detailedMessage], {
        model: getModelName(type!),
        maxOutputTokens: 150,
        temperature: 0.1,
      })
    );

    const simpleResult = await collectStream(
      provider([simpleMessage], {
        model: getModelName(type!),
        maxOutputTokens: 150,
        temperature: 0.1,
      })
    );

    console.log('Method 1 (step by step):');
    console.log(detailedResult.content + '\n');

    console.log('Method 2 (simple helper):');
    console.log(simpleResult.content + '\n');
  } catch {
    console.log('Audio analysis may not be supported by this model version.\n');
  }
}

async function step3_MultipleAudioAnalysis() {
  printSectionHeader('Multiple Audio Analysis');

  const { provider, type } = createProviderFromEnv();

  if (type !== 'openai') {
    console.log('This example requires OpenAI provider for audio support.\n');
    return;
  }

  const speechAudio = createSampleAudio('speech');
  const musicAudio = createSampleAudio('music');
  const natureAudio = createSampleAudio('nature');

  const message = userMultipleAudio(
    'Compare these three audio files. What are the differences between them? Categorize each one.',
    [
      { audio: speechAudio, format: 'wav' },
      { audio: musicAudio, format: 'mp3' },
      { audio: natureAudio, format: 'wav' },
    ]
  );

  try {
    const result = await collectStream(
      provider([message], {
        model: getModelName(type!),
        maxOutputTokens: 300,
        temperature: 0.4,
      })
    );

    console.log('Multiple audio comparison:');
    console.log(result.content + '\n');
  } catch {
    console.log('Multiple audio analysis may not be supported by this model version.\n');
  }
}

async function step4_AudioInSequentialAnalysis() {
  printSectionHeader('Audio in Sequential Analysis');

  const { provider, type } = createProviderFromEnv();

  if (type !== 'openai') {
    console.log('This example requires OpenAI provider for audio support.\n');
    return;
  }

  const sampleAudio = createSampleAudio('speech');

  const messages = [
    systemText('You are a helpful audio analysis assistant. Be specific about what you hear.'),
    userAudio('What do you hear in this audio?', sampleAudio, 'wav'),
  ];

  try {
    const response1 = await collectStream(
      provider(messages, {
        model: getModelName(type!),
        maxOutputTokens: 150,
        temperature: 0.3,
      })
    );

    console.log('Question: What do you hear in this audio?');
    console.log(response1.content + '\n');

    // Continue with follow-up analysis
    const followUpMessages = [
      systemText('You are a helpful audio analysis assistant. Be specific about what you hear.'),
      userAudio('Can you identify any specific words or sounds in this audio?', sampleAudio, 'wav'),
    ];

    const response2 = await collectStream(
      provider(followUpMessages, {
        model: getModelName(type!),
        maxOutputTokens: 200,
        temperature: 0.5,
      })
    );

    console.log('Question: Can you identify any specific words or sounds?');
    console.log(response2.content + '\n');
  } catch {
    console.log('Audio analysis may not be supported by this model version.\n');
  }
}

async function step5_AudioFormatHandling() {
  printSectionHeader('Audio Format Handling');

  console.log('Audio format best practices:');
  console.log('1. Supported formats: WAV, MP3, WebM, OGG, M4A');
  console.log('2. Always provide format hint when possible');
  console.log('3. Base64 encode your audio data');
  console.log('4. Use data URLs for web compatibility');
  console.log('5. Consider compression for large audio files\n');

  // Example of loading audio from file (pseudo-code)
  console.log('Example of loading audio from file:');
  console.log(`
// Load audio file and convert to base64
function loadAudioAsBase64(filePath: string): string {
  const audioBuffer = readFileSync(filePath);
  const base64 = audioBuffer.toString('base64');
  
  // Detect format from file extension
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeType = {
    mp3: 'audio/mp3',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  }[extension || 'wav'] || 'audio/wav';
  
  return \`data:\${mimeType};base64,\${base64}\`;
}

// Use the audio
const audioData = loadAudioAsBase64('./recording.mp3');
const message = userAudio('Transcribe this audio', audioData, 'mp3');
`);
}

async function main() {
  printDelimiter('Audio Handling Examples');

  try {
    await step1_SingleAudioAnalysis();
    await step2_ManualAudioContentCreation();
    await step3_MultipleAudioAnalysis();
    await step4_AudioInSequentialAnalysis();
    await step5_AudioFormatHandling();

    printDelimiter('Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
