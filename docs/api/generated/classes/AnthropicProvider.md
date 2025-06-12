[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicProvider

# Class: AnthropicProvider

Defined in: [providers/anthropic.ts:157](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L157)

The bridge to Anthropic's world of Claude.
This class translates AIKit's universal language into Anthropic's specific API dialect.
It's the kind of diplomat who is fluent in both cultures and always knows the right thing to say.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`AnthropicGenerationOptions`](../interfaces/AnthropicGenerationOptions.md)\>

## Constructors

### Constructor

> **new AnthropicProvider**(`config`): `AnthropicProvider`

Defined in: [providers/anthropic.ts:177](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L177)

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

Defined in: [providers/anthropic.ts:203](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L203)

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

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [providers/anthropic.ts:166](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L166)

A curated list of Anthropic models this provider is cozy with.
You can try others, but these are the ones we've formally introduced.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
