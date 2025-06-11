[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AIProvider

# Interface: AIProvider

Defined in: [types.ts:179](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L179)

Core interface implemented by all AI providers

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Defined in: [types.ts:189](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L189)

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

Defined in: [types.ts:181](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L181)

List of available models for this provider
