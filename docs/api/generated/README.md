**aikit v0.5.0**

---

# aikit v0.5.0

## Factory Functions

- [createOpenAI](functions/createOpenAI.md)
- [createOpenAIResponses](functions/createOpenAIResponses.md)
- [createAnthropic](functions/createAnthropic.md)
- [createGoogle](functions/createGoogle.md)
- [createProvider](functions/createProvider.md)

## Types

- [FinishReason](type-aliases/FinishReason.md)
- [TextContent](interfaces/TextContent.md)
- [ImageContent](interfaces/ImageContent.md)
- [ToolResultContent](interfaces/ToolResultContent.md)
- [Content](type-aliases/Content.md)
- [Tool](interfaces/Tool.md)
- [ToolCall](interfaces/ToolCall.md)
- [Message](interfaces/Message.md)
- [StreamChunk](interfaces/StreamChunk.md)
- [StreamResult](interfaces/StreamResult.md)

## Interfaces

- [GenerationOptions](interfaces/GenerationOptions.md)
- [ProviderOptions](interfaces/ProviderOptions.md)
- [OpenAIResponsesOptions](interfaces/OpenAIResponsesOptions.md)
- [OpenAIOptions](interfaces/OpenAIOptions.md)
- [GoogleOptions](interfaces/GoogleOptions.md)
- [AnthropicOptions](interfaces/AnthropicOptions.md)
- [AIProvider](interfaces/AIProvider.md)

## Content Helpers

- [textContent](functions/textContent.md)
- [imageContent](functions/imageContent.md)
- [toolResultContent](functions/toolResultContent.md)

## Conversation Helpers

- [ConversationBuilder](classes/ConversationBuilder.md)
- [conversation](functions/conversation.md)

## Generation Helpers

- [generate](functions/generate.md)

## Message Helpers

- [userText](functions/userText.md)
- [systemText](functions/systemText.md)
- [assistantText](functions/assistantText.md)
- [userImage](functions/userImage.md)
- [userMultipleImages](functions/userMultipleImages.md)
- [userContent](functions/userContent.md)
- [assistantWithToolCalls](functions/assistantWithToolCalls.md)
- [toolResult](functions/toolResult.md)

## Providers

- [AnthropicProvider](classes/AnthropicProvider.md)
- [GoogleGeminiProvider](classes/GoogleGeminiProvider.md)
- [OpenAIProvider](classes/OpenAIProvider.md)
- [OpenAIResponsesProvider](classes/OpenAIResponsesProvider.md)

## Stream Helpers

- [collectDeltas](functions/collectDeltas.md)
- [processStream](functions/processStream.md)
- [printStream](functions/printStream.md)
- [filterStream](functions/filterStream.md)
- [mapStream](functions/mapStream.md)
- [toReadableStream](functions/toReadableStream.md)

## Tool Helpers

- [createTool](functions/createTool.md)
- [executeToolCall](functions/executeToolCall.md)
