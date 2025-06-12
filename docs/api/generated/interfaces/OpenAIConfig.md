[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIConfig

# Interface: OpenAIConfig

Defined in: [types.ts:207](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L207)

Configuration for the OpenAI provider.
This is how you tell AIKit where to find your OpenAI API key and other secrets.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [types.ts:209](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L209)

Your OpenAI API key. Keep it secret, keep it safe.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:211](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L211)

A custom base URL for the API. For proxies and other fun stuff.

---

### organization?

> `optional` **organization**: `string`

Defined in: [types.ts:213](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L213)

Your OpenAI organization ID. For when you're part of a fancy club.

---

### project?

> `optional` **project**: `string`

Defined in: [types.ts:215](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L215)

Your OpenAI project ID. For even fancier clubs.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:217](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L217)

How long to wait for a response before giving up, in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:219](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L219)

How many times to retry a failed request. Because sometimes the internet blinks.
