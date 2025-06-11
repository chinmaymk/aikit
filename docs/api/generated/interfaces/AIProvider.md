[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AIProvider

# Interface: AIProvider

Defined in: [types.ts:168](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L168)

Core interface implemented by all AI providers

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Defined in: [types.ts:178](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L178)

Generate streaming response for given messages

#### Parameters

##### messages

[`Message`](Message.md)[]

Array of conversation messages

##### options

[`GenerationOptions`](GenerationOptions.md)

Generation options including model and parameters

#### Returns

`AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Async iterable of stream chunks

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [types.ts:170](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L170)

List of available models for this provider
