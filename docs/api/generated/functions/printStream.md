[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / printStream

# Function: printStream()

> **printStream**(`stream`): `Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

Defined in: [utils.ts:360](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L360)

Prints stream deltas to stdout as they arrive.
The classic "typewriter effect" - watch the AI think in real-time!
Also logs when the stream finishes. Perfect for CLI applications.

## Parameters

### stream

`AsyncIterable`\<[`StreamChunk`](../interfaces/StreamChunk.md)\>

The async iterable stream of chunks

## Returns

`Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

A promise that resolves to the complete stream result

## Example

```typescript
const result = await printStream(provider.generate(messages, options));
// Prints each character as it arrives, then shows "[Finished: stop]"
```
