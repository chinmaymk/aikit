[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / mapStream

# Function: mapStream()

> **mapStream**\<`T`, `U`\>(`stream`, `mapper`): `AsyncGenerator`\<`U`\>

Defined in: [utils.ts:411](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L411)

Transforms stream chunks using a mapper function.
Turn chunks into whatever you want. The power is yours!

## Type Parameters

### T

`T`

### U

`U`

## Parameters

### stream

`AsyncIterable`\<`T`\>

The async iterable stream of chunks

### mapper

(`chunk`) => `U`

Function that transforms each chunk

## Returns

`AsyncGenerator`\<`U`\>

An async generator yielding transformed values

## Example

```typescript
const uppercased = mapStream(stream, chunk => chunk.delta.toUpperCase());
for await (const result of uppercased) {
  console.log(result); // HELLO WORLD
}
```
