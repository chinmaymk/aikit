[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / Tool

# Interface: Tool

Defined in: [types.ts:61](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L61)

Teach the AI new tricks. This is how you define a tool it can use.

## Properties

### name

> **name**: `string`

Defined in: [types.ts:63](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L63)

The name of your shiny new tool. Make it a good one.

---

### description

> **description**: `string`

Defined in: [types.ts:65](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L65)

A description of what the tool does. Be specific. The AI is smart, but not a mind reader.

---

### parameters

> **parameters**: `Record`\<`string`, `unknown`\>

Defined in: [types.ts:70](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L70)

The JSON schema for the tool's parameters.
This is how you tell the AI what knobs and levers your tool has.
