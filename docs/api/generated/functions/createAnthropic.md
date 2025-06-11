[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createAnthropic

# Function: createAnthropic()

> **createAnthropic**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:41](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L41)

Creates an Anthropic provider instance

## Parameters

### config

[`AnthropicConfig`](../interfaces/AnthropicConfig.md)

Configuration options for Anthropic

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider instance configured for Anthropic

## Example

```typescript
const provider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```
