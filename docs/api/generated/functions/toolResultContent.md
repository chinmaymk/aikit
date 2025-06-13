[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / toolResultContent

# Function: toolResultContent()

> **toolResultContent**(`toolCallId`, `result`): [`Content`](../type-aliases/Content.md)

Defined in: [utils.ts:211](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L211)

Creates tool result content.
For when you need to manually craft tool result content.

## Parameters

### toolCallId

`string`

The ID of the tool call this result is for

### result

`string`

The result data from the tool execution

## Returns

[`Content`](../type-aliases/Content.md)

A tool result content object

## Example

```typescript
const content = toolResultContent('call_123', 'Operation completed successfully');
```
