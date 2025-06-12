[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GenerationOptions

# Interface: GenerationOptions

Defined in: [types.ts:122](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L122)

The basic knobs and dials for controlling the AI's creative genius.
These are the options that all providers understand.

## Extended by

- [`OpenAIGenerationOptions`](OpenAIGenerationOptions.md)
- [`GoogleGenerationOptions`](GoogleGenerationOptions.md)
- [`AnthropicGenerationOptions`](AnthropicGenerationOptions.md)

## Properties

### model

> **model**: `string`

Defined in: [types.ts:124](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L124)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:126](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L126)

The maximum number of tokens to generate. Don't want it to ramble on forever, do you?

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:132](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L132)

The sampling temperature. Higher values (e.g., 0.8) make the output more random,
while lower values (e.g., 0.2) make it more focused and deterministic.
A bit like adjusting the chaos knob.

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:137](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L137)

Top-p sampling. It's a way to control the randomness of the output by only considering
the most likely tokens. It's like telling the AI to only pick from the top of the deck.

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:142](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L142)

Top-k sampling. Similar to top-p, but it considers a fixed number of top tokens.
Not all providers support this, because life isn't fair.

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

A list of sequences that will stop the generation. A safe word, if you will.

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The list of tools you're making available to the model.

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:154](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L154)

How the model should choose which tool to use.
'auto': The model decides.
'required': The model must use a tool.
'none': The model can't use any tools.
{ name: 'my_tool' }: Force the model to use a specific tool.
