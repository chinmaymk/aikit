[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / Message

# Interface: Message

Defined in: [types.ts:72](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L72)

Represents a message in a conversation

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Defined in: [types.ts:74](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L74)

Role of the message sender

---

### content

> **content**: [`Content`](../type-aliases/Content.md)[]

Defined in: [types.ts:76](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L76)

Content of the message

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:78](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L78)

Tool calls made in this message (for assistant messages)
