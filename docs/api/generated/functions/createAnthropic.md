[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createAnthropic

# Function: createAnthropic()

> **createAnthropic**(`options`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:65](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L65)

Whips up an AIProvider that communicates with Anthropic's Claude.
It's thoughtful, helpful, and probably won't start a robot uprising.

## Parameters

### options

[`AnthropicOptions`](../interfaces/AnthropicOptions.md)

The configuration and default generation options for Anthropic's API.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, configured to work with Anthropic's models.

## Example

```typescript
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20240620', // Default model
  maxTokens: 1000, // Default max tokens
});
```
