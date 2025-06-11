[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / GenerationOptions

# Interface: GenerationOptions

Defined in: [types.ts:100](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L100)

Options for text generation

## Properties

### model

> **model**: `string`

Defined in: [types.ts:102](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L102)

Model to use for generation

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:104](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L104)

Maximum number of tokens to generate

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:106](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L106)

Sampling temperature (0-2)

***

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:108](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L108)

Top-p sampling parameter

***

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:110](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L110)

Top-k sampling parameter (Google only)

***

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:112](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L112)

Sequences that will stop generation

***

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:114](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L114)

Available tools for function calling

***

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:116](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L116)

How to choose tools ('auto', 'required', 'none', or specific tool)
