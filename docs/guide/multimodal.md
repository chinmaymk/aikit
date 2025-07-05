# Multimodal AI with Images and Audio

Modern AI models can process images and audio alongside text. AIKit makes it easy to combine text, images, and audio in your AI conversations with simple helper functions.

## Image Processing

### Image Format Requirements

AIKit accepts images as base64-encoded data URLs in formats: JPEG, PNG, GIF, WebP.

```typescript
const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
```

### Simple Image Analysis

```typescript
import { createOpenAI, userImage, generate } from '@chinmaymk/aikit';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const message = userImage(
  'What do you see in this image?',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
);

const result = await generate(openai, [message], {
  model: 'gpt-4o',
});

console.log(result.content);
```

### Multiple Images

Compare several images at once:

```typescript
import { userMultipleImages } from '@chinmaymk/aikit';

const images = [
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
];

const message = userMultipleImages('Compare these images. What are the main differences?', images);

const result = await generate(openai, [message], { model: 'gpt-4o' });
```

### Manual Content Creation

For more control, build content manually:

```typescript
import { userContent, textContent, imageContent } from '@chinmaymk/aikit';

const message = userContent([
  textContent('Analyze this chart:'),
  textContent('1. What does it show?'),
  textContent('2. What trends do you notice?'),
  imageContent(imageData),
]);

const result = await generate(openai, [message], { model: 'gpt-4o' });
```

### Loading Images from Files

```typescript
import { readFileSync } from 'node:fs';

function loadImageAsBase64(filePath: string): string {
  const imageBuffer = readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');

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

const imageData = loadImageAsBase64('./screenshot.png');
const message = userImage('What does this screenshot show?', imageData);
```

### Streaming with Images

```typescript
const message = userImage('Describe this image in detail', imageData);

for await (const chunk of openai([message], { model: 'gpt-4o' })) {
  process.stdout.write(chunk.delta);
}
```

## Audio Processing

### Audio Format Requirements

AIKit accepts audio as base64-encoded data URLs in formats: WAV, MP3, WebM, OGG, M4A.

```typescript
const audioData = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...';
```

### Simple Audio Analysis

```typescript
import { userAudio } from '@chinmaymk/aikit';

const message = userAudio(
  'Please transcribe this audio.',
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEA...',
  'wav' // Optional format hint
);

const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview',
});
```

### Multiple Audio Files

```typescript
import { userMultipleAudio } from '@chinmaymk/aikit';

const audioFiles = [
  { audio: speechAudio, format: 'wav' },
  { audio: musicAudio, format: 'mp3' },
  { audio: interviewAudio, format: 'm4a' },
];

const message = userMultipleAudio('Compare these audio files. Categorize each one.', audioFiles);

const result = await generate(openai, [message], {
  model: 'gpt-4o-audio-preview',
});
```

### Loading Audio from Files

```typescript
function loadAudioAsBase64(filePath: string): string {
  const audioBuffer = readFileSync(filePath);
  const base64 = audioBuffer.toString('base64');

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

const audioData = loadAudioAsBase64('./recording.mp3');
const message = userAudio('Transcribe this recording', audioData, 'mp3');
```

## Different Providers

Provider support varies for multimodal content:

```typescript
import { createOpenAI, createAnthropic, createGoogle } from '@chinmaymk/aikit';

// OpenAI - excellent image and audio support
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Anthropic - great image analysis, no audio support
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Google - strong image and audio support
const google = createGoogle({ apiKey: process.env.GOOGLE_API_KEY! });

const imageMessage = userImage('What is this?', imageData);

// Works with all providers
const openaiResult = await generate(openai, [imageMessage], { model: 'gpt-4o' });
const anthropicResult = await generate(anthropic, [imageMessage], {
  model: 'claude-3-5-sonnet-20241022',
});
const googleResult = await generate(google, [imageMessage], { model: 'gemini-1.5-pro' });
```

## Error Handling

```typescript
try {
  const message = userImage('What is this?', imageData);
  const result = await generate(openai, [message], { model: 'gpt-4o' });
  console.log(result.content);
} catch (error) {
  if (error.message.includes('invalid image')) {
    console.error('Image format not supported or corrupted');
  } else if (error.message.includes('too large')) {
    console.error('File too large - try compressing it');
  } else if (error.message.includes('content policy')) {
    console.error('Content violates policy');
  } else if (error.message.includes('model')) {
    console.error('Model does not support this content type');
  } else {
    console.error('Processing error:', error.message);
  }
}
```

## Best Practices

1. **Optimize file size** - Larger files cost more and process slower
2. **Use appropriate resolution** - High-res for detailed analysis, lower for general questions
3. **Provide context** - Tell the AI what to look for
4. **Test different providers** - Each has strengths in different areas
5. **Handle failures gracefully** - Files can be corrupted or unsupported
6. **Specify format hints for audio** - Helps the AI understand the content better

## Performance Tips

```typescript
// Good: Specific, focused questions
const goodMessage = userImage('What is the error message in this screenshot?', imageData);

// Better: Multiple targeted questions in one prompt
const betterMessage = userImage(
  'Analyze this error screenshot: 1) What is the exact error? 2) Which line caused it? 3) How to fix it?',
  imageData
);

// Best: Context + specific questions
const bestMessage = userImage(
  'This is a Node.js error screenshot. Please: 1) Identify the exact error 2) Explain the cause 3) Suggest a fix',
  imageData
);
```

## Supported Models

### Vision-Capable Models

**OpenAI**

- `gpt-4o`, `gpt-4o-mini`
- `gpt-4-turbo`, `gpt-4`

**Anthropic**

- `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`

**Google**

- `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-1.5-flash`
- `gemini-pro-vision`

### Audio-Capable Models

**OpenAI (Best Support)**

- `gpt-4o-audio-preview` - Specialized for audio
- `gpt-4o`, `gpt-4o-mini` - General audio support

**Google (Good Support)**

- `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`

**Anthropic**

- Limited/no audio support

## Common Use Cases

### Document Analysis

```typescript
const message = userImage('Extract all text and summarize this document', documentImage);
```

### Audio Transcription

```typescript
const message = userAudio('Transcribe this meeting and extract action items', meetingAudio, 'mp3');
```

### Visual Q&A

```typescript
const message = userImage('What programming language is in this code screenshot?', codeImage);
```

### Music Analysis

```typescript
const message = userAudio(
  'What genre is this music? What instruments do you hear?',
  musicAudio,
  'mp3'
);
```

## What's Next?

- [Tools Guide](./tools.md) - Combine multimodal content with function calling
- [Streaming Guide](./streaming.md) - Handle real-time multimodal responses
- [API Reference](/api/generated/README) - Technical details on content types

Remember: Multimodal AI excels when you provide clear, specific instructions about what to analyze in your images and audio!
