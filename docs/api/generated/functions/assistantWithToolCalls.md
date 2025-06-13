[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / assistantWithToolCalls

# Function: assistantWithToolCalls()

> **assistantWithToolCalls**(`text`, `toolCalls`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:135](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L135)

Creates an assistant message that includes tool calls.
For when the AI wants to use its tools. How exciting!

## Parameters

### text

`string`

The assistant's message text

### toolCalls

[`ToolCall`](../interfaces/ToolCall.md)[]

Array of tool calls the assistant wants to make

## Returns

[`Message`](../interfaces/Message.md)

An assistant message with tool calls

## Example

```typescript
const message = assistantWithToolCalls('Let me check the weather', [
  { id: 'call_1', name: 'get_weather', arguments: { location: 'NYC' } },
]);
```
