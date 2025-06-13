[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / ConversationBuilder

# Class: ConversationBuilder

Defined in: [utils.ts:465](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L465)

A fluent builder for creating conversation message arrays.
Chain methods together to build complex conversations with ease.
It's like a conversation, but programmatically constructed!

## Example

```typescript
const messages = new ConversationBuilder()
  .system('You are helpful')
  .user('Hello')
  .assistant('Hi there!')
  .build();
```

## Constructors

### Constructor

> **new ConversationBuilder**(): `ConversationBuilder`

#### Returns

`ConversationBuilder`

## Methods

### system()

> **system**(`text`): `this`

Defined in: [utils.ts:473](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L473)

Adds a system message to the conversation.

#### Parameters

##### text

`string`

The system message text

#### Returns

`this`

This builder instance for chaining

---

### user()

> **user**(`text`): `this`

Defined in: [utils.ts:483](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L483)

Adds a user message to the conversation.

#### Parameters

##### text

`string`

The user message text

#### Returns

`this`

This builder instance for chaining

---

### userWithImage()

> **userWithImage**(`text`, `imageData`): `this`

Defined in: [utils.ts:494](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L494)

Adds a user message with an image to the conversation.

#### Parameters

##### text

`string`

The message text

##### imageData

`string`

Base64 encoded image data or data URL

#### Returns

`this`

This builder instance for chaining

---

### assistant()

> **assistant**(`text`): `this`

Defined in: [utils.ts:504](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L504)

Adds an assistant message to the conversation.

#### Parameters

##### text

`string`

The assistant message text

#### Returns

`this`

This builder instance for chaining

---

### tool()

> **tool**(`toolCallId`, `result`): `this`

Defined in: [utils.ts:515](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L515)

Adds a tool result message to the conversation.

#### Parameters

##### toolCallId

`string`

The ID of the tool call this result is for

##### result

`string`

The result data from the tool execution

#### Returns

`this`

This builder instance for chaining

---

### addMessage()

> **addMessage**(`message`): `this`

Defined in: [utils.ts:525](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L525)

Adds a custom message to the conversation.

#### Parameters

##### message

[`Message`](../interfaces/Message.md)

The message to add

#### Returns

`this`

This builder instance for chaining

---

### build()

> **build**(): [`Message`](../interfaces/Message.md)[]

Defined in: [utils.ts:534](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L534)

Builds and returns the conversation as a message array.

#### Returns

[`Message`](../interfaces/Message.md)[]

A copy of the constructed message array

---

### clear()

> **clear**(): `this`

Defined in: [utils.ts:542](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L542)

Clears all messages from the builder.

#### Returns

`this`

This builder instance for chaining
