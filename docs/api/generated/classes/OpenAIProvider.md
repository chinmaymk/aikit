[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / OpenAIProvider

# Class: OpenAIProvider

Defined in: [providers/openai.ts:15](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L15)

Core interface implemented by all AI providers

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)

## Constructors

### Constructor

> **new OpenAIProvider**(`config`): `OpenAIProvider`

Defined in: [providers/openai.ts:28](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L28)

#### Parameters

##### config

[`OpenAIConfig`](../interfaces/OpenAIConfig.md)

#### Returns

`OpenAIProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/openai.ts:32](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L32)

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

Defined in: [providers/openai.ts:17](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L17)

List of available models for this provider

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
