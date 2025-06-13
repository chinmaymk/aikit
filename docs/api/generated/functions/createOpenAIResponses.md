[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createOpenAIResponses

# Function: createOpenAIResponses()

> **createOpenAIResponses**(`options`): [`AIProvider`](../interfaces/AIProvider.md)

Defined in: [factory.ts:74](https://github.com/chinmaymk/aikit/blob/main/src/factory.ts#L74)

Creates an OpenAI provider using the Responses API.
This is an alternative to the default Chat Completions API.

## Parameters

### options

[`OpenAIResponsesOptions`](../interfaces/OpenAIResponsesOptions.md)

The configuration and default generation options for the OpenAI Responses API.

## Returns

[`AIProvider`](../interfaces/AIProvider.md)

An AIProvider using OpenAI's Responses API.

## Example

```typescript
const openaiResponses = createOpenAIResponses({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  reasoning: { effort: 'high' },
});
```
