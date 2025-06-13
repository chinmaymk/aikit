[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GoogleGeminiProvider

# Class: GoogleGeminiProvider

Defined in: [providers/google.ts:62](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L62)

Your gateway to the world of Google's Gemini models.
This class is the master translator, converting AIKit's standard format
into the specific dialect that Gemini understands. It's like having a
personal interpreter for one of the most powerful AIs on the planet.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`GoogleOptions`](../interfaces/GoogleOptions.md)\>

## Constructors

### Constructor

> **new GoogleGeminiProvider**(`options`): `GoogleGeminiProvider`

Defined in: [providers/google.ts:70](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L70)

Initializes the Google Gemini provider.

#### Parameters

##### options

[`GoogleOptions`](../interfaces/GoogleOptions.md)

Your Google API credentials and default generation settings.

#### Returns

`GoogleGeminiProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/google.ts:92](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L92)

Kicks off the generation process with the Gemini API.
It transforms the request, makes the call, and processes the stream of
consciousness that comes back.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`GoogleOptions`](../interfaces/GoogleOptions.md) = `{}`

Generation options for the request (optional, will use defaults from constructor).

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)
