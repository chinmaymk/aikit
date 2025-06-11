[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / AnthropicProvider

# Class: AnthropicProvider

Defined in: [providers/anthropic.ts:12](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L12)

Core interface implemented by all AI providers

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)

## Constructors

### Constructor

> **new AnthropicProvider**(`config`): `AnthropicProvider`

Defined in: [providers/anthropic.ts:22](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L22)

#### Parameters

##### config

[`AnthropicConfig`](../interfaces/AnthropicConfig.md)

#### Returns

`AnthropicProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/anthropic.ts:26](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L26)

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

Defined in: [providers/anthropic.ts:14](https://github.com/chinmaymk/aikit/blob/main/src/providers/anthropic.ts#L14)

List of available models for this provider

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
