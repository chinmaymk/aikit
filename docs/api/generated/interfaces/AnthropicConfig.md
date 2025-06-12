[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicConfig

# Interface: AnthropicConfig

Defined in: [types.ts:227](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L227)

Configuration for the Anthropic provider.
All the deets AIKit needs to talk to Claude.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [types.ts:229](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L229)

Your Anthropic API key. Don't tell anyone.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:231](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L231)

A custom base URL for the API. You know the drill.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:233](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L233)

How long to wait for a response before your patience wears out, in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:235](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L235)

How many times to try again. Third time's the charm?

---

### beta?

> `optional` **beta**: `string`[]

Defined in: [types.ts:237](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L237)

For enabling beta features. Live on the edge.
