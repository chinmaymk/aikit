[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / GoogleGenerationOptions

# Interface: GoogleGenerationOptions

Defined in: [types.ts:138](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L138)

Google Gemini-specific generation options

## Extends

- [`BaseGenerationOptions`](BaseGenerationOptions.md)

## Properties

### model

> **model**: `string`

Defined in: [types.ts:112](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L112)

Model to use for generation

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`model`](BaseGenerationOptions.md#model)

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types.ts:114](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L114)

Maximum number of tokens to generate

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`maxTokens`](BaseGenerationOptions.md#maxtokens)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:116](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L116)

Sampling temperature (0-2)

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`temperature`](BaseGenerationOptions.md#temperature)

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:118](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L118)

Top-p sampling parameter

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`topP`](BaseGenerationOptions.md#topp)

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:122](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L122)

Sequences that will stop generation

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`stopSequences`](BaseGenerationOptions.md#stopsequences)

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:124](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L124)

Available tools for function calling

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`tools`](BaseGenerationOptions.md#tools)

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:126](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L126)

How to choose tools ('auto', 'required', 'none', or specific tool)

#### Inherited from

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`toolChoice`](BaseGenerationOptions.md#toolchoice)

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:140](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L140)

Top-k sampling parameter

#### Overrides

[`BaseGenerationOptions`](BaseGenerationOptions.md).[`topK`](BaseGenerationOptions.md#topk)

---

### candidateCount?

> `optional` **candidateCount**: `number`

Defined in: [types.ts:142](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L142)

Number of candidates to generate
