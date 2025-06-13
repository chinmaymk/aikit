[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / ToolResultContent

# Interface: ToolResultContent

Defined in: [types.ts:47](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L47)

The model used a tool, and this is what it brought back.
Like a cat presenting you with a mouse, but hopefully more useful.

## Properties

### type

> **type**: `"tool_result"`

Defined in: [types.ts:49](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L49)

A tool result. The circle of life continues.

---

### toolCallId

> **toolCallId**: `string`

Defined in: [types.ts:51](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L51)

The ID of the tool call this is a response to. So we know which cat to praise.

---

### result

> **result**: `string`

Defined in: [types.ts:53](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L53)

The glorious result of the tool's hard work.
