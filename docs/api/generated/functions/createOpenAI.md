[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createOpenAI

# Function: createOpenAI()

> **createOpenAI**(`options`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:43](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L43)

Summons an AIProvider that speaks fluent OpenAI.
Just give it your credentials and it'll be ready to chat.

## Parameters

### options

[`OpenAIOptions`](../interfaces/OpenAIOptions.md)

The configuration and default generation options for the OpenAI API.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, ready to do your bidding with OpenAI's models.

## Example

```typescript
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o', // Default model
  temperature: 0.7, // Default temperature
});
```
