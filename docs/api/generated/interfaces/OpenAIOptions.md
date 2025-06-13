[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIOptions

# Interface: OpenAIOptions

Defined in: [types.ts:279](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L279)

OpenAI Chat Completions API configuration and generation options (default OpenAI implementation).
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

Defined in: [types.ts:281](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L281)

Your OpenAI organization ID. For when you're part of a fancy club.

---

### project?

> `optional` **project**: `string`

Defined in: [types.ts:283](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L283)

Your OpenAI project ID. For even fancier clubs.

---

### presencePenalty?

> `optional` **presencePenalty**: `number`

Defined in: [types.ts:289](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L289)

Presence penalty. Positive values penalize new tokens based on whether they
appear in the text so far, increasing the model's likelihood to talk about new topics.
Basically, it discourages repetition.

---

### frequencyPenalty?

> `optional` **frequencyPenalty**: `number`

Defined in: [types.ts:295](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L295)

Frequency penalty. Positive values penalize new tokens based on their
existing frequency in the text so far, decreasing the model's likelihood to
repeat the same line verbatim. Stop me if you've heard this one before.

---

### user?

> `optional` **user**: `string`

Defined in: [types.ts:299](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L299)

A stable identifier for your end-users.

---

### logprobs?

> `optional` **logprobs**: `boolean`

Defined in: [types.ts:305](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L305)

Whether to return log probabilities of the output tokens or not.
If true, returns the log probabilities of each output token returned in the content of message.
This feature is available on gpt-4.1, gpt-4o, gpt-4o-mini, gpt-3.5-turbo, and other supported models.

---

### topLogprobs?

> `optional` **topLogprobs**: `number`

Defined in: [types.ts:310](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L310)

An integer between 0 and 20 specifying the number of most likely tokens to return at each token position,
each with an associated log probability. logprobs must be set to true if this parameter is used.

---

### seed?

> `optional` **seed**: `number`

Defined in: [types.ts:317](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L317)

This feature is in Beta. If specified, our system will make a best effort to sample deterministically,
such that repeated requests with the same seed and parameters should return the same result.
Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter
to monitor changes in the backend.

---

### responseFormat?

> `optional` **responseFormat**: `object`

Defined in: [types.ts:327](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L327)

An object specifying the format that the model must output.
Compatible with GPT-4.1, GPT-4o, GPT-4o-mini, GPT-3.5 Turbo, and all GPT-4 Turbo models newer than gpt-4-turbo-2024-04-09.
Setting to { "type": "json_object" } enables JSON mode, which guarantees the message the model generates is valid JSON.
Important: when using JSON mode, you must also instruct the model to produce JSON yourself via a system or user message.
Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit,
resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off
if finish_reason="length", which indicates the generation exceeded max_tokens or the conversation exceeded the max context length.

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema**: `object`

##### json_schema.name

> **name**: `string`

##### json_schema.description?

> `optional` **description**: `string`

##### json_schema.schema?

> `optional` **schema**: `Record`\<`string`, `unknown`\>

##### json_schema.strict?

> `optional` **strict**: `boolean`

---

### logitBias?

> `optional` **logitBias**: `Record`\<`string`, `number`\>

Defined in: [types.ts:343](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L343)

Modify the likelihood of specified tokens appearing in the completion.
Accepts a JSON object that maps tokens (specified by their token ID in the tokenizer) to an associated bias value from -100 to 100.
Mathematically, the bias is added to the logits generated by the model prior to sampling.
The exact effect will vary per model, but values between -1 and 1 should decrease or increase likelihood of selection;
values like -100 or 100 should result in a ban or exclusive selection of the relevant token.

---

### n?

> `optional` **n**: `number`

Defined in: [types.ts:349](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L349)

How many chat completion choices to generate for each input message.
Note that you will be charged based on the number of generated tokens across all of the choices.
Keep n as 1 to minimize costs.

---

### streamOptions?

> `optional` **streamOptions**: `object`

Defined in: [types.ts:354](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L354)

Options for streaming response. Only set this when you set stream: true.
When streaming, the stream will include usage data.

#### includeUsage?

> `optional` **includeUsage**: `boolean`

---

### parallelToolCalls?

> `optional` **parallelToolCalls**: `boolean`

Defined in: [types.ts:360](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L360)

Whether to allow the model to run tool calls in parallel.
