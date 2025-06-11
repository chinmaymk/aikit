[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GoogleGeminiProvider

# Class: GoogleGeminiProvider

Defined in: [providers/google.ts:23](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L23)

Core interface implemented by all AI providers

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)

## Constructors

### Constructor

> **new GoogleGeminiProvider**(`config`): `GoogleGeminiProvider`

Defined in: [providers/google.ts:27](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L27)

#### Parameters

##### config

[`GoogleConfig`](../interfaces/GoogleConfig.md)

#### Returns

`GoogleGeminiProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/google.ts:31](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L31)

Generate streaming response for given messages

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

Array of conversation messages

##### options

[`GenerationOptions`](../interfaces/GenerationOptions.md)

Generation options including model and parameters

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Async iterable of stream chunks

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [providers/google.ts:25](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L25)

List of available models for this provider

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
