[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / createGoogle

# Function: createGoogle()

> **createGoogle**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:60](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L60)

Creates a Google Gemini provider instance

## Parameters

### config

[`GoogleConfig`](../interfaces/GoogleConfig.md)

Configuration options for Google Gemini

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider instance configured for Google Gemini

## Example

```typescript
const provider = createGoogle({
  apiKey: process.env.GOOGLE_API_KEY!
});
```
