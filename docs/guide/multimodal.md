# Multimodal AI with Images

Modern AI models can see and understand images just like humans do. AIKit makes it ridiculously easy to combine text and images in your conversations. Let's turn your AI into an art critic, diagram analyzer, or photo detective.

## Why Multimodal?

Images contain information that's difficult to describe in words. A chart, photo, or diagram can be worth more than a thousand words—especially to an AI that can analyze visual patterns, read text in images, and understand spatial relationships.

## Supported Models

Not all models support images. Here are some vision-capable models (but AIKit doesn't restrict which models you can use—try any model string the provider accepts):

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo (and newer vision models)
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku (and newer vision models)
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash (and newer vision models)

_AIKit includes a reference list of available models in the library, but you can use any model string that the provider API accepts, including new releases and beta models._

## Image Format Requirements

AIKit accepts images as base64-encoded data URLs:

```typescript
// Supported formats: JPEG, PNG, GIF, WebP
const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
```

## Single Image Analysis

The simplest case: show an AI one image and ask about it.

```typescript
import { createProvider, userImage } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

// Simple helper for text + image
const message = userImage(
  'What do you see in this image? Describe it in detail.',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...'
);

const result = await provider.generate([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Manual Content Creation

For more control, build content manually using helper functions:

```typescript
import { createProvider, userContent, textContent, imageContent } from 'aikit';

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

const result = await provider.generate([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Multiple Images Comparison

Compare several images at once—perfect for before/after shots, A/B testing, or style analysis.

```typescript
import { createProvider, userMultipleImages } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const beforeImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const afterImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const referenceImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';

const message = userMultipleImages(
  'Compare these three images. What are the main differences? Which one looks best and why?',
  [beforeImage, afterImage, referenceImage]
);

const result = await provider.generate([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Images in Conversations

Keep images in context throughout a conversation. The AI remembers what it saw.

```typescript
import { createProvider, conversation, userImage, userText, assistantText } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';

// Start with system context
const messages = conversation()
  .system('You are a helpful visual analysis assistant. Be specific and detailed.')
  .build();

// First question with image
messages.push(userImage('What do you see in this image?', imageData));

const response1 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 200 });
console.log('AI:', response1.content);

// Continue conversation - AI remembers the image
messages.push(assistantText(response1.content));
messages.push(userText('What emotions might this evoke in viewers?'));

const response2 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 150 });
console.log('AI:', response2.content);

// Ask about specific details
messages.push(assistantText(response2.content));
messages.push(userText('Can you identify any text or numbers in the image?'));

const response3 = await provider.generate(messages, { model: 'gpt-4o', maxTokens: 100 });
console.log('AI:', response3.content);
```

## Reading Images from Files

Here's how to load images from your file system:

```typescript
import { createProvider, userImage } from 'aikit';
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

const result = await provider.generate([message], { model: 'gpt-4o' });
console.log(result.content);
```

## Streaming with Images

Images work perfectly with streaming responses too:

```typescript
import { createProvider, userImage, printStream } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
const message = userImage(
  "Describe this image in vivid detail, like you're writing a novel.",
  imageData
);

console.log('Streaming detailed description:');
await printStream(
  provider.generate([message], {
    model: 'gpt-4o',
    maxTokens: 500,
    temperature: 0.8,
  })
);
```

## Common Use Cases

### Document Analysis

```typescript
const message = userImage(
  'Extract all the text from this document and format it as markdown.',
  documentImageData
);
```

### Chart and Graph Reading

```typescript
const message = userImage(
  'What does this chart show? Provide specific numbers and trends.',
  chartImageData
);
```

### Code Screenshot Analysis

```typescript
const message = userImage(
  "What does this code do? Are there any bugs or improvements you'd suggest?",
  codeScreenshotData
);
```

### Design Feedback

```typescript
const message = userImage(
  'Critique this UI design. What works well? What could be improved?',
  designMockupData
);
```

### Photo Description for Accessibility

```typescript
const message = userImage(
  'Describe this photo for someone who cannot see it. Be detailed but concise.',
  photoData
);
```

## Working with Different Providers

Each provider has slightly different image capabilities:

```typescript
import { createProvider, userImage } from 'aikit';

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
import { createProvider, userImage } from 'aikit';

const provider = createProvider('openai', { apiKey: process.env.OPENAI_API_KEY! });

try {
  const message = userImage('What is this?', invalidImageData);
  const result = await provider.generate([message], { model: 'gpt-4o' });
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
