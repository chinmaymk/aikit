[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / StreamChunk

# Interface: StreamChunk

Defined in: [types.ts:85](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L85)

Represents a chunk of streaming response

## Properties

### content

> **content**: `string`

Defined in: [types.ts:87](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L87)

Full content received so far

***

### delta

> **delta**: `string`

Defined in: [types.ts:89](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L89)

Incremental content for this chunk

***

### finishReason?

> `optional` **finishReason**: `"stop"` \| `"length"` \| `"tool_use"` \| `"error"`

Defined in: [types.ts:91](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L91)

Reason why generation finished (if it did)

***

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:93](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L93)

Tool calls in this chunk
