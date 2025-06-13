[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createProvider

# Function: createProvider()

> **createProvider**\<`T`\>(`type`, `options`): `ProviderMap`\[`T`\]

Defined in: [factory.ts:115](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L115)

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

### options

`OptionsMap`\[`T`\]

The configuration and default generation options for your chosen flavor.

## Returns

`ProviderMap`\[`T`\]

The specific provider instance for the chosen type.

## Example

```typescript
const openaiProvider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
});

const anthropicProvider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20240620',
});
```
