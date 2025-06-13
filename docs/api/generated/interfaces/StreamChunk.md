[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / StreamChunk

# Interface: StreamChunk

Defined in: [types.ts:110](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L110)

A little piece of the streaming response.
It's like getting your data one delicious drop at a time.

## Properties

### content

> **content**: `string`

Defined in: [types.ts:112](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L112)

The full content of the response so far. It's cumulative, like student loan debt.

---

### delta

> **delta**: `string`

Defined in: [types.ts:114](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L114)

The new bit of content that just arrived in this chunk. The delta.

---

### finishReason?

> `optional` **finishReason**: [`FinishReason`](../type-aliases/FinishReason.md)

Defined in: [types.ts:119](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L119)

If the generation is done, this tells you why.
Did it stop gracefully, run out of tokens, or decide to use a tool? The suspense is killing us.

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:121](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L121)

Any tool calls that came through in this chunk. The plot thickens.
