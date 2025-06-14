import type {
  GenerationOptions,
  Message,
  Tool,
  ToolCall,
  Content,
  StreamChunk,
  StreamResult,
  AnyGenerationProvider,
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
 * Collects all deltas from a stream and returns the complete result.
 * This is the simplest way to convert a stream into a complete response.
 * Perfect for when you want the streaming benefits but need the final result.
 * @param stream - The async iterable stream of chunks
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * const result = await collectDeltas(provider(messages, options));
 * console.log(result.content); // Full generated text
 * ```
 */
export async function collectDeltas(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];

  for await (const chunk of stream) {
    content += chunk.delta;
    if (chunk.reasoning) {
      reasoning += chunk.reasoning.delta;
    }
    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
    }
    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
  }

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
  };
}

/**
 * Collects the complete stream result using the accumulated content from chunks.
 * This is the corrected version that uses chunk.content (already accumulated)
 * instead of manually accumulating chunk.delta values.
 *
 * Use this function when you want the streaming benefits but need the final result.
 * This is more reliable than collectDeltas as it uses the provider's own content accumulation.
 * @param stream - The async iterable stream of chunks
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * const result = await collectStream(provider(messages, options));
 * console.log(result.content); // Full generated text
 * console.log(result.reasoning); // Full reasoning content if available
 * ```
 */
export async function collectStream(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];

  for await (const chunk of stream) {
    // Use the accumulated content from the chunk, not delta accumulation
    content = chunk.content;

    if (chunk.reasoning) {
      // Use the accumulated reasoning content, not delta accumulation
      reasoning = chunk.reasoning.content;
    }

    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
    }

    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
  }

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
  };
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
    onReasoning?: (reasoning: { content: string; delta: string }) => void;
  } = {}
): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];

  for await (const chunk of stream) {
    if (handlers.onChunk) {
      handlers.onChunk(chunk);
    }

    if (handlers.onDelta && chunk.delta) {
      handlers.onDelta(chunk.delta);
    }

    if (handlers.onReasoning && chunk.reasoning) {
      reasoning = chunk.reasoning.content;
      handlers.onReasoning({ content: reasoning, delta: chunk.reasoning.delta });
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

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
  };
}

/**
 * Prints stream deltas to stdout as they arrive.
 * The classic "typewriter effect" - watch the AI think in real-time!
 * Perfect for demos, debugging, or when you just want to see magic happen.
 * @param stream - The async iterable stream of chunks
 * @returns A promise that resolves to the complete stream result
 * @group Stream Helpers
 * @example
 * ```typescript
 * // Simple and magical - just watch it type
 * const result = await printStream(provider(messages, { model: 'gpt-4o' }));
 * console.log('\nFinal result:', result.content);
 * ```
 */
export async function printStream(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  return processStream(stream, {
    onDelta: delta => console.log(delta),
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
 * A utility function that converts an async iterable to a ReadableStream.
 * For when you need to bridge the gap between AIKit streams and Web APIs.
 * Useful in browsers or when working with other streaming libraries.
 * @param stream - The async iterable to convert
 * @returns A ReadableStream that yields the same values
 * @group Stream Helpers
 * @example
 * ```typescript
 * const readableStream = toReadableStream(provider(messages, options));
 * // Now you can pipe it to other web streams
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

    async cancel() {
      if (typeof iterator.return === 'function') {
        await iterator.return();
      }
    },
  });
}

/**
 * A builder class for constructing conversation arrays with method chaining.
 * For when you want your code to read like a conversation.
 * Much more elegant than manually pushing to arrays like a barbarian.
 * @group Message Helpers
 * @example
 * ```typescript
 * const messages = conversation()
 *   .system("You are a helpful assistant")
 *   .user("Hello!")
 *   .assistant("Hi there! How can I help?")
 *   .user("Tell me a joke")
 *   .build();
 * ```
 */
export class ConversationBuilder {
  private messages: Message[] = [];

  /**
   * Add a system message to the conversation.
   * Sets the AI's personality and behavior. Use this to give your AI some character!
   * @param text - The system instruction
   * @returns This builder for chaining
   */
  system(text: string): this {
    this.messages.push(systemText(text));
    return this;
  }

  /**
   * Add a user message to the conversation.
   * This is you talking to the AI. Be nice - it's listening!
   * @param text - The user's message
   * @returns This builder for chaining
   */
  user(text: string): this {
    this.messages.push(userText(text));
    return this;
  }

  /**
   * Add a user message with an image to the conversation.
   * Show, don't tell. Perfect for multimodal interactions.
   * @param text - The text part of the message
   * @param imageData - Base64 encoded image data
   * @returns This builder for chaining
   */
  userWithImage(text: string, imageData: string): this {
    this.messages.push(userImage(text, imageData));
    return this;
  }

  /**
   * Add an assistant message to the conversation.
   * Put words in the AI's mouth. Useful for few-shot examples or continuing conversations.
   * @param text - The assistant's message
   * @returns This builder for chaining
   */
  assistant(text: string): this {
    this.messages.push(assistantText(text));
    return this;
  }

  /**
   * Add a tool result message to the conversation.
   * This is how you tell the AI what happened when it used a tool.
   * Complete the circle of tool calling life.
   * @param toolCallId - The ID of the tool call
   * @param result - The result from executing the tool
   * @returns This builder for chaining
   */
  tool(toolCallId: string, result: string): this {
    this.messages.push(toolResult(toolCallId, result));
    return this;
  }

  /**
   * Add a pre-constructed message to the conversation.
   * For when you need full control or have a message from elsewhere.
   * @param message - The message to add
   * @returns This builder for chaining
   */
  addMessage(message: Message): this {
    this.messages.push(message);
    return this;
  }

  /**
   * Build and return the conversation array.
   * The moment of truth - convert your fluent conversation into the format AIKit expects.
   * @returns The array of messages
   */
  build(): Message[] {
    return [...this.messages];
  }

  /**
   * Clear all messages from the conversation.
   * Start fresh. Sometimes we all need a clean slate.
   * @returns This builder for chaining
   */
  clear(): this {
    this.messages = [];
    return this;
  }
}

/**
 * Creates a new conversation builder.
 * Your entry point to fluent conversation building.
 * Like a conversation starter, but for code.
 * @returns A new ConversationBuilder instance
 * @group Message Helpers
 * @example
 * ```typescript
 * const messages = conversation()
 *   .system("Be helpful and concise")
 *   .user("What's 2+2?")
 *   .build();
 * ```
 */
export const conversation = () => new ConversationBuilder();

/**
 * A convenience function that calls a provider and collects the complete result.
 * For when you want the streaming benefits internally but need the full result.
 * Essentially provider(...args) but with automatic result collection.
 * @param provider - The AI provider function
 * @param messages - The conversation messages
 * @param options - Generation options
 * @returns A promise that resolves to the complete generation result
 * @group Provider Helpers
 * @example
 * ```typescript
 * const result = await generate(provider, messages, { temperature: 0.7 });
 * console.log(result.content);
 * ```
 */
export const generate = async (
  provider: AnyGenerationProvider,
  messages: Message[],
  options: Partial<GenerationOptions> = {}
): Promise<StreamResult> => {
  const stream = provider(messages, options);
  return collectStream(stream);
};

/**
 * Executes a tool call by matching it to a service function.
 * The bridge between AI intentions and real-world actions.
 * Your AI says "call get_weather", this function makes it happen.
 * @param toolCall - The tool call from the AI
 * @param services - Object mapping tool names to actual functions
 * @returns The stringified result of the tool execution
 * @group Tool Helpers
 * @example
 * ```typescript
 * const result = executeToolCall(toolCall, {
 *   get_weather: (location, unit) => getWeatherData(location, unit),
 *   calculate: (expression) => eval(expression) // Don't actually do this!
 * });
 * ```
 */
export const executeToolCall = (
  toolCall: ToolCall,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: Record<string, (...args: any[]) => any>
): string => {
  const service = services[toolCall.name];
  if (!service) {
    throw new Error(`No service found for tool: ${toolCall.name}`);
  }

  try {
    const args =
      typeof toolCall.arguments === 'string' ? JSON.parse(toolCall.arguments) : toolCall.arguments;

    const result = service(...Object.values(args));
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (error) {
    throw new Error(`Tool execution failed: ${error}`);
  }
};
