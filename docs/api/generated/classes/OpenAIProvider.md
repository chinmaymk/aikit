[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIProvider

# Class: OpenAIProvider

Defined in: [providers/openai.ts:13](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L13)

Core interface implemented by all AI providers

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)

## Constructors

### Constructor

> **new OpenAIProvider**(`config`): `OpenAIProvider`

Defined in: [providers/openai.ts:29](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L29)

#### Parameters

##### config

[`OpenAIConfig`](../interfaces/OpenAIConfig.md)

#### Returns

`OpenAIProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/openai.ts:55](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L55)

Generate streaming response for given messages

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

Array of conversation messages

##### options

[`OpenAIGenerationOptions`](../interfaces/OpenAIGenerationOptions.md)

Generation options including model and parameters

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Async iterable of stream chunks

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [providers/openai.ts:18](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L18)

List of available models for this provider

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
