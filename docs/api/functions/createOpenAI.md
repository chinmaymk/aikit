[**aikit v0.5.0**](../README.md)

***

[aikit](../README.md) / createOpenAI

# Function: createOpenAI()

> **createOpenAI**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:22](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L22)

Creates an OpenAI provider instance

## Parameters

### config

[`OpenAIConfig`](../interfaces/OpenAIConfig.md)

Configuration options for OpenAI

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider instance configured for OpenAI

## Example

```typescript
const provider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});
```
