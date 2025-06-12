[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createProvider

# Function: createProvider()

> **createProvider**\<`T`\>(`type`, `config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:89](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L89)

The one function to rule them all.
A generic way to create any provider with type safety.
It's like a universal remote for AI.

## Type Parameters

### T

`T` _extends_ `"openai"` \| `"anthropic"` \| `"google"`

## Parameters

### type

`T`

The flavor of AI you're in the mood for: 'openai', 'anthropic', or 'google'.

### config

`T` _extends_ `"openai"` ? [`OpenAIConfig`](../interfaces/OpenAIConfig.md) : `T` _extends_ `"anthropic"` ? [`AnthropicConfig`](../interfaces/AnthropicConfig.md) : [`GoogleConfig`](../interfaces/GoogleConfig.md)

The configuration for your chosen flavor.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, ready for action.

## Example

```typescript
const openaiProvider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropicProvider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```
