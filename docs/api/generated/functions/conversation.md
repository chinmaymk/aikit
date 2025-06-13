[**aikit v0.5.0**](../README.md)

---

[aikit](../README.md) / conversation

# Function: conversation()

> **conversation**(): [`ConversationBuilder`](../classes/ConversationBuilder.md)

Defined in: [utils.ts:564](https://github.com/chinmaymk/aikit/blob/main/src/utils.ts#L564)

Factory function for creating a new ConversationBuilder.
Because sometimes you just want a fresh start.

## Returns

[`ConversationBuilder`](../classes/ConversationBuilder.md)

A new ConversationBuilder instance

## Example

```typescript
const messages = conversation().system('You are helpful').user('Hello').build();
```
