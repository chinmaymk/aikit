[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createGoogle

# Function: createGoogle()

> **createGoogle**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:63](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L63)

Assembles an AIProvider for Google's Gemini.
Get ready for some of that Google magic.

## Parameters

### config

[`GoogleConfig`](../interfaces/GoogleConfig.md)

The keys to the Google AI kingdom.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, geared up for Gemini.

## Example

```typescript
const google = createGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
});
```
