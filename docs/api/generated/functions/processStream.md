[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / processStream

# Function: processStream()

> **processStream**(`stream`, `handlers`): `Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

Defined in: [utils.ts:304](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L304)

Processes a stream with custom handlers for different events.
The Swiss Army knife of stream processing. Want to do something
special on each chunk? This is your function.

## Parameters

### stream

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

The async iterable stream of chunks

### handlers

Object with optional event handlers

#### onDelta?

(`delta`) => `void`

#### onContent?

(`content`) => `void`

#### onToolCalls?

(`toolCalls`) => `void`

#### onFinish?

(`finishReason`) => `void`

#### onChunk?

(`chunk`) => `void`

## Returns

`Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

A promise that resolves to the complete stream result

## Example

```typescript
const result = await processStream(stream, {
  onDelta: delta => process.stdout.write(delta),
  onFinish: reason => console.log(`Finished: ${reason}`),
});
```
