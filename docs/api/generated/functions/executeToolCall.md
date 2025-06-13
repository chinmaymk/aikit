[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / executeToolCall

# Function: executeToolCall()

> **executeToolCall**(`toolCall`, `services`): `string`

Defined in: [utils.ts:602](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L602)

Executes a tool call using provided service functions.
This is how you bridge the gap between AI tool calls and your actual functions.
The AI says "call this function", and this function actually calls it.

## Parameters

### toolCall

[`ToolCall`](../interfaces/ToolCall.md)

The tool call from the AI

### services

`Record`\<`string`, (...`args`) => `any`\>

Object mapping tool names to functions

## Returns

`string`

The JSON stringified result of the tool execution

## Example

```typescript
const services = {
  get_weather: (location: string) => ({ temp: 22, condition: 'sunny' }),
};
const result = executeToolCall(toolCall, services);
```
