[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / ToolCall

# Interface: ToolCall

Defined in: [types.ts:83](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L83)

The AI has decided to use one of your tools. This is the moment we've all been waiting for.

## Properties

### id

> **id**: `string`

Defined in: [types.ts:85](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L85)

A unique ID for this specific tool invocation. Keep it safe.

---

### name

> **name**: `string`

Defined in: [types.ts:87](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L87)

The name of the tool the model wants to use.

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types.ts:89](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L89)

The arguments the model is passing to your tool. Handle with care.
