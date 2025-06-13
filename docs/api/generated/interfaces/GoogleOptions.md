[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GoogleOptions

# Interface: GoogleOptions

Defined in: [types.ts:368](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L368)

Google-specific configuration and generation options.
These can be provided at construction time or generation time.
Generation time options will override construction time options.

## Extends

- [`ProviderOptions`](ProviderOptions.md)

## Properties

### model?

> `optional` **model**: `string`

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`model`](ProviderOptions.md#model)

---

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The maximum number of output tokens to generate. Don't want it to ramble on forever, do you?

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`maxOutputTokens`](ProviderOptions.md#maxoutputtokens)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:152](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L152)

The sampling temperature. Higher values (e.g., 0.8) make the output more random,
while lower values (e.g., 0.2) make it more focused and deterministic.
A bit like adjusting the chaos knob.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`temperature`](ProviderOptions.md#temperature)

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:157](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L157)

Top-p sampling. It's a way to control the randomness of the output by only considering
the most likely tokens. It's like telling the AI to only pick from the top of the deck.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`topP`](ProviderOptions.md#topp)

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:164](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L164)

A list of sequences that will stop the generation. A safe word, if you will.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`stopSequences`](ProviderOptions.md#stopsequences)

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:166](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L166)

The list of tools you're making available to the model.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`tools`](ProviderOptions.md#tools)

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

[`ProviderOptions`](ProviderOptions.md).[`toolChoice`](ProviderOptions.md#toolchoice)

---

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [types.ts:183](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L183)

API key for authentication with the provider.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`apiKey`](ProviderOptions.md#apikey)

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:185](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L185)

Custom base URL for the API endpoint.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`baseURL`](ProviderOptions.md#baseurl)

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:187](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L187)

Request timeout in milliseconds.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`timeout`](ProviderOptions.md#timeout)

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:189](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L189)

Maximum number of retry attempts for failed requests.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`maxRetries`](ProviderOptions.md#maxretries)

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:373](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L373)

Top-k sampling. See `GenerationOptions` for the details.
It's here because Google supports it.

#### Overrides

[`ProviderOptions`](ProviderOptions.md).[`topK`](ProviderOptions.md#topk)

---

### candidateCount?

> `optional` **candidateCount**: `number`

Defined in: [types.ts:375](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L375)

How many different responses to generate. More candidates, more problems.

---

### presencePenalty?

> `optional` **presencePenalty**: `number`

Defined in: [types.ts:380](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L380)

Presence penalty. Positive values penalize new tokens based on whether they
appear in the text so far, increasing the model's likelihood to talk about new topics.

---

### frequencyPenalty?

> `optional` **frequencyPenalty**: `number`

Defined in: [types.ts:386](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L386)

Frequency penalty. Positive values penalize new tokens based on their
existing frequency in the text so far, decreasing the model's likelihood to
repeat the same line verbatim.

---

### responseMimeType?

> `optional` **responseMimeType**: `"text/plain"` \| `"application/json"`

Defined in: [types.ts:391](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L391)

The MIME type of the generated candidate text.
Supported values: 'text/plain' (default), 'application/json'

---

### responseSchema?

> `optional` **responseSchema**: `Record`\<`string`, `unknown`\>

Defined in: [types.ts:396](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L396)

Output schema of the generated candidate text when responseMimeType is set to 'application/json'.
Schema must be a subset of the OpenAPI schema and can be objects, primitives or arrays.

---

### seed?

> `optional` **seed**: `number`

Defined in: [types.ts:401](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L401)

This feature is in Beta. If specified, our system will make a best effort to sample deterministically,
such that repeated requests with the same seed and parameters should return the same result.

---

### responseLogprobs?

> `optional` **responseLogprobs**: `boolean`

Defined in: [types.ts:406](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L406)

Whether to return log probabilities of the output tokens or not.
If true, returns the log probabilities of each output token returned in the content of message.

---

### logprobs?

> `optional` **logprobs**: `number`

Defined in: [types.ts:411](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L411)

An integer between 1 and 20 specifying the number of most likely tokens to return at each token position,
each with an associated log probability. responseLogprobs must be set to true if this parameter is used.

---

### audioTimestamp?

> `optional` **audioTimestamp**: `boolean`

Defined in: [types.ts:416](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L416)

Whether to include audio timestamp information in the response.
Only applicable for audio generation models.

---

### safetySettings?

> `optional` **safetySettings**: `object`[]

Defined in: [types.ts:421](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L421)

Safety settings for content filtering.
Configure safety thresholds for different harm categories.

#### category

> **category**: `"HARM_CATEGORY_HARASSMENT"` \| `"HARM_CATEGORY_HATE_SPEECH"` \| `"HARM_CATEGORY_SEXUALLY_EXPLICIT"` \| `"HARM_CATEGORY_DANGEROUS_CONTENT"` \| `"HARM_CATEGORY_CIVIC_INTEGRITY"`

The category of harmful content to filter

#### threshold

> **threshold**: `"BLOCK_NONE"` \| `"BLOCK_ONLY_HIGH"` \| `"BLOCK_MEDIUM_AND_ABOVE"` \| `"BLOCK_LOW_AND_ABOVE"`

The threshold for blocking content
