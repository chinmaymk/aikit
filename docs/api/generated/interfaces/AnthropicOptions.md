[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicOptions

# Interface: AnthropicOptions

Defined in: [types.ts:286](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L286)

Anthropic-specific configuration and generation options.
These can be provided at construction time or generation time.
Generation time options will override construction time options.

## Extends

- [`GenerationOptions`](GenerationOptions.md)

## Properties

### model?

> `optional` **model**: `string`

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

Defined in: [types.ts:288](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L288)

Your Anthropic API key. Don't tell anyone.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:290](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L290)

A custom base URL for the API. You know the drill.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:292](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L292)

How long to wait for a response before your patience wears out, in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:294](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L294)

How many times to try again. Third time's the charm?

---

### beta?

> `optional` **beta**: `string`[]

Defined in: [types.ts:296](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L296)

For enabling beta features. Live on the edge.

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:301](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L301)

Top-k sampling. See `GenerationOptions` for the juicy gossip.
It's here because Anthropic supports it too.

#### Overrides

[`GenerationOptions`](GenerationOptions.md).[`topK`](GenerationOptions.md#topk)
