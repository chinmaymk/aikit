# Multimodal AI with Images and Audio

Modern AI models can see and understand images and hear and analyze audio just like humans do. Images contain visual information that's difficult to describe in words—a chart, photo, or diagram can be worth more than a thousand words. Audio captures spoken words, music, environmental sounds, and emotional nuances that text cannot convey.

AIKit makes it easy to combine text, images, and audio in your conversations. Turn your AI into an art critic, diagram analyzer, photo detective, audio transcriber, or music analyst.

## Image Format Requirements

AIKit accepts images as base64-encoded data URLs:

```typescript
// Supported formats: JPEG, PNG, GIF, WebP
const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
```

## Simple Image Analysis

The easiest way to add vision to your AI conversations:

```typescript
import { createProvider, userImage } from '@chinmaymk/aikit';

// Create provider
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple helper for text + image
const message = userImage(
  'What do you see in this image?',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // Your base64 image
);

// Generate response
const result = await provider([message], {
  model: 'gpt-4o',
});

console.log(result.content);
```

> **💡 Helper Functions are Optional**  
> The `userImage()` helper is just for convenience. You can construct multimodal messages manually:
>
> ```typescript
> // Using helper (recommended)
> const message = userImage('What is this?', imageData);
>
> // Manual construction (also valid)
> const message = {
>   role: 'user',
>   content: [
>     { type: 'text', text: 'What is this?' },
>     { type: 'image', image: imageData },
>   ],
> };
> ```

## Manual Content Creation

For more control, build content manually using helper functions:

```typescript
import { createProvider, userContent, textContent, imageContent } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';

// Build content piece by piece
const message = userContent([
  textContent('Analyze this chart and tell me:'),
  textContent('1. What does it show?'),
  textContent('2. What trends do you notice?'),
  textContent('3. Any concerns or insights?'),
  imageContent(imageData),
]);

const result = await provider([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Multiple Images Comparison

Compare several images at once—perfect for before/after shots, A/B testing, or style analysis.

```typescript
import { createProvider, userMultipleImages } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const beforeImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const afterImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const referenceImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';

const message = userMultipleImages(
  'Compare these three images. What are the main differences? Which one looks best and why?',
  [beforeImage, afterImage, referenceImage]
);

const result = await provider([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Images in Conversations

Keep images in context throughout a conversation. The AI remembers what it saw.

```typescript
import { createProvider, conversation, userImage, userText, assistantText } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';

// Start with system context
const messages = conversation()
  .system('You are a helpful visual analysis assistant. Be specific and detailed.')
  .build();

// First question with image
messages.push(userImage('What do you see in this image?', imageData));

const response1 = await provider(messages, { model: 'gpt-4o', maxOutputTokens: 200 });
console.log('AI:', response1.content);

// Continue conversation - AI remembers the image
messages.push(assistantText(response1.content));
messages.push(userText('What emotions might this evoke in viewers?'));

const response2 = await provider(messages, { model: 'gpt-4o', maxOutputTokens: 150 });
console.log('AI:', response2.content);

// Ask about specific details
messages.push(assistantText(response2.content));
messages.push(userText('Can you identify any text or numbers in the image?'));

const response3 = await provider(messages, { model: 'gpt-4o', maxOutputTokens: 100 });
console.log('AI:', response3.content);
```

## Reading Images from Files

Here's how to load images from your file system:

```typescript
import { createProvider, userImage } from '@chinmaymk/aikit';
import { readFileSync } from 'node:fs';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Load image file and convert to base64
function loadImageAsBase64(filePath: string): string {
  const imageBuffer = readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');

  // Detect MIME type from file extension
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeType =
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }[extension || 'jpeg'] || 'image/jpeg';

  return `data:${mimeType};base64,${base64}`;
}

// Use the image
const imageData = loadImageAsBase64('./screenshot.png');
const message = userImage('What does this screenshot show?', imageData);

const result = await provider([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Streaming with Images

Images work perfectly with streaming responses too:

```typescript
import { createProvider, userImage, printStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const message = userImage(
  "Describe this image in vivid detail, like you're writing a novel.",
  imageData
);

console.log('Streaming detailed description:');
await printStream(
  provider([message], {
    model: 'gpt-4o',
    maxOutputTokens: 500,
    temperature: 0.8,
  })
);
```

## Working with Different Providers

Each provider has slightly different image capabilities:

```typescript
import { createProvider, userImage } from '@chinmaymk/aikit';

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const question = 'What programming language is shown in this code screenshot?';

// OpenAI - excellent at text recognition
const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const openaiResult = await openai.generate([userImage(question, imageData)], { model: 'gpt-4o' });

// Anthropic - great at detailed analysis
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });
const anthropicResult = await anthropic.generate([userImage(question, imageData)], {
  model: 'claude-3-5-sonnet-20241022',
});

// Google - strong at visual understanding
const google = createProvider('google', { apiKey: process.env.GOOGLE_API_KEY! });
const googleResult = await google.generate([userImage(question, imageData)], {
  model: 'gemini-1.5-pro',
});

console.log('OpenAI:', openaiResult.content);
console.log('Anthropic:', anthropicResult.content);
console.log('Google:', googleResult.content);
```

## Error Handling

Images can fail for various reasons. Handle them gracefully:

```typescript
import { createProvider, userImage } from '@chinmaymk/aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

try {
  const message = userImage('What is this?', invalidImageData);
  const result = await provider([message], { model: 'gpt-4o' });
  console.log(result.content);
} catch (error) {
  if (error.message.includes('invalid image')) {
    console.error('Image format not supported or corrupted');
  } else if (error.message.includes('too large')) {
    console.error('Image file too large - try compressing it');
  } else if (error.message.includes('content policy')) {
    console.error('Image violates content policy');
  } else {
    console.error('Image processing error:', error.message);
  }
}
```

## Best Practices

1. **Optimize image size** - Larger images cost more and process slower
2. **Use appropriate resolution** - High-res for detailed analysis, lower for general questions
3. **Provide context** - Tell the AI what to look for
4. **Test with different providers** - Each has strengths in different areas
5. **Handle failures gracefully** - Images can be corrupted or unsupported

## Performance Tips

```typescript
// Good: Specific, focused questions
const goodMessage = userImage('What is the error message in this screenshot?', imageData);

// Better: Multiple targeted questions
const betterMessage = userImage(
  'Looking at this error screenshot: 1) What is the exact error message? 2) Which line caused it? 3) What might fix it?',
  imageData
);

// Best: Context + specific questions
const bestMessage = userImage(
  'This is a Node.js application error. Please: 1) Identify the exact error message 2) Explain what caused it 3) Suggest a specific fix',
  imageData
);
```

## What's Next?

- [Tools Guide](./tools.md) - Combine images with function calling
- [Conversations Guide](./conversations.md) - Manage context with images
- [API Reference](/api/generated/README) - Technical details on image content types

Remember: A picture is worth a thousand tokens, but a good question is worth ten thousand. Be specific about what you want the AI to see and analyze!

## Supported Models

Not all models support images. Here are vision-capable models (but AIKit doesn't restrict which models you can use—try any model string the provider accepts):

**OpenAI**

- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4`

**Anthropic**

- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `claude-3-7-sonnet-20250219`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

**Google**

- `gemini-2.5-pro-preview-06-05`
- `gemini-2.5-flash-preview-05-20`
- `gemini-2.0-flash`
- `gemini-2.0-flash-001`
- `gemini-1.5-pro`
- `gemini-1.5-pro-002`
- `gemini-1.5-flash`
- `gemini-1.5-flash-002`
- `gemini-pro-vision`

_AIKit includes a reference list of available models in the library, but you can use any model string that the provider API accepts, including new releases and beta models._

---

# Audio AI Processing

Modern AI models can hear and understand audio content, providing capabilities like transcription, analysis, music identification, and audio content generation. AIKit makes it simple to work with audio files in your AI conversations.

## Audio Format Requirements

AIKit accepts audio as base64-encoded data URLs:

```typescript
// Supported formats: WAV, MP3, WebM, OGG, M4A
const audioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
```

## Simple Audio Analysis

The easiest way to add audio processing to your AI conversations:

```typescript
import { createOpenAI, userAudio } from '@chinmaymk/aikit';

// Create OpenAI provider (best audio support)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple helper for text + audio
const message = userAudio(
  'Please transcribe this audio and tell me what you hear.',
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...', // Your base64 audio
  'wav' // Optional format hint
);

// Generate response
const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview', // Use an audio-capable model
});

console.log(result.content);
```

> **💡 Helper Functions are Optional**  
> The `userAudio()` helper is just for convenience. You can construct audio messages manually:
>
> ```typescript
> // Using helper (recommended)
> const message = userAudio('Transcribe this', audioData, 'mp3');
>
> // Manual construction (also valid)
> const message = {
>   role: 'user',
>   content: [
>     { type: 'text', text: 'Transcribe this' },
>     { type: 'audio', audio: audioData, format: 'mp3' },
>   ],
> };
> ```

## Manual Content Creation

For more control, build content manually using helper functions:

```typescript
import { createOpenAI, userContent, textContent, audioContent } from '@chinmaymk/aikit';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const audioData = 'data:audio/mp3;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';

// Build content piece by piece
const message = userContent([
  textContent('Please analyze this audio recording and tell me:'),
  textContent('1. What is the speaker saying?'),
  textContent('2. What is the tone and emotion?'),
  textContent('3. Are there any background sounds?'),
  audioContent(audioData, 'mp3'),
]);

const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 300,
});
console.log(result.content);
```

## Multiple Audio Processing

Compare several audio files at once—perfect for analyzing different speakers, music genres, or audio quality:

```typescript
import { createOpenAI, userMultipleAudio } from '@chinmaymk/aikit';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const speechAudio = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
const musicAudio = 'data:audio/mp3;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
const interviewAudio = 'data:audio/m4a;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';

const message = userMultipleAudio(
  'Compare these three audio files. What are the main differences? Categorize each one.',
  [
    { audio: speechAudio, format: 'wav' },
    { audio: musicAudio, format: 'mp3' },
    { audio: interviewAudio, format: 'm4a' },
  ]
);

const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 400,
});
console.log(result.content);
```

## Audio in Conversations

Keep audio context throughout a conversation. The AI remembers what it heard:

```typescript
import { createOpenAI, conversation, userAudio, userText, assistantText } from '@chinmaymk/aikit';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const audioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';

// Start with system context
const messages = conversation()
  .system(
    'You are a helpful audio analysis assistant. Be specific and detailed about what you hear.'
  )
  .build();

// First question with audio
messages.push(userAudio('What do you hear in this audio recording?', audioData, 'wav'));

const response1 = await generate(openai, messages, {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 200,
});
console.log('AI:', response1.content);

// Continue conversation - AI remembers the audio
messages.push(assistantText(response1.content));
messages.push(userText("Can you identify the speaker's accent or regional dialect?"));

const response2 = await generate(openai, messages, {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 150,
});
console.log('AI:', response2.content);

// Ask about specific details
messages.push(assistantText(response2.content));
messages.push(userText("What emotions do you detect in the speaker's voice?"));

const response3 = await generate(openai, messages, {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 100,
});
console.log('AI:', response3.content);
```

## Loading Audio from Files

Here's how to load audio files from your file system:

```typescript
import { createOpenAI, userAudio } from '@chinmaymk/aikit';
import { readFileSync } from 'node:fs';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Load audio file and convert to base64
function loadAudioAsBase64(filePath: string): string {
  const audioBuffer = readFileSync(filePath);
  const base64 = audioBuffer.toString('base64');

  // Detect MIME type from file extension
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeType =
    {
      wav: 'audio/wav',
      mp3: 'audio/mp3',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
    }[extension || 'wav'] || 'audio/wav';

  return `data:${mimeType};base64,${base64}`;
}

// Use the audio
const audioData = loadAudioAsBase64('./recording.mp3');
const message = userAudio('Please transcribe this recording', audioData, 'mp3');

const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview',
});
console.log(result.content);
```

## Streaming with Audio

Audio works perfectly with streaming responses too:

```typescript
import { createOpenAI, userAudio } from '@chinmaymk/aikit';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const audioData = 'data:audio/mp3;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
const message = userAudio(
  'Transcribe this audio and provide a detailed analysis of the content, tone, and any interesting observations.',
  audioData,
  'mp3'
);

console.log('Streaming audio analysis:');
for await (const chunk of openai([message], {
  model: 'gpt-4o-audio-preview',
  maxOutputTokens: 500,
  temperature: 0.3,
})) {
  process.stdout.write(chunk.delta);
}
```

## Working with Different Providers

Provider support for audio varies:

```typescript
import { createOpenAI, createGoogle, userAudio } from '@chinmaymk/aikit';

const audioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
const question = 'What is being discussed in this audio recording?';

// OpenAI - excellent audio support with specialized models
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
try {
  const openaiResult = await generate(openai, [userAudio(question, audioData, 'wav')], {
    model: 'gpt-4o-audio-preview',
  });
  console.log('OpenAI:', openaiResult.content);
} catch (error) {
  console.log('OpenAI audio not supported or failed');
}

// Google - good audio support with Gemini models
const google = createGoogle({ apiKey: process.env.GOOGLE_API_KEY! });
try {
  const googleResult = await generate(google, [userAudio(question, audioData, 'wav')], {
    model: 'gemini-1.5-pro',
  });
  console.log('Google:', googleResult.content);
} catch (error) {
  console.log('Google audio not supported or failed');
}

// Anthropic - limited audio support (warns about audio content)
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
try {
  const anthropicResult = await generate(anthropic, [userAudio(question, audioData, 'wav')], {
    model: 'claude-3-5-sonnet-20241022',
  });
  console.log('Anthropic:', anthropicResult.content);
} catch (error) {
  console.log('Anthropic audio not supported');
}
```

## Error Handling

Audio processing can fail for various reasons. Handle them gracefully:

```typescript
import { createOpenAI, userAudio } from '@chinmaymk/aikit';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

try {
  const message = userAudio('Transcribe this', invalidAudioData, 'mp3');
  const result = await generate(openai, [message], { model: 'gpt-4o-audio-preview' });
  console.log(result.content);
} catch (error) {
  if (error.message.includes('invalid audio')) {
    console.error('Audio format not supported or corrupted');
  } else if (error.message.includes('too large')) {
    console.error('Audio file too large - try compressing or shortening it');
  } else if (error.message.includes('content policy')) {
    console.error('Audio violates content policy');
  } else if (error.message.includes('model')) {
    console.error('Model does not support audio - try gpt-4o-audio-preview');
  } else {
    console.error('Audio processing error:', error.message);
  }
}
```

## Best Practices

1. **Use appropriate formats** - WAV and MP3 have the best compatibility
2. **Optimize file size** - Longer audio costs more and processes slower
3. **Provide context** - Tell the AI what to listen for
4. **Test with different providers** - OpenAI has the most robust audio support
5. **Handle failures gracefully** - Audio can be corrupted or unsupported
6. **Specify format hints** - Help the AI understand the audio type

## Performance Tips

```typescript
// Good: Specific, focused questions
const goodMessage = userAudio('What is the main topic discussed?', audioData, 'mp3');

// Better: Multiple targeted questions
const betterMessage = userAudio(
  'Analyze this recording: 1) What is the main topic? 2) Who is speaking? 3) What is their tone?',
  audioData,
  'mp3'
);

// Best: Context + specific questions
const bestMessage = userAudio(
  'This is a business meeting recording. Please: 1) Summarize key decisions made 2) List action items 3) Note any concerns raised',
  audioData,
  'mp3'
);
```

## Audio-Capable Models

Not all models support audio. Here are audio-capable models:

**OpenAI (Best Support)**

- `gpt-4o-audio-preview` - Specialized for audio processing
- `gpt-4o` - General audio support
- `gpt-4o-mini` - Lightweight audio support

**Google (Good Support)**

- `gemini-1.5-pro` - Strong audio analysis
- `gemini-1.5-flash` - Fast audio processing
- `gemini-2.0-flash` - Latest with audio support

**Anthropic (Limited Support)**

- Audio content triggers warnings but may work with some models
- Consider using text transcription first

## Common Use Cases

### Transcription Service

```typescript
const transcriptionMessage = userAudio(
  'Please provide an accurate transcription of this audio recording.',
  audioData,
  'mp3'
);
```

### Music Analysis

```typescript
const musicMessage = userAudio(
  'Analyze this music: What genre is it? What instruments do you hear? What is the mood?',
  musicData,
  'mp3'
);
```

### Meeting Notes

```typescript
const meetingMessage = userAudio(
  'Summarize this meeting: key points discussed, decisions made, and action items assigned.',
  meetingAudio,
  'wav'
);
```

### Language Learning

```typescript
const pronunciationMessage = userAudio(
  'Evaluate my pronunciation and suggest improvements for speaking more clearly.',
  speechAudio,
  'wav'
);
```

## What's Next?

- [Tools Guide](./tools.md) - Combine audio with function calling
- [Conversations Guide](./conversations.md) - Manage context with audio
- [API Reference](/api/generated/README) - Technical details on audio content types

Remember: Audio adds rich context that text cannot capture. Use it for transcription, analysis, and understanding the nuances of human communication!
