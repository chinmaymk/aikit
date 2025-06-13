[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIResponsesOptions

# Interface: OpenAIResponsesOptions

Defined in: [types.ts:197](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L197)

OpenAI Responses API configuration and generation options.
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

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:162](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L162)

Top-k sampling. Similar to top-p, but it considers a fixed number of top tokens.
Not all providers support this, because life isn't fair.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`topK`](ProviderOptions.md#topk)

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

### organization?

> `optional` **organization**: `string`

Defined in: [types.ts:199](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L199)

Your OpenAI organization ID. For when you're part of a fancy club.

---

### project?

> `optional` **project**: `string`

Defined in: [types.ts:201](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L201)

Your OpenAI project ID. For even fancier clubs.

---

### background?

> `optional` **background**: `boolean`

Defined in: [types.ts:206](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L206)

Whether to run the model response in the background.
When true, the request is processed asynchronously and can be polled for status.

---

### include?

> `optional` **include**: `string`[]

Defined in: [types.ts:211](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L211)

Specify additional output data to include in the model response.
For example: ["reasoning.encrypted_content"] to include encrypted reasoning traces.

---

### instructions?

> `optional` **instructions**: `string`

Defined in: [types.ts:216](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L216)

Inserts a system (or developer) message as the first item in the model's context.
This provides high-level instructions that take precedence over user messages.

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `string`\>

Defined in: [types.ts:220](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L220)

Set of key-value pairs that can be attached to an object for metadata purposes.

---

### parallelToolCalls?

> `optional` **parallelToolCalls**: `boolean`

Defined in: [types.ts:224](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L224)

Whether to allow the model to run tool calls in parallel.

---

### previousResponseId?

> `optional` **previousResponseId**: `string`

Defined in: [types.ts:229](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L229)

The unique ID of the previous response to the model for multi-turn conversations.
This enables conversation state management by chaining responses together.

---

### reasoning?

> `optional` **reasoning**: `object`

Defined in: [types.ts:234](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L234)

Configuration options for reasoning models (o-series models only).
Controls the reasoning effort level for enhanced problem-solving capabilities.

#### effort?

> `optional` **effort**: `"low"` \| `"medium"` \| `"high"`

---

### serviceTier?

> `optional` **serviceTier**: `"auto"` \| `"default"` \| `"flex"`

Defined in: [types.ts:241](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L241)

Specifies the latency tier to use for processing the request.
'auto' lets OpenAI choose, 'default' uses standard tier, 'flex' uses flexible tier.

---

### store?

> `optional` **store**: `boolean`

Defined in: [types.ts:246](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L246)

Whether to store the generated model response for later retrieval via API.
Defaults to true. Set to false for stateless requests.

---

### text?

> `optional` **text**: `object`

Defined in: [types.ts:251](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L251)

Configuration options for a text response from the model.
Controls the format and structure of text outputs.

#### format?

> `optional` **format**: `object`

##### format.type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

##### format.json_schema?

> `optional` **json_schema**: `object`

##### format.json_schema.name?

> `optional` **name**: `string`

##### format.json_schema.description?

> `optional` **description**: `string`

##### format.json_schema.schema?

> `optional` **schema**: `Record`\<`string`, `unknown`\>

##### format.json_schema.strict?

> `optional` **strict**: `boolean`

---

### truncation?

> `optional` **truncation**: `"auto"` \| `"disabled"`

Defined in: [types.ts:266](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L266)

The truncation strategy to use for the model response.
'auto' lets the model decide, 'disabled' prevents truncation.

---

### user?

> `optional` **user**: `string`

Defined in: [types.ts:271](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L271)

A stable identifier for your end-users.
Helps OpenAI monitor and detect abuse.
