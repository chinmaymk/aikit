[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / toReadableStream

# Function: toReadableStream()

> **toReadableStream**\<`T`\>(`stream`): `ReadableStream`\<`T`\>

Defined in: [utils.ts:431](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L431)

Converts an async iterable stream to a Web API ReadableStream.
For when you need to interface with web APIs that expect ReadableStreams.
Bridges the gap between our world and the browser's world.

## Type Parameters

### T

`T`

## Parameters

### stream

`AsyncIterable`\<`T`\>

The async iterable stream

## Returns

`ReadableStream`\<`T`\>

A ReadableStream

## Example

```typescript
const readableStream = toReadableStream(stream);
const reader = readableStream.getReader();
const { value, done } = await reader.read();
```
