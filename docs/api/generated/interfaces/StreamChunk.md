[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / StreamChunk

# Interface: StreamChunk

Defined in: [types.ts:96](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L96)

Represents a chunk of streaming response

## Properties

### content

> **content**: `string`

Defined in: [types.ts:98](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L98)

Full content received so far

---

### delta

> **delta**: `string`

Defined in: [types.ts:100](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L100)

Incremental content for this chunk

---

### finishReason?

> `optional` **finishReason**: `"stop"` \| `"length"` \| `"tool_use"` \| `"error"`

Defined in: [types.ts:102](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L102)

Reason why generation finished (if it did)

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:104](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L104)

Tool calls in this chunk
