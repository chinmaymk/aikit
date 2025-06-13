[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicConfig

# Interface: AnthropicConfig

Defined in: [types.ts:302](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L302)

Configuration for the Anthropic provider.
All the deets AIKit needs to talk to Claude.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [types.ts:304](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L304)

Your Anthropic API key. Don't tell anyone.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:306](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L306)

A custom base URL for the API. You know the drill.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:308](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L308)

How long to wait for a response before your patience wears out, in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:310](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L310)

How many times to try again. Third time's the charm?

---

### beta?

> `optional` **beta**: `string`[]

Defined in: [types.ts:312](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L312)

For enabling beta features. Live on the edge.
