[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIProvider

# Class: OpenAIProvider

Defined in: [providers/openai_completions.ts:22](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_completions.ts#L22)

The powerhouse behind OpenAI Chat Completions integration.
This class translates AIKit's generic requests into OpenAI's Chat Completions API dialect
and handles the response, whether it's a stream of tokens or a tool call.
It's like a universal translator, but for AI.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`OpenAIOptions`](../interfaces/OpenAIOptions.md)\>

## Constructors

### Constructor

> **new OpenAIProvider**(`options`): `OpenAIProvider`

Defined in: [providers/openai_completions.ts:30](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_completions.ts#L30)

Sets up the OpenAI provider with your configuration.

#### Parameters

##### options

[`OpenAIOptions`](../interfaces/OpenAIOptions.md)

Your OpenAI API credentials and default generation settings.

#### Returns

`OpenAIProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/openai_completions.ts:64](https://github.com/chinmaymk/aikit/blob/main/src/providers/openai_completions.ts#L64)

Kicks off the generation process using the Chat Completions API.
It builds the request, sends it to OpenAI, and then processes the
response stream, yielding chunks as they come in.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`OpenAIOptions`](../interfaces/OpenAIOptions.md) = `{}`

The generation options (optional, will use defaults from constructor).

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)
