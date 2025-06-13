import type {
  AIProvider,
  GenerationOptions,
  Message,
  Tool,
  ToolCall,
  Content,
  StreamChunk,
  StreamResult,
} from './types';

// === Message Creation Helpers ===

/**
 * Creates a user message with text content.
 * The most basic way to tell the AI what you want.
 * @param text - The message text from the user
 * @returns A properly formatted user message
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = userText("Hello, AI!");
 * ```
 */
export const userText = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

/**
 * Creates a system message with text content.
 * This is how you set the AI's personality and behavior.
 * Think of it as the AI's instruction manual.
 * @param text - The system instruction text
 * @returns A properly formatted system message
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = systemText("You are a helpful assistant.");
 * ```
 */
export const systemText = (text: string): Message => ({
  role: 'system',
  content: [{ type: 'text', text }],
});

/**
 * Creates an assistant message with text content.
 * For when you need to put words in the AI's mouth.
 * Useful for few-shot examples or continuing conversations.
 * @param text - The assistant's response text
 * @returns A properly formatted assistant message
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = assistantText("How can I help you today?");
 * ```
 */
export const assistantText = (text: string): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
});

/**
 * Creates a user message with both text and an image.
 * Perfect for asking "What's in this picture?" or similar multimodal queries.
 * @param text - The text part of the message
 * @param imageData - Base64 encoded image data or data URL
 * @returns A user message with text and image content
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = userImage("What's in this image?", "data:image/png;base64,iVBOR...");
 * ```
 */
export const userImage = (text: string, imageData: string): Message => ({
  role: 'user',
  content: [
    { type: 'text', text },
    { type: 'image', image: imageData },
  ],
});

/**
 * Creates a user message with text and multiple images.
 * For when one picture isn't worth enough words.
 * @param text - The text part of the message
 * @param images - Array of base64 encoded image data or data URLs
 * @returns A user message with text and multiple image content
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = userMultipleImages("Compare these images", ["data:image/png;base64,abc", "data:image/jpg;base64,def"]);
 * ```
 */
export const userMultipleImages = (text: string, images: string[]): Message => ({
  role: 'user',
  content: [{ type: 'text', text }, ...images.map(image => ({ type: 'image' as const, image }))],
});

/**
 * Creates a user message with custom content array.
 * For when you need full control over the message structure.
 * The Swiss Army knife of message creation.
 * @param content - Array of content items (text, images, tool results)
 * @returns A user message with the specified content
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = userContent([
 *   { type: 'text', text: 'Hello' },
 *   { type: 'image', image: 'data:image/png;base64,abc' }
 * ]);
 * ```
 */
export const userContent = (content: Content[]): Message => ({
  role: 'user',
  content,
});

/**
 * Creates an assistant message that includes tool calls.
 * For when the AI wants to use its tools. How exciting!
 * @param text - The assistant's message text
 * @param toolCalls - Array of tool calls the assistant wants to make
 * @returns An assistant message with tool calls
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = assistantWithToolCalls("Let me check the weather", [
 *   { id: "call_1", name: "get_weather", arguments: { location: "NYC" } }
 * ]);
 * ```
 */
export const assistantWithToolCalls = (text: string, toolCalls: ToolCall[]): Message => ({
  role: 'assistant',
  content: [{ type: 'text', text }],
  toolCalls,
});

/**
 * Creates a tool result message.
 * This is how you tell the AI what happened when it used a tool.
 * The completion of the tool call circle of life.
 * @param toolCallId - The ID of the tool call this result is for
 * @param result - The result data from the tool execution
 * @returns A tool result message
 * @group Message Helpers
 * @example
 * ```typescript
 * const message = toolResult("call_123", '{"weather": "sunny", "temperature": 22}');
 * ```
 */
export const toolResult = (toolCallId: string, result: string): Message => ({
  role: 'tool',
  content: [
    {
      type: 'tool_result',
      toolCallId,
      result,
    },
  ],
});

// === Content Creation Helpers ===

/**
 * Creates text content.
 * Sometimes you just need plain old text. No shame in that.
 * @param text - The text content
 * @returns A text content object
 * @group Content Helpers
 * @example
 * ```typescript
 * const content = textContent("Hello world");
 * ```
 */
export const textContent = (text: string): Content => ({
  type: 'text',
  text,
});

/**
 * Creates image content.
 * For adding images to your content mix.
 * @param image - Base64 encoded image data or data URL
 * @returns An image content object
 * @group Content Helpers
 * @example
 * ```typescript
 * const content = imageContent("data:image/png;base64,iVBOR...");
 * ```
 */
export const imageContent = (image: string): Content => ({
  type: 'image',
  image,
});

/**
 * Creates tool result content.
 * For when you need to manually craft tool result content.
 * @param toolCallId - The ID of the tool call this result is for
 * @param result - The result data from the tool execution
 * @returns A tool result content object
 * @group Content Helpers
 * @example
 * ```typescript
 * const content = toolResultContent("call_123", "Operation completed successfully");
 * ```
 */
export const toolResultContent = (toolCallId: string, result: string): Content => ({
  type: 'tool_result',
  toolCallId,
  result,
});

// === Tool Creation Helpers ===

/**
 * Creates a tool definition for the AI to use.
 * This is how you teach the AI about your available functions.
 * Be descriptive - the AI needs to understand what your tool does!
 * @param name - The name of the tool (should match your function name)
 * @param description - A clear description of what the tool does
 * @param parameters - The parameters schema for the tool
 * @returns A properly formatted tool definition
 * @group Tool Helpers
 * @example
 * ```typescript
 * const tool = createTool(
 *   "get_weather",
 *   "Get current weather for a location",
 *   {
 *     type: "object",
 *     properties: {
 *       location: { type: "string", description: "City name" },
 *       unit: { type: "string", enum: ["celsius", "fahrenheit"] }
 *     },
 *     required: ["location"]
 *   }
 * );
 * ```
 */
export const createTool = (
  name: string,
  description: string,
  parameters: Record<string, unknown>
): Tool => ({
  name,
  description,
  parameters,
});

/**
 * Collects all deltas from a stream and accumulates them into final content.
 * This is the patient way to get your complete response.
 * Each chunk adds to the previous content, building up the full message.
 * @param stream - The async iterable stream of chunks
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * const result = await collectDeltas(provider.generate(messages, options));
 * console.log(result.content); // Full generated text
 * ```
 */
export async function collectDeltas(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  let content = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];

  for await (const chunk of stream) {
    content += chunk.delta;
    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
    }
    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
  }

  return { content, finishReason, toolCalls };
}

/**
 * Processes a stream with custom handlers for different events.
 * The Swiss Army knife of stream processing. Want to do something
 * special on each chunk? This is your function.
 * @param stream - The async iterable stream of chunks
 * @param handlers - Object with optional event handlers
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * const result = await processStream(stream, {
 *   onDelta: (delta) => process.stdout.write(delta),
 *   onFinish: (reason) => console.log(`Finished: ${reason}`)
 * });
 * ```
 */
export async function processStream(
  stream: AsyncIterable<StreamChunk>,
  handlers: {
    onDelta?: (delta: string) => void;
    onContent?: (content: string) => void;
    onToolCalls?: (toolCalls: StreamChunk['toolCalls']) => void;
    onFinish?: (finishReason: StreamChunk['finishReason']) => void;
    onChunk?: (chunk: StreamChunk) => void;
  } = {}
): Promise<StreamResult> {
  let content = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];

  for await (const chunk of stream) {
    if (handlers.onChunk) {
      handlers.onChunk(chunk);
    }

    if (handlers.onDelta && chunk.delta) {
      handlers.onDelta(chunk.delta);
    }

    content = chunk.content;
    if (handlers.onContent) {
      handlers.onContent(content);
    }

    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
      if (handlers.onToolCalls) {
        handlers.onToolCalls(toolCalls);
      }
    }

    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
      if (handlers.onFinish) {
        handlers.onFinish(finishReason);
      }
    }
  }

  return { content, finishReason, toolCalls };
}

/**
 * Prints stream deltas to stdout as they arrive.
 * The classic "typewriter effect" - watch the AI think in real-time!
 * Also logs when the stream finishes. Perfect for CLI applications.
 * @param stream - The async iterable stream of chunks
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * const result = await printStream(provider.generate(messages, options));
 * // Prints each character as it arrives, then shows "[Finished: stop]"
 * ```
 */
export async function printStream(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  return processStream(stream, {
    onDelta: delta => process.stdout.write(delta),
    onFinish: reason => reason && console.log(`\n[Finished: ${reason}]`),
  });
}

/**
 * Filters stream chunks based on a predicate function.
 * Sometimes you only want certain chunks. Be picky!
 * @param stream - The async iterable stream
 * @param predicate - Function that returns true for chunks you want to keep
 * @returns An async generator yielding filtered chunks
 * @group Stream Helpers
 * @example
 * ```typescript
 * const filtered = filterStream(stream, chunk => chunk.delta.length > 0);
 * for await (const chunk of filtered) {
 *   console.log(chunk.delta);
 * }
 * ```
 */
export async function* filterStream<T>(
  stream: AsyncIterable<T>,
  predicate: (chunk: T) => boolean
): AsyncGenerator<T> {
  for await (const chunk of stream) {
    if (predicate(chunk)) {
      yield chunk;
    }
  }
}

/**
 * Transforms stream chunks using a mapper function.
 * Turn chunks into whatever you want. The power is yours!
 * @param stream - The async iterable stream of chunks
 * @param mapper - Function that transforms each chunk
 * @returns An async generator yielding transformed values
 * @group Stream Helpers
 * @example
 * ```typescript
 * const uppercased = mapStream(stream, chunk => chunk.delta.toUpperCase());
 * for await (const result of uppercased) {
 *   console.log(result); // HELLO WORLD
 * }
 * ```
 */
export async function* mapStream<T, U>(
  stream: AsyncIterable<T>,
  mapper: (chunk: T) => U
): AsyncGenerator<U> {
  for await (const chunk of stream) {
    yield mapper(chunk);
  }
}

/**
 * Converts an async iterable stream to a Web API ReadableStream.
 * For when you need to interface with web APIs that expect ReadableStreams.
 * Bridges the gap between our world and the browser's world.
 * @param stream - The async iterable stream
 * @returns A ReadableStream
 * @group Stream Helpers
 * @example
 * ```typescript
 * const readableStream = toReadableStream(stream);
 * const reader = readableStream.getReader();
 * const { value, done } = await reader.read();
 * ```
 */
export function toReadableStream<T>(stream: AsyncIterable<T>): ReadableStream<T> {
  const iterator = stream[Symbol.asyncIterator]();

  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();

        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * A fluent builder for creating conversation message arrays.
 * Chain methods together to build complex conversations with ease.
 * It's like a conversation, but programmatically constructed!
 * @group Conversation Helpers
 * @example
 * ```typescript
 * const messages = new ConversationBuilder()
 *   .system("You are helpful")
 *   .user("Hello")
 *   .assistant("Hi there!")
 *   .build();
 * ```
 */
export class ConversationBuilder {
  private messages: Message[] = [];

  /**
   * Adds a system message to the conversation.
   * @param text - The system message text
   * @returns This builder instance for chaining
   */
  system(text: string): this {
    this.messages.push(systemText(text));
    return this;
  }

  /**
   * Adds a user message to the conversation.
   * @param text - The user message text
   * @returns This builder instance for chaining
   */
  user(text: string): this {
    this.messages.push(userText(text));
    return this;
  }

  /**
   * Adds a user message with an image to the conversation.
   * @param text - The message text
   * @param imageData - Base64 encoded image data or data URL
   * @returns This builder instance for chaining
   */
  userWithImage(text: string, imageData: string): this {
    this.messages.push(userImage(text, imageData));
    return this;
  }

  /**
   * Adds an assistant message to the conversation.
   * @param text - The assistant message text
   * @returns This builder instance for chaining
   */
  assistant(text: string): this {
    this.messages.push(assistantText(text));
    return this;
  }

  /**
   * Adds a tool result message to the conversation.
   * @param toolCallId - The ID of the tool call this result is for
   * @param result - The result data from the tool execution
   * @returns This builder instance for chaining
   */
  tool(toolCallId: string, result: string): this {
    this.messages.push(toolResult(toolCallId, result));
    return this;
  }

  /**
   * Adds a custom message to the conversation.
   * @param message - The message to add
   * @returns This builder instance for chaining
   */
  addMessage(message: Message): this {
    this.messages.push(message);
    return this;
  }

  /**
   * Builds and returns the conversation as a message array.
   * @returns A copy of the constructed message array
   */
  build(): Message[] {
    return [...this.messages];
  }

  /**
   * Clears all messages from the builder.
   * @returns This builder instance for chaining
   */
  clear(): this {
    this.messages = [];
    return this;
  }
}

/**
 * Factory function for creating a new ConversationBuilder.
 * Because sometimes you just want a fresh start.
 * @returns A new ConversationBuilder instance
 * @group Conversation Helpers
 * @example
 * ```typescript
 * const messages = conversation()
 *   .system("You are helpful")
 *   .user("Hello")
 *   .build();
 * ```
 */
export const conversation = () => new ConversationBuilder();

/**
 * Generates a complete response from an AI provider.
 * This is the main function you'll use for getting AI responses.
 * It collects all the deltas and gives you the final result.
 * @param provider - The AI provider to use for generation
 * @param messages - The conversation messages
 * @param options - Generation options (model, temperature, etc.)
 * @returns A promise that resolves to the complete generation result
 * @group Generation Helpers
 * @example
 * ```typescript
 * const result = await generate(provider, [userText("Hello")], { model: "gpt-4o" });
 * console.log(result.content); // The AI's complete response
 * ```
 */
export const generate = async (
  provider: AIProvider,
  messages: Message[],
  options: Partial<GenerationOptions> = {}
): Promise<StreamResult> => {
  return collectDeltas(provider.generate(messages, options as GenerationOptions));
};

/**
 * Executes a tool call using provided service functions.
 * This is how you bridge the gap between AI tool calls and your actual functions.
 * The AI says "call this function", and this function actually calls it.
 * @param toolCall - The tool call from the AI
 * @param services - Object mapping tool names to functions
 * @returns The JSON stringified result of the tool execution
 * @group Tool Helpers
 * @example
 * ```typescript
 * const services = {
 *   get_weather: (location: string) => ({ temp: 22, condition: "sunny" })
 * };
 * const result = executeToolCall(toolCall, services);
 * ```
 */
export const executeToolCall = (
  toolCall: ToolCall,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: Record<string, (...args: any[]) => any>
): string => {
  const service = services[toolCall.name];
  if (!service) {
    throw new Error(`Unknown tool: ${toolCall.name}`);
  }

  const result = service(...Object.values(toolCall.arguments));
  return JSON.stringify(result);
};
