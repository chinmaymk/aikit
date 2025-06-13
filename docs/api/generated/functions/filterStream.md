[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / filterStream

# Function: filterStream()

> **filterStream**\<`T`\>(`stream`, `predicate`): `AsyncGenerator`\<`T`\>

Defined in: [utils.ts:382](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L382)

Filters stream chunks based on a predicate function.
Sometimes you only want certain chunks. Be picky!

## Type Parameters

### T

`T`

## Parameters

### stream

`AsyncIterable`\<`T`\>

The async iterable stream

### predicate

(`chunk`) => `boolean`

Function that returns true for chunks you want to keep

## Returns

`AsyncGenerator`\<`T`\>

An async generator yielding filtered chunks

## Example

```typescript
const filtered = filterStream(stream, chunk => chunk.delta.length > 0);
for await (const chunk of filtered) {
  console.log(chunk.delta);
}
```
