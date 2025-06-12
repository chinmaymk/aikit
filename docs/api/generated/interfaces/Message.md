[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / Message

# Interface: Message

Defined in: [types.ts:90](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L90)

A single message in a conversation. It's a bit like a text message, but with more structured data.

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Defined in: [types.ts:92](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L92)

Who's talking? A user, the assistant, the system, or a tool.

---

### content

> **content**: [`Content`](../type-aliases/Content.md)[]

Defined in: [types.ts:94](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L94)

The actual content of the message. It's an array, because life is complicated.

---

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:96](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L96)

If the assistant is calling a tool, the details will be in here.
