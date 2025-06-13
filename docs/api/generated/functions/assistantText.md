[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / assistantText

# Function: assistantText()

> **assistantText**(`text`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:59](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L59)

Creates an assistant message with text content.
For when you need to put words in the AI's mouth.
Useful for few-shot examples or continuing conversations.

## Parameters

### text

`string`

The assistant's response text

## Returns

[`Message`](../interfaces/Message.md)

A properly formatted assistant message

## Example

```typescript
const message = assistantText('How can I help you today?');
```
