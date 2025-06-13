[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / createTool

# Function: createTool()

> **createTool**(`name`, `description`, `parameters`): [`Tool`](../interfaces/Tool.md)

Defined in: [utils.ts:244](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L244)

Creates a tool definition for the AI to use.
This is how you teach the AI about your available functions.
Be descriptive - the AI needs to understand what your tool does!

## Parameters

### name

`string`

The name of the tool (should match your function name)

### description

`string`

A clear description of what the tool does

### parameters

`Record`\<`string`, `unknown`\>

The parameters schema for the tool

## Returns

[`Tool`](../interfaces/Tool.md)

A properly formatted tool definition

## Example

```typescript
const tool = createTool('get_weather', 'Get current weather for a location', {
  type: 'object',
  properties: {
    location: { type: 'string', description: 'City name' },
    unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
  },
  required: ['location'],
});
```
