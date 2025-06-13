[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / AnthropicOptions

# Interface: AnthropicOptions

Defined in: [types.ts:439](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L439)

Anthropic-specific configuration and generation options.
These can be provided at construction time or generation time.
Generation time options will override construction time options.

## Extends

- [`ProviderOptions`](ProviderOptions.md)

## Properties

### model?

> `optional` **model**: `string`

Defined in: [types.ts:144](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L144)

The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`model`](ProviderOptions.md#model)

---

### maxOutputTokens?

> `optional` **maxOutputTokens**: `number`

Defined in: [types.ts:146](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L146)

The maximum number of output tokens to generate. Don't want it to ramble on forever, do you?

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`maxOutputTokens`](ProviderOptions.md#maxoutputtokens)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types.ts:152](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L152)

The sampling temperature. Higher values (e.g., 0.8) make the output more random,
while lower values (e.g., 0.2) make it more focused and deterministic.
A bit like adjusting the chaos knob.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`temperature`](ProviderOptions.md#temperature)

---

### topP?

> `optional` **topP**: `number`

Defined in: [types.ts:157](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L157)

Top-p sampling. It's a way to control the randomness of the output by only considering
the most likely tokens. It's like telling the AI to only pick from the top of the deck.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`topP`](ProviderOptions.md#topp)

---

### stopSequences?

> `optional` **stopSequences**: `string`[]

Defined in: [types.ts:164](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L164)

A list of sequences that will stop the generation. A safe word, if you will.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`stopSequences`](ProviderOptions.md#stopsequences)

---

### tools?

> `optional` **tools**: [`Tool`](Tool.md)[]

Defined in: [types.ts:166](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L166)

The list of tools you're making available to the model.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`tools`](ProviderOptions.md#tools)

---

### toolChoice?

> `optional` **toolChoice**: \{ `name`: `string`; \} \| `"auto"` \| `"required"` \| `"none"`

Defined in: [types.ts:174](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L174)

How the model should choose which tool to use.
'auto': The model decides.
'required': The model must use a tool.
'none': The model can't use any tools.
{ name: 'my_tool' }: Force the model to use a specific tool.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`toolChoice`](ProviderOptions.md#toolchoice)

---

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [types.ts:183](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L183)

API key for authentication with the provider.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`apiKey`](ProviderOptions.md#apikey)

---

### baseURL?

> `optional` **baseURL**: `string`

Defined in: [types.ts:185](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L185)

Custom base URL for the API endpoint.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`baseURL`](ProviderOptions.md#baseurl)

---

### timeout?

> `optional` **timeout**: `number`

Defined in: [types.ts:187](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L187)

Request timeout in milliseconds.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`timeout`](ProviderOptions.md#timeout)

---

### maxRetries?

> `optional` **maxRetries**: `number`

Defined in: [types.ts:189](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L189)

Maximum number of retry attempts for failed requests.

#### Inherited from

[`ProviderOptions`](ProviderOptions.md).[`maxRetries`](ProviderOptions.md#maxretries)

---

### beta?

> `optional` **beta**: `string`[]

Defined in: [types.ts:441](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L441)

For enabling beta features. Live on the edge.

---

### topK?

> `optional` **topK**: `number`

Defined in: [types.ts:446](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L446)

Top-k sampling. See `GenerationOptions` for the juicy gossip.
It's here because Anthropic supports it too.

#### Overrides

[`ProviderOptions`](ProviderOptions.md).[`topK`](ProviderOptions.md#topk)

---

### container?

> `optional` **container**: `string`

Defined in: [types.ts:448](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L448)

Container identifier for reuse across requests.

---

### mcpServers?

> `optional` **mcpServers**: `object`[]

Defined in: [types.ts:450](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L450)

MCP servers to be utilized in this request.

#### name

> **name**: `string`

#### url

> **url**: `string`

#### authorization_token?

> `optional` **authorization_token**: `string`

#### tool_configuration?

> `optional` **tool_configuration**: `object`

##### tool_configuration.enabled?

> `optional` **enabled**: `boolean`

##### tool_configuration.allowed_tools?

> `optional` **allowed_tools**: `string`[]

---

### metadata?

> `optional` **metadata**: `object`

Defined in: [types.ts:460](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L460)

An object describing metadata about the request.

#### user_id?

> `optional` **user_id**: `string`

---

### serviceTier?

> `optional` **serviceTier**: `"auto"` \| `"standard_only"`

Defined in: [types.ts:467](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L467)

Determines whether to use priority capacity (if available) or standard capacity for this request.
'auto' | 'standard_only'

---

### thinking?

> `optional` **thinking**: \{ `type`: `"enabled"`; `budget_tokens`: `number`; \} \| \{ `type`: `"disabled"`; \}

Defined in: [types.ts:473](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L473)

Configuration for enabling Claude's extended thinking.
When enabled, responses include thinking content blocks showing Claude's thinking process.
Requires a minimum budget of 1,024 tokens.

---

### anthropicVersion?

> `optional` **anthropicVersion**: `string`

Defined in: [types.ts:485](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L485)

The version of the Anthropic API you want to use.
Read more about versioning and version history at https://docs.anthropic.com/en/api/versioning

---

### system?

> `optional` **system**: `string` \| `object`[]

Defined in: [types.ts:491](https://github.com/chinmaymk/aikit/blob/main/src/types.ts#L491)

System prompt content. Can be a string or an array of text blocks.
Provides context and instructions to Claude, such as specifying a particular goal or role.
See the guide to system prompts: https://docs.anthropic.com/en/docs/system-prompts
