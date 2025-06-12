[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AIProvider

# Interface: AIProvider\<O\>

Defined in: [types.ts:255](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L255)

The core interface that all AI providers must implement.
It's the social contract that holds this whole library together.

## Type Parameters

### O

`O` _extends_ [`GenerationOptions`](GenerationOptions.md) = [`GenerationOptions`](GenerationOptions.md)

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

Defined in: [types.ts:266](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L266)

The main event. This is where the magic happens.
Give it a list of messages and some options, and it'll give you back a stream of consciousness.

#### Parameters

##### messages

[`Message`](Message.md)[]

The conversation so far. A story waiting to be told.

##### options

`O`

The rules of the game. How you want the AI to behave.

#### Returns

`AsyncIterable`\<[`StreamChunk`](StreamChunk.md)\>

An async iterable of stream chunks. Data, glorious data!

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [types.ts:257](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L257)

A list of the models this provider supports. A handy little cheat sheet.
