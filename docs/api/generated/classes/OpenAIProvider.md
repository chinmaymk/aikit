[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIProvider

# Class: OpenAIProvider

Defined in: [providers/openai.ts:55](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L55)

The powerhouse behind OpenAI integration.
This class translates AIKit's generic requests into OpenAI's Responses API dialect
and handles the response, whether it's a stream of tokens or a tool call.
It's like a universal translator, but for AI - now with improved state management.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)

## Constructors

### Constructor

> **new OpenAIProvider**(`config`): `OpenAIProvider`

Defined in: [providers/openai.ts:62](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L62)

Sets up the OpenAI provider with your configuration.

#### Parameters

##### config

[`OpenAIConfig`](../interfaces/OpenAIConfig.md)

Your OpenAI API credentials and settings.

#### Returns

`OpenAIProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/openai.ts:90](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai.ts#L90)

Kicks off the generation process using the Responses API.
It builds the request, sends it to OpenAI, and then processes the
response stream, yielding chunks as they come in.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`OpenAIGenerationOptions`](../interfaces/OpenAIGenerationOptions.md)

The generation options.

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)
