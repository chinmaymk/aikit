[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / userMultipleImages

# Function: userMultipleImages()

> **userMultipleImages**(`text`, `images`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:96](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L96)

Creates a user message with text and multiple images.
For when one picture isn't worth enough words.

## Parameters

### text

`string`

The text part of the message

### images

`string`[]

Array of base64 encoded image data or data URLs

## Returns

[`Message`](../interfaces/Message.md)

A user message with text and multiple image content

## Example

```typescript
const message = userMultipleImages('Compare these images', [
  'data:image/png;base64,abc',
  'data:image/jpg;base64,def',
]);
```
