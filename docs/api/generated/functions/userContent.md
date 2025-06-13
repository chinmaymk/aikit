[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / userContent

# Function: userContent()

> **userContent**(`content`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:116](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L116)

Creates a user message with custom content array.
For when you need full control over the message structure.
The Swiss Army knife of message creation.

## Parameters

### content

[`Content`](../type-aliases/Content.md)[]

Array of content items (text, images, tool results)

## Returns

[`Message`](../interfaces/Message.md)

A user message with the specified content

## Example

```typescript
const message = userContent([
  { type: 'text', text: 'Hello' },
  { type: 'image', image: 'data:image/png;base64,abc' },
]);
```
