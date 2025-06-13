[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIResponsesProvider

# Class: OpenAIResponsesProvider

Defined in: [providers/openai_responses.ts:54](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_responses.ts#L54)

The powerhouse behind OpenAI integration.
This class translates AIKit's generic requests into OpenAI's Responses API dialect
and handles the response, whether it's a stream of tokens or a tool call.
It's like a universal translator, but for AI - now with improved state management.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`OpenAIResponsesOptions`](../interfaces/OpenAIResponsesOptions.md)\>

## Constructors

### Constructor

> **new OpenAIResponsesProvider**(`options`): `OpenAIProvider`

Defined in: [providers/openai_responses.ts:62](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_responses.ts#L62)

Sets up the OpenAI provider with your configuration.

#### Parameters

##### options

[`OpenAIResponsesOptions`](../interfaces/OpenAIResponsesOptions.md)

Your OpenAI API credentials and default generation settings.

#### Returns

`OpenAIProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/openai_responses.ts:96](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_responses.ts#L96)

Kicks off the generation process using the Responses API.
It builds the request, sends it to OpenAI, and then processes the
response stream, yielding chunks as they come in.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`OpenAIResponsesOptions`](../interfaces/OpenAIResponsesOptions.md) = `{}`

The generation options (optional, will use defaults from constructor).

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)
