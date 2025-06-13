[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / userText

# Function: userText()

> **userText**(`text`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:25](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L25)

Creates a user message with text content.
The most basic way to tell the AI what you want.

## Parameters

### text

`string`

The message text from the user

## Returns

[`Message`](../interfaces/Message.md)

A properly formatted user message

## Example

```typescript
const message = userText('Hello, AI!');
```
