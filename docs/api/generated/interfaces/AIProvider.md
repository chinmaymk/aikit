[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AIProvider

# Interface: AIProvider\<O\>

Defined in: [types.ts:200](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L200)

Core interface implemented by all AI providers

## Type Parameters

### O

`O` _extends_ [`BaseGenerationOptions`](BaseGenerationOptions.md) = [`BaseGenerationOptions`](BaseGenerationOptions.md)

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Defined in: [types.ts:210](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L210)

Generate streaming response for given messages

#### Parameters

##### messages

[`Message`](Message.md)[]

Array of conversation messages

##### options

`O`

Generation options including model and parameters

#### Returns

`AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Async iterable of stream chunks

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [types.ts:202](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L202)

List of available models for this provider
