[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createOpenAI

# Function: createOpenAI()

> **createOpenAI**(`config`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:41](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L41)

Summons an AIProvider that speaks fluent OpenAI.
Just give it your credentials and it'll be ready to chat.

## Parameters

### config

[`OpenAIConfig`](../interfaces/OpenAIConfig.md)

The secret handshake (configuration) for the OpenAI API.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider, ready to do your bidding with OpenAI's models.

## Example

```typescript
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
```
