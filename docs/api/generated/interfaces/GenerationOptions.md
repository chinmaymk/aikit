[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GenerationOptions

# Interface: GenerationOptions

Defined in: [types.ts:142](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L142)

The basic knobs and dials for controlling the AI's creative genius.
These are the options that all providers understand.

## Extended by

- [`OpenAIOptions`](OpenAIOptions.md)
- [`GoogleOptions`](GoogleOptions.md)
- [`AnthropicOptions`](AnthropicOptions.md)

## Properties

### model?

> `optional` **model**: `string`

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The maximum number of tokens to generate. Don't want it to ramble on forever, do you?

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:152](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L152)

The sampling temperature. Higher values (e.g., 0.8) make the output more random,
while lower values (e.g., 0.2) make it more focused and deterministic.
A bit like adjusting the chaos knob.

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:157](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L157)

Top-p sampling. It's a way to control the randomness of the output by only considering
the most likely tokens. It's like telling the AI to only pick from the top of the deck.

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:162](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L162)

Top-k sampling. Similar to top-p, but it considers a fixed number of top tokens.
Not all providers support this, because life isn't fair.

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:164](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L164)

A list of sequences that will stop the generation. A safe word, if you will.

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:166](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L166)

The list of tools you're making available to the model.

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:174](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L174)

How the model should choose which tool to use.
'auto': The model decides.
'required': The model must use a tool.
'none': The model can't use any tools.
{ name: 'my_tool' }: Force the model to use a specific tool.
