[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / imageContent

# Function: imageContent()

> **imageContent**(`image`): [`Content`](../type-aliases/Content.md)

Defined in: [utils.ts:194](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L194)

Creates image content.
For adding images to your content mix.

## Parameters

### image

`string`

Base64 encoded image data or data URL

## Returns

[`Content`](../type-aliases/Content.md)

An image content object

## Example

```typescript
const content = imageContent('data:image/png;base64,iVBOR...');
```
