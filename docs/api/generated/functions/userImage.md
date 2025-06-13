[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / userImage

# Function: userImage()

> **userImage**(`text`, `imageData`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:76](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L76)

Creates a user message with both text and an image.
Perfect for asking "What's in this picture?" or similar multimodal queries.

## Parameters

### text

`string`

The text part of the message

### imageData

`string`

Base64 encoded image data or data URL

## Returns

[`Message`](../interfaces/Message.md)

A user message with text and image content

## Example

```typescript
const message = userImage("What's in this image?", 'data:image/png;base64,iVBOR...');
```
