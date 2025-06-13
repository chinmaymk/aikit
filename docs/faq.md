# Frequently Asked Questions

Got questions? We've got answers. Here are the most common questions about AIKit, answered with our signature blend of technical accuracy and gentle humor.

## How does AIKit work?

AIKit directly calls the APIs of underlying LLM providers (OpenAI, Anthropic, Google) and maps their responses to a unified result stream with consistent types. It's like having a universal translator for AI models, but for code instead of languages.

## How does this differ from the official SDKs?

AIKit focuses **only** on generation features across providers. That narrow focus lets us ship a smaller, unified API surface. If you need file uploads, fine-tuning, vector stores, etc., use the vendor SDK. Think of AIKit as the Swiss Army knife for AI generation—not every tool in the shed, but the ones you use most often.

## What are the best use cases for AIKit?

Hand-rolling works for simple cases, but when you want streaming, multimodal inputs, consistent typings across providers, tool calls, environment-agnostic execution, or when you're simply interested in the generative features of large models, AIKit makes it easy—all in just a few lines.

Perfect for:

- **Multi-provider applications** - Switch between OpenAI, Anthropic, and Google seamlessly
- **Streaming applications** - Real-time chat interfaces, live content generation
- **Multimodal projects** - Apps that combine text and images
- **AI-powered tools** - Function calling for weather, calculations, database queries
- **Prototyping** - Quick experimentation with different models
- **Production apps** - Type-safe, reliable AI integration

## Will the API change under my feet?

Vendor generation endpoints rarely break. When they occasionally do, we publish a new **major** AIKit version right away so you can upgrade with minimal fuss. We follow semantic versioning and document any change in the changelog.

## Is AIKit production-ready?

There's no such thing as production ready.

## What providers and models are supported?

**AIKit supports OpenAI, Anthropic, and Google providers**. You can use **any model string** that the provider API accepts—AIKit doesn't restrict model names.

This includes:

- **Standard models**: Like GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash
- **New releases**: Beta models and newly announced models
- **Custom models**: Your fine-tuned or specialized models
- **Future models**: Any model the provider adds

Examples:

- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `your-custom-model`
- **Anthropic**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, etc.
- **Google**: `gemini-2.0-flash`, `gemini-1.5-pro`, `models/your-model`

Each provider supports streaming, and vision-capable models support multimodal inputs.

**OpenAI-compatible APIs** (like Ollama, LocalAI, etc.) may work with the OpenAI provider, but they're not officially tested, so YMMV.

_AIKit includes a reference list of available models in the library for convenience, but this doesn't limit what you can use._

## Can I use AIKit in the browser?

Yes! AIKit uses only the built-in `fetch` API, so it works in any modern JavaScript environment. Just remember to keep your API keys secure—consider using a proxy server for browser applications.

## How do I test code that uses AIKit?

AIKit providers are plain async generators, making them easy to mock:

```typescript
const mockProvider = {
  async *generate(messages, options) {
    yield { delta: 'Hello ' };
    yield { delta: 'test!' };
    yield { delta: '', finishReason: 'stop', content: 'Hello test!' };
  },
};

// Use in tests just like a real provider
```

## Which models support images?

Vision capabilities vary by provider:

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Anthropic**: Claude 4, 3.5
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash

All support JPEG, PNG, GIF, and WebP formats as base64-encoded data URLs.

## Do all providers support function calling?

Yes, but with some differences:

- **OpenAI**: Full function calling support
- **Anthropic**: Tool use with similar capabilities
- **Google**: Function calling support

AIKit normalizes these differences so your code works the same across providers.

## Can I stream with tools and images?

Yes! AIKit supports streaming with all features:

- Tool calls can be streamed
- Images work in streaming conversations
- You can combine all features together

## How fast is AIKit compared to direct API calls?

AIKit adds minimal overhead—just the abstraction layer. The actual API calls are direct HTTP requests using the native `fetch` API. Performance is essentially identical to calling the provider APIs directly.

## Does AIKit cache responses?

No, AIKit doesn't cache responses by design. This keeps the library simple and predictable. You can implement your own caching layer if needed:

```typescript
const cache = new Map();

async function cachedGenerate(provider, messages, options) {
  const key = JSON.stringify({ messages, options });
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await provider.generate(messages, options);
  cache.set(key, result);
  return result;
}
```

## How does streaming compare to batch responses?

Streaming provides better perceived performance even when total time is similar. Users see immediate feedback instead of waiting for complete responses. Our examples include performance comparisons.

## I'm getting API key errors

Double-check your environment variables:

```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $GOOGLE_API_KEY
```

Make sure the keys are valid and have the necessary permissions.

## My images aren't working

Check these common issues:

- Is the model vision-capable? (See supported models above)
- Is the image properly base64-encoded with the data URL prefix?
- Is the image size reasonable? Large images cost more and process slower
- Are you using a supported format? (JPEG, PNG, GIF, WebP)

## Tool calls aren't executing

Verify:

- Tool definitions match the expected schema
- Tool choice is set correctly (auto, required, or none)
- Tool service functions return valid JSON strings
- Error handling is in place for tool failures

## Streaming isn't working

Common fixes:

- Ensure you're using `for await` loops correctly
- Check that the provider supports streaming (all supported providers do)
- Verify error handling doesn't interfere with the stream
- Try the `printStream` helper for debugging

## Where can I find more examples?

- **[Examples documentation](/examples/README)** - Comprehensive examples with explanations
- **[GitHub examples folder](https://github.com/chinmaymk/aikit/tree/main/examples)** - Runnable code
- **[Guide sections](/guide/getting-started)** - Feature-specific tutorials

## How do I report bugs or request features?

Visit our [GitHub Issues](https://github.com/chinmaymk/aikit/issues) page. We welcome:

- Bug reports with reproduction steps
- Feature requests with use cases
- Documentation improvements
- Code contributions

## Is there a community?

Follow development and discussions on [GitHub](https://github.com/chinmaymk/aikit). We also appreciate:

- ⭐ Stars on GitHub
- 📝 Blog posts about your AIKit projects
- 🐦 Sharing on social media
- 💬 Helping other users with questions

---

**Still have questions?** Open an issue on GitHub or check out our comprehensive [documentation](/guide/getting-started). We're here to help!
