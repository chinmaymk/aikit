---
title: 'Multimodal AI: Giving Your AI Eyes and Ears'
description: How to use AIKit to process images and audio, turning your chatbot into a perceptive assistant.
---

# Multimodal AI: Giving Your AI Eyes and Ears

Text is great, but the world is more than just words. With AIKit, you can give your AI models eyes to see images and ears to hear audio. It’s the difference between an assistant who can only read emails and one who can analyze a chart, transcribe a meeting, or even tell you if that's a picture of a hot dog or not.

AIKit provides simple helpers to wrap your image and audio data, so you can stop worrying about content types and start building.

## Working with Images

Got a JPEG, PNG, GIF, or WebP? AIKit is ready for it. Just convert your image to a base64-encoded data URL, and you're good to go.

Most of the time, you'll be loading a file from disk. Here’s a handy function for that:

```typescript
import { readFileSync } from 'node:fs';

function loadImageAsDataUrl(filePath: string): string {
  const mimeType = `image/${filePath.split('.').pop() || 'jpeg'}`;
  const base64 = readFileSync(filePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}
```

### One Image, Many Questions

The `userImage` helper is your go-to for single-image prompts.

```typescript
import { createProvider, userImage, printStream } from '@chinmaymk/aikit';

const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});
const imageData = loadImageAsDataUrl('./chart.png');

const messages = [userImage('What are the key takeaways from this chart?', imageData)];

await printStream(provider(messages, { model: 'gpt-4o' }));
```

### Comparing Multiple Images

Need to compare, contrast, or find the odd one out? `userMultipleImages` has you covered.

```typescript
import { userMultipleImages } from '@chinmaymk/aikit';

const images = [
  loadImageAsDataUrl('./cat1.png'),
  loadImageAsDataUrl('./cat2.png'),
  loadImageAsDataUrl('./dog.png'),
];

const messages = [userMultipleImages('Which of these images is not like the others?', images)];
await printStream(provider(messages, { model: 'gpt-4o' }));
// "The third image features a dog, while the first two feature cats."
```

## Working with Audio

AIKit can listen to WAV, MP3, WebM, OGG, and M4A files. Just like with images, you'll need a base64-encoded data URL.

### Transcribing a Single Audio File

Use the `userAudio` helper to get a transcript, summarize a meeting, or analyze a sound.

```typescript
import { userAudio } from '@chinmaymk/aikit';

// Helper to load audio files
function loadAudioAsDataUrl(filePath: string): string {
  const mimeType = `audio/${filePath.split('.').pop() || 'wav'}`;
  const base64 = readFileSync(filePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

const audioData = loadAudioAsDataUrl('./meeting.mp3');
const messages = [userAudio('Please summarize this meeting.', audioData)];

await printStream(provider(messages, { model: 'gpt-4o' }));
```

## Choosing Your Senses: Provider Differences

Not all models are created equal when it comes to multimodal capabilities.

- **OpenAI (`gpt-4o`, `gpt-4-turbo`)**: The gold standard. Excellent, reliable support for both images and audio.
- **Anthropic (`claude-3-5-sonnet-20240620`, etc.)**: Top-tier image analysis, but currently no audio support.
- **Google (`gemini-1.5-pro`, etc.)**: Strong contender with solid image and audio features.

AIKit keeps the interface the same, so you can switch providers without changing your code.

```typescript
import { createProvider, userImage, printStream } from '@chinmaymk/aikit';

const imageData = '...'; // Your base64 image data

const openai = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });
const anthropic = createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY! });

const message = userImage('Describe this image.', imageData);

// This code works for both providers, just change the provider instance
await printStream(openai([message], { model: 'gpt-4o' }));
await printStream(anthropic([message], { model: 'claude-3-5-sonnet-20240620' }));
```

## The Golden Rules of Multimodality

- **Size Matters**: Smaller files are faster and cheaper to process. Resize images and compress audio when you can.
- **Context is King**: Don't just send an image; tell the AI what to look for. "What's the bug in this screenshot?" is better than "Describe this."
- **Handle Failure**: Network errors, corrupted files, and content policy violations happen. Wrap your calls in a `try...catch` block to handle them gracefully.
- **Be Specific with Audio**: For audio, you can provide an optional format hint (e.g., `'mp3'`) to the `userAudio` helper. It helps the model process the data more reliably.

Now go build something that sees and hears! 🚀
