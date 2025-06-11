[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / Message

# Interface: Message

Defined in: [types.ts:83](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L83)

Represents a message in a conversation

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Defined in: [types.ts:85](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L85)

Role of the message sender

***

### content

> **content**: [`Content`](../type-aliases/Content.md)[]

Defined in: [types.ts:87](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L87)

Content of the message

***

### toolCalls?

> `optional` **toolCalls**: [`ToolCall`](ToolCall.md)[]

Defined in: [types.ts:89](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L89)

Tool calls made in this message (for assistant messages)
