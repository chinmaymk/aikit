[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / generate

# Function: generate()

> **generate**(`provider`, `messages`, `options`): `Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

Defined in: [utils.ts:581](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L581)

Generates a complete response from an AI provider.
This is the main function you'll use for getting AI responses.
It collects all the deltas and gives you the final result.

## Parameters

### provider

[`AIProvider`](../interfaces/AIProvider.md)

The AI provider to use for generation

### messages

[`Message`](../interfaces/Message.md)[]

The conversation messages

### options

`Partial`\<[`GenerationOptions`](../interfaces/GenerationOptions.md)\> = `{}`

Generation options (model, temperature, etc.)

## Returns

`Promise`\<[`StreamResult`](../interfaces/StreamResult.md)\>

A promise that resolves to the complete generation result

## Example

```typescript
const result = await generate(provider, [userText('Hello')], { model: 'gpt-4o' });
console.log(result.content); // The AI's complete response
```
