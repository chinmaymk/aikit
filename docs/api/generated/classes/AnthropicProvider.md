[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicProvider

# Class: AnthropicProvider

Defined in: [providers/anthropic.ts:131](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L131)

The bridge to Anthropic's world of Claude.
This class translates AIKit's universal language into Anthropic's specific API dialect.
It's the kind of diplomat who is fluent in both cultures and always knows the right thing to say.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`AnthropicGenerationOptions`](../interfaces/AnthropicGenerationOptions.md)\>

## Constructors

### Constructor

> **new AnthropicProvider**(`config`): `AnthropicProvider`

Defined in: [providers/anthropic.ts:138](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L138)

Initializes the Anthropic provider.

#### Parameters

##### config

[`AnthropicConfig`](../interfaces/AnthropicConfig.md)

Your Anthropic API credentials and settings.

#### Returns

`AnthropicProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/anthropic.ts:162](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L162)

Orchestrates the generation process with Anthropic's API.
It transforms the request, makes the call, and then processes the
server-sent events stream into a format AIKit can understand.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`AnthropicGenerationOptions`](../interfaces/AnthropicGenerationOptions.md)

Generation options for the request.

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)
