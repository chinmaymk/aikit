[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / GenerationOptions

# Interface: GenerationOptions

Defined in: [types.ts:111](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L111)

Options for text generation

## Properties

### model

> **model**: `string`

Defined in: [types.ts:113](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L113)

Model to use for generation

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:115](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L115)

Maximum number of tokens to generate

***

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:117](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L117)

Sampling temperature (0-2)

***

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:119](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L119)

Top-p sampling parameter

***

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:121](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L121)

Top-k sampling parameter (Google only)

***

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:123](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L123)

Sequences that will stop generation

***

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:125](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L125)

Available tools for function calling

***

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:127](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L127)

How to choose tools ('auto', 'required', 'none', or specific tool)
