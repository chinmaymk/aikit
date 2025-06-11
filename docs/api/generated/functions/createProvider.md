[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createProvider

# Function: createProvider()

> **createProvider**\<`T`\>(`type`, `config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:84](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L84)

Generic provider creation with type safety

## Type Parameters

### T

`T` _extends_ `"openai"` \| `"anthropic"` \| `"google"`

## Parameters

### type

`T`

The provider type ('openai', 'anthropic', or 'google')

### config

`T` _extends_ `"openai"` ? [`OpenAIConfig`](../interfaces/OpenAIConfig.md) : `T` _extends_ `"anthropic"` ? [`AnthropicConfig`](../interfaces/AnthropicConfig.md) : [`GoogleConfig`](../interfaces/GoogleConfig.md)

Configuration options for the specified provider

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider instance configured for the specified provider

## Example

```typescript
const openaiProvider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropicProvider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```
