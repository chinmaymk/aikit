[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / ProviderOptions

# Interface: ProviderOptions

Defined in: [types.ts:181](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L181)

Base interface for provider-specific configuration options.
Contains common options shared across all AI providers.

## Extends

- [`GenerationOptions`](GenerationOptions.md)

## Extended by

- [`OpenAIResponsesOptions`](OpenAIResponsesOptions.md)
- [`OpenAIOptions`](OpenAIOptions.md)
- [`GoogleOptions`](GoogleOptions.md)
- [`AnthropicOptions`](AnthropicOptions.md)

## Properties

### model?

> `optional` **model**: `string`

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`model`](GenerationOptions.md#model)

---

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The maximum number of output tokens to generate. Don't want it to ramble on forever, do you?

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`maxOutputTokens`](GenerationOptions.md#maxoutputtokens)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:152](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L152)

The sampling temperature. Higher values (e.g., 0.8) make the output more random,
while lower values (e.g., 0.2) make it more focused and deterministic.
A bit like adjusting the chaos knob.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`temperature`](GenerationOptions.md#temperature)

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:157](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L157)

Top-p sampling. It's a way to control the randomness of the output by only considering
the most likely tokens. It's like telling the AI to only pick from the top of the deck.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`topP`](GenerationOptions.md#topp)

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:162](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L162)

Top-k sampling. Similar to top-p, but it considers a fixed number of top tokens.
Not all providers support this, because life isn't fair.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`topK`](GenerationOptions.md#topk)

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:164](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L164)

A list of sequences that will stop the generation. A safe word, if you will.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`stopSequences`](GenerationOptions.md#stopsequences)

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:166](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L166)

The list of tools you're making available to the model.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`tools`](GenerationOptions.md#tools)

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:174](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L174)

How the model should choose which tool to use.
'auto': The model decides.
'required': The model must use a tool.
'none': The model can't use any tools.
{ name: 'my_tool' }: Force the model to use a specific tool.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`toolChoice`](GenerationOptions.md#toolchoice)

---

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [types.ts:183](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L183)

API key for authentication with the provider.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:185](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L185)

Custom base URL for the API endpoint.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:187](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L187)

Request timeout in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:189](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L189)

Maximum number of retry attempts for failed requests.
