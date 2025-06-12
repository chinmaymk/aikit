[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GoogleGeminiProvider

# Class: GoogleGeminiProvider

Defined in: [providers/google.ts:117](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L117)

Your gateway to the world of Google's Gemini models.
This class is the master translator, converting AIKit's standard format
into the specific dialect that Gemini understands. It's like having a
personal interpreter for one of the most powerful AIs on the planet.

## Implements

- [`AIProvider`](../interfaces/AIProvider.md)\<[`GoogleGenerationOptions`](../interfaces/GoogleGenerationOptions.md)\>

## Constructors

### Constructor

> **new GoogleGeminiProvider**(`config`): `GoogleGeminiProvider`

Defined in: [providers/google.ts:145](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L145)

Initializes the Google Gemini provider.

#### Parameters

##### config

[`GoogleConfig`](../interfaces/GoogleConfig.md)

Your Google API credentials.

#### Returns

`GoogleGeminiProvider`

## Methods

### generate()

> **generate**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

Defined in: [providers/google.ts:162](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L162)

Kicks off the generation process with the Gemini API.
It transforms the request, makes the call, and processes the stream of
consciousness that comes back.

#### Parameters

##### messages

[`Message`](../interfaces/Message.md)[]

The conversation history.

##### options

[`GoogleGenerationOptions`](../interfaces/GoogleGenerationOptions.md)

Generation options for the request.

#### Returns

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

An async iterable of stream chunks.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`generate`](../interfaces/AIProvider.md#generate)

## Properties

### models

> `readonly` **models**: `string`[]

Defined in: [providers/google.ts:127](https://github.com/chinmaymk/aikit/blob/main/src/providers/google.ts#L127)

A handy list of Gemini models we've tested.
This isn't an exhaustive list, so feel free to venture off the beaten path.
Just don't be surprised if you encounter a grue.

#### Implementation of

[`AIProvider`](../interfaces/AIProvider.md).[`models`](../interfaces/AIProvider.md#models)
