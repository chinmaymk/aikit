[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createGoogle

# Function: createGoogle()

> **createGoogle**(`options`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:118](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L118)

Assembles an AIProvider for Google's Gemini.
Get ready for some of that Google magic.

## Parameters

### options

[`GoogleOptions`](../interfaces/GoogleOptions.md)

The configuration and default generation options for Google's API.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, geared up for Gemini.

## Example

```typescript
const google = createGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-1.5-pro', // Default model
  temperature: 0.8, // Default temperature
});
```
