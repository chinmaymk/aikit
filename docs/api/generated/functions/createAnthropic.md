[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createAnthropic

# Function: createAnthropic()

> **createAnthropic**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:43](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L43)

Whips up an AIProvider that communicates with Anthropic's Claude.
It's thoughtful, helpful, and probably won't start a robot uprising.

## Parameters

### config

[`AnthropicConfig`](../interfaces/AnthropicConfig.md)

The configuration needed to get Claude's attention.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, configured to work with Anthropic's models.

## Example

```typescript
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```
