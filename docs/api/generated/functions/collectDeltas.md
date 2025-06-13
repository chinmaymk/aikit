[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / collectDeltas

# Function: collectDeltas()

> **collectDeltas**(`stream`): `Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

Defined in: [utils.ts:270](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L270)

Collects all deltas from a stream and accumulates them into final content.
This is the patient way to get your complete response.
Each chunk adds to the previous content, building up the full message.

## Parameters

### stream

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

The async iterable stream of chunks

## Returns

`Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

A promise that resolves to the complete stream result

## Example

```typescript
const result = await collectDeltas(provider.generate(messages, options));
console.log(result.content); // Full generated text
```
