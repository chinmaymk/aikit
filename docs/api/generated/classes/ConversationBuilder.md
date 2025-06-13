[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / ConversationBuilder

# Class: ConversationBuilder

Defined in: [utils.ts:468](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L468)

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

Defined in: [utils.ts:476](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L476)

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

Defined in: [utils.ts:486](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L486)

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

Defined in: [utils.ts:497](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L497)

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

Defined in: [utils.ts:507](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L507)

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

Defined in: [utils.ts:518](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L518)

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

Defined in: [utils.ts:528](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L528)

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

Defined in: [utils.ts:537](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L537)

Builds and returns the conversation as a message array.

#### Returns

[`Message`](../interfaces/Message.md)[]

A copy of the constructed message array

---

### clear()

> **clear**(): `this`

Defined in: [utils.ts:545](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L545)

Clears all messages from the builder.

#### Returns

`this`

This builder instance for chaining
