[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / StreamChunk

# Interface: StreamChunk

Defined in: [types.ts:104](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L104)

A little piece of the streaming response.
It's like getting your data one delicious drop at a time.

## Properties

### content

> **content**: `string`

Defined in: [types.ts:106](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L106)

The full content of the response so far. It's cumulative, like student loan debt.

---

### delta

> **delta**: `string`

Defined in: [types.ts:108](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L108)

The new bit of content that just arrived in this chunk. The delta.

---

### finishReason?

> `optional` **finishReason**: `"stop"` \| `"length"` \| `"tool_use"` \| `"error"`

Defined in: [types.ts:113](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L113)

If the generation is done, this tells you why.
Did it stop gracefully, run out of tokens, or decide to use a tool? The suspense is killing us.

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:115](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L115)

Any tool calls that came through in this chunk. The plot thickens.
