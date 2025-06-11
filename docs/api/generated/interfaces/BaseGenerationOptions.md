[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / BaseGenerationOptions

# Interface: BaseGenerationOptions

Defined in: [types.ts:110](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L110)

Common generation options shared by all providers.

## Extended by

- [`OpenAIGenerationOptions`](OpenAIGenerationOptions.md)
- [`GoogleGenerationOptions`](GoogleGenerationOptions.md)
- [`AnthropicGenerationOptions`](AnthropicGenerationOptions.md)

## Properties

### model

> **model**: `string`

Defined in: [types.ts:112](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L112)

Model to use for generation

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:114](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L114)

Maximum number of tokens to generate

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:116](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L116)

Sampling temperature (0-2)

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:118](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L118)

Top-p sampling parameter

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:120](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L120)

Top-k sampling parameter (Google, Anthropic)

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:122](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L122)

Sequences that will stop generation

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:124](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L124)

Available tools for function calling

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:126](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L126)

How to choose tools ('auto', 'required', 'none', or specific tool)
