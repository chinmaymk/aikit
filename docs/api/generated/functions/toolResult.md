[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / toolResult

# Function: toolResult()

> **toolResult**(`toolCallId`, `result`): [`Message`](../interfaces/Message.md)

Defined in: [utils.ts:154](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L154)

Creates a tool result message.
This is how you tell the AI what happened when it used a tool.
The completion of the tool call circle of life.

## Parameters

### toolCallId

`string`

The ID of the tool call this result is for

### result

`string`

The result data from the tool execution

## Returns

[`Message`](../interfaces/Message.md)

A tool result message

## Example

```typescript
const message = toolResult('call_123', '{"weather": "sunny", "temperature": 22}');
```
