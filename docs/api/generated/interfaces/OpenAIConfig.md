[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / OpenAIConfig

# Interface: OpenAIConfig

Defined in: [types.ts:282](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L282)

Configuration for the OpenAI provider.
This is how you tell AIKit where to find your OpenAI API key and other secrets.

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [types.ts:284](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L284)

Your OpenAI API key. Keep it secret, keep it safe.

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:286](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L286)

A custom base URL for the API. For proxies and other fun stuff.

---

### organization?

> `optional` **organization**: `string`

Defined in: [types.ts:288](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L288)

Your OpenAI organization ID. For when you're part of a fancy club.

---

### project?

> `optional` **project**: `string`

Defined in: [types.ts:290](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L290)

Your OpenAI project ID. For even fancier clubs.

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:292](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L292)

How long to wait for a response before giving up, in milliseconds.

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:294](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L294)

How many times to retry a failed request. Because sometimes the internet blinks.
