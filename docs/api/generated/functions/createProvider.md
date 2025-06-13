[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createProvider

# Function: createProvider()

> **createProvider**\<`T`\>(`type`, `config`): `ProviderMap`\[`T`\]

Defined in: [factory.ts:107](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L107)

The one function to rule them all.
A generic way to create any provider with type safety.
It's like a universal remote for AI.

## Type Parameters

### T

`T` _extends_ keyof `ProviderMap`

## Parameters

### type

`T`

The flavor of AI you're in the mood for: 'openai', 'anthropic', or 'google'.

### config

`ConfigMap`\[`T`\]

The configuration for your chosen flavor.

## Returns

`ProviderMap`\[`T`\]

The specific provider instance for the chosen type.

## Example

```typescript
const openaiProvider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropicProvider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```
