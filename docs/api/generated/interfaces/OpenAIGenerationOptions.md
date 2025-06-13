[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIGenerationOptions

# Interface: OpenAIGenerationOptions

Defined in: [types.ts:181](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L181)

OpenAI-specific settings. For when you need that special OpenAI flavor.
These are the secret spices for the GPT family.

## Extends

- [`GenerationOptions`](GenerationOptions.md)

## Properties

### model

> **model**: `string`

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`model`](GenerationOptions.md#model)

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The maximum number of tokens to generate. Don't want it to ramble on forever, do you?

#### Inherited from

[`GenerationOptions`](GenerationOptions.md).[`maxTokens`](GenerationOptions.md#maxtokens)

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

### presencePenalty?

> `optional` **presencePenalty**: `number`

Defined in: [types.ts:187](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L187)

Presence penalty. Positive values penalize new tokens based on whether they
appear in the text so far, increasing the model's likelihood to talk about new topics.
Basically, it discourages repetition.

---

### frequencyPenalty?

> `optional` **frequencyPenalty**: `number`

Defined in: [types.ts:193](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L193)

Frequency penalty. Positive values penalize new tokens based on their
existing frequency in the text so far, decreasing the model's likelihood to
repeat the same line verbatim. Stop me if you've heard this one before.

---

### background?

> `optional` **background**: `boolean`

Defined in: [types.ts:197](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L197)

Whether to run the model response in the background.

---

### include?

> `optional` **include**: `string`[]

Defined in: [types.ts:201](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L201)

Specify additional output data to include in the model response.

---

### instructions?

> `optional` **instructions**: `string`

Defined in: [types.ts:205](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L205)

Inserts a system (or developer) message as the first item in the model's context.

---

### metadata?

> `optional` **metadata**: `Record`\<`string`, `string`\>

Defined in: [types.ts:209](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L209)

Set of key-value pairs that can be attached to an object.

---

### parallelToolCalls?

> `optional` **parallelToolCalls**: `boolean`

Defined in: [types.ts:213](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L213)

Whether to allow the model to run tool calls in parallel.

---

### previousResponseId?

> `optional` **previousResponseId**: `string`

Defined in: [types.ts:217](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L217)

The unique ID of the previous response to the model for multi-turn conversations.

---

### reasoning?

> `optional` **reasoning**: `object`

Defined in: [types.ts:221](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L221)

Configuration options for reasoning models (o-series models only).

#### effort?

> `optional` **effort**: `"low"` \| `"medium"` \| `"high"`

---

### serviceTier?

> `optional` **serviceTier**: `"auto"` \| `"default"` \| `"flex"`

Defined in: [types.ts:227](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L227)

Specifies the latency tier to use for processing the request.

---

### store?

> `optional` **store**: `boolean`

Defined in: [types.ts:231](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L231)

Whether to store the generated model response for later retrieval via API.

---

### text?

> `optional` **text**: `object`

Defined in: [types.ts:235](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L235)

Configuration options for a text response from the model.

#### format?

> `optional` **format**: `object`

##### format.type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

##### format.json_schema?

> `optional` **json_schema**: `Record`\<`string`, `unknown`\>

---

### truncation?

> `optional` **truncation**: `"auto"` \| `"disabled"`

Defined in: [types.ts:244](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L244)

The truncation strategy to use for the model response.

---

### user?

> `optional` **user**: `string`

Defined in: [types.ts:248](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L248)

A stable identifier for your end-users.
