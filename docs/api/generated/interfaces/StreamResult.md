[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / StreamResult

# Interface: StreamResult

Defined in: [types.ts:129](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L129)

The final result of collecting a stream of chunks.
Everything you need to know about what the AI just generated.

## Properties

### content

> **content**: `string`

Defined in: [types.ts:131](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L131)

The complete generated content.

---

### finishReason?

> `optional` **finishReason**: [`FinishReason`](../type-aliases/FinishReason.md)

Defined in: [types.ts:133](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L133)

Why the generation stopped, if it did.

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:135](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L135)

Any tool calls that were made during generation.
