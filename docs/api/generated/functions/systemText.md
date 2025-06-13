[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / systemText

# Function: systemText()

> **systemText**(`text`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:42](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L42)

Creates a system message with text content.
This is how you set the AI's personality and behavior.
Think of it as the AI's instruction manual.

## Parameters

### text

`string`

The system instruction text

## Returns

[`Message`](../interfaces/Message.md)

A properly formatted system message

## Example

```typescript
const message = systemText('You are a helpful assistant.');
```
