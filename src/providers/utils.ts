import type {
  Content,
  TextContent,
  ImageContent,
  ToolResultContent,
  ToolCall,
  StreamChunk,
  FinishReason,
  Tool,
  GenerationUsage,
} from '../types';

/**
 * Interface for objects with string keys and unknown values.
 * @internal
 */
interface StringKeyedObject {
  [key: string]: unknown;
}

/**
 * Interface for dynamic parameters with string keys.
 * @internal
 */
export interface DynamicParams {
  [key: string]: unknown;
}

/**
 * A handy little interface for when you need to sort your content into neat piles.
 * @internal
 */
export interface GroupedContent {
  text: TextContent[];
  images: ImageContent[];
  toolResults: ToolResultContent[];
}

/**
 * A collection of static methods for transforming and manipulating messages.
 * These are the humble worker bees of the message transformation process.
 * @internal
 */
export class MessageTransformer {
  /**
   * Plucks the text content from a content array.
   * Because sometimes you just want the words.
   * @param content - An array of content parts.
   * @returns The text content, or an empty string if there is none.
   */
  static extractTextContent(content: Content[]): string {
    const textContent = content.find(c => c.type === 'text') as TextContent;
    return textContent?.text ?? '';
  }

  /**
   * Groups content parts by their type.
   * It's like a bouncer for your content, sending each type to its own VIP section.
   * @param content - An array of content parts.
   * @returns A `GroupedContent` object with the content sorted by type.
   */
  static groupContentByType(content: Content[]): GroupedContent {
    return {
      text: content.filter(c => c.type === 'text') as TextContent[],
      images: content.filter(c => c.type === 'image') as ImageContent[],
      toolResults: content.filter(c => c.type === 'tool_result') as ToolResultContent[],
    };
  }

  /**
   * Strips the 'data:image/...' prefix from a data URL.
   * Because sometimes you just want the raw data, without the fancy packaging.
   * @param dataUrl - The data URL to clean up.
   * @returns The base64 encoded data.
   */
  static extractBase64Data(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
  }

  /**
   * Safely parses JSON with a fallback value.
   * Because JSON.parse can be a bit dramatic when things go wrong.
   * @param jsonString - The JSON string to parse.
   * @param fallback - What to return if parsing fails.
   * @returns The parsed object or the fallback value.
   */
  static parseJson<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  }

  /**
   * Detects the MIME type of an image from a data URL.
   * It's like a sommelier for images - can tell you what you're looking at.
   * @param dataUrl - The data URL to analyze.
   * @returns The detected MIME type, with jpeg as fallback.
   */
  static detectImageMimeType(dataUrl: string): string {
    if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'image/jpeg';
    if (dataUrl.includes('image/png')) return 'image/png';
    if (dataUrl.includes('image/gif')) return 'image/gif';
    if (dataUrl.includes('image/webp')) return 'image/webp';
    return 'image/jpeg'; // fallback
  }

  /**
   * Creates a properly structured StreamChunk.
   * The assembly line for stream chunks - consistent quality guaranteed.
   * @param content - The full content so far.
   * @param delta - The new bit of content.
   * @param toolCalls - Any tool calls in this chunk.
   * @param finishReason - Why the generation stopped, if it did.
   * @param reasoning - Reasoning content for this chunk.
   * @returns A properly formed StreamChunk.
   */
  static createStreamChunk(
    content: string,
    delta: string,
    toolCalls?: ToolCall[],
    finishReason?: FinishReason,
    reasoning?: { content: string; delta: string },
    usage?: GenerationUsage
  ): StreamChunk {
    const chunk: StreamChunk = { content, delta };

    if (toolCalls !== undefined) chunk.toolCalls = toolCalls;
    if (finishReason !== undefined) chunk.finishReason = finishReason;
    if (reasoning !== undefined) chunk.reasoning = reasoning;
    if (usage !== undefined) chunk.usage = usage;

    return chunk;
  }
}

/**
 * Utilities for handling streaming data.
 * The plumbing specialists of the streaming world.
 * @internal
 */
export class StreamUtils {
  /**
   * Parses a stream event from JSON, with graceful error handling.
   * Because streams can be unpredictable, like cats.
   * @param data - The raw data from the stream.
   * @returns The parsed event or null if parsing fails.
   */
  static parseStreamEvent<T>(data: string): T | null {
    if (!data.trim() || data.trim() === '[DONE]') return null;
    return MessageTransformer.parseJson(data, null);
  }

  /**
   * Checks if a stream data line indicates completion.
   * The end-of-stream detector.
   * @param data - The data line to check.
   * @returns True if this marks the end of the stream.
   */
  static isStreamDone(data: string): boolean {
    return data.trim() === '[DONE]';
  }
}

/**
 * Stream processing state management class.
 * Handles common stream state operations across all providers.
 * @internal
 */
export class StreamState {
  content = '';
  reasoning: string | null = null;
  toolCallStates: Record<string, { name: string; arguments: string }> = {};
  accumulatingArgs: Record<string, string> = {};
  outputIndexToCallId: Record<number, string> = {};
  hasToolCalls = false;
  private startTime: number;
  private firstTokenTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add content delta to the stream state.
   * @param delta - The new content to add.
   */
  addContentDelta(delta: string): void {
    // Track first token timing
    if (delta && !this.firstTokenTime) {
      this.firstTokenTime = Date.now();
    }
    this.content += delta;
  }

  /**
   * Add reasoning delta and return reasoning object for streaming.
   * @param delta - The reasoning delta to add.
   * @returns Reasoning object with delta and full content.
   */
  addReasoningDelta(delta: string): { delta: string; content: string } {
    // Track first token timing for reasoning too
    if (delta && !this.firstTokenTime) {
      this.firstTokenTime = Date.now();
    }
    this.reasoning = this.reasoning === null ? delta : this.reasoning + delta;
    return { delta, content: this.reasoning };
  }

  /**
   * Get the time to first token in milliseconds.
   * @returns Time to first token in milliseconds, or undefined if no token received yet.
   */
  getTimeToFirstToken(): number | undefined {
    return this.firstTokenTime ? this.firstTokenTime - this.startTime : undefined;
  }

  /**
   * Get final reasoning state for completion chunks.
   * @returns Reasoning object or undefined if no reasoning content.
   */
  getFinalReasoning(): { delta: string; content: string } | undefined {
    return this.reasoning !== null ? { delta: '', content: this.reasoning } : undefined;
  }

  /**
   * Initialize or update a tool call state.
   * @param id - Tool call ID.
   * @param name - Tool call name.
   */
  initToolCall(id: string, name: string): void {
    this.toolCallStates[id] = { name, arguments: '' };
    this.hasToolCalls = true;
  }

  /**
   * Add arguments to an existing tool call.
   * @param id - Tool call ID.
   * @param args - Partial arguments to add.
   */
  addToolCallArgs(id: string, args: string): void {
    if (this.toolCallStates[id]) {
      this.toolCallStates[id].arguments += args;
    }
  }

  /**
   * Finalize all tool calls and return them as ToolCall objects.
   * @returns Array of finalized tool calls or undefined if none.
   */
  finalizeToolCalls(): ToolCall[] | undefined {
    const entries = Object.entries(this.toolCallStates);
    if (entries.length === 0) return undefined;

    return entries.map(([id, state]) => ({
      id,
      name: state.name,
      arguments: MessageTransformer.parseJson(state.arguments, {}),
    }));
  }

  /**
   * Create a stream chunk with current state.
   * @param delta - Content delta for this chunk.
   * @param finishReason - Finish reason if applicable.
   * @param usage - Usage information if available.
   * @returns Properly formed stream chunk.
   */
  createChunk(delta: string, finishReason?: FinishReason, usage?: GenerationUsage): StreamChunk {
    const toolCalls = finishReason ? this.finalizeToolCalls() : undefined;
    const reasoning = finishReason ? this.getFinalReasoning() : undefined;

    // Include timing information in usage when stream is completing
    let enhancedUsage = usage;
    if (finishReason) {
      const timeToFirstToken = this.getTimeToFirstToken();
      const totalTime = Date.now() - this.startTime;

      enhancedUsage = {
        ...usage,
        ...(timeToFirstToken != null && { timeToFirstToken }),
        totalTime,
      };
    }

    return MessageTransformer.createStreamChunk(
      this.content,
      delta,
      toolCalls,
      finishReason,
      reasoning,
      enhancedUsage
    );
  }
}

/**
 * Validation utilities for common data types.
 * The quality control department.
 * @internal
 */
export class ValidationUtils {
  /**
   * Validates if a string is a proper data URL for images.
   * Because not all strings claiming to be images are trustworthy.
   * @param url - The URL to validate.
   * @returns True if it looks like a valid image data URL.
   */
  static isValidDataUrl(url: string): boolean {
    return url.startsWith('data:image/') && url.includes('base64,');
  }

  /**
   * Validates if an object looks like a proper tool call.
   * The bouncer for tool calls - checks IDs at the door.
   * @param toolCall - The object to validate.
   * @returns True if it has the right shape for a tool call.
   */
  static isValidToolCall(toolCall: unknown): boolean {
    return !!(
      toolCall &&
      typeof toolCall === 'object' &&
      'id' in toolCall &&
      'name' in toolCall &&
      typeof (toolCall as StringKeyedObject).id === 'string' &&
      typeof (toolCall as StringKeyedObject).name === 'string'
    );
  }
}

/**
 * Common utilities for building API requests across providers.
 * @internal
 */
export class RequestBuilder {
  /**
   * Add optional parameters to request object if they exist.
   * @param params - The request parameters object to modify.
   * @param options - The options object containing potential values.
   * @param mappings - Object mapping option keys to param keys.
   */
  static addOptionalParams<T extends Record<string, unknown>, U extends Record<string, unknown>>(
    params: T,
    options: U,
    mappings: Record<keyof U, keyof T>
  ): void {
    for (const [optionKey, paramKey] of Object.entries(mappings)) {
      const value = options[optionKey as keyof U];
      if (value !== undefined) {
        (params as Record<string, unknown>)[paramKey as string] = value;
      }
    }
  }

  /**
   * Format tools for API requests.
   * @param tools - The tools to format.
   * @param formatType - The format type ('openai' or 'responses').
   * @returns Formatted tools array.
   */
  static formatTools(tools: Tool[], formatType: 'openai' | 'responses'): unknown[] {
    if (formatType === 'openai') {
      return tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    return tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Format tool choice for API requests.
   * @param toolChoice - The tool choice configuration.
   * @param formatType - The format type ('openai' or 'responses').
   * @returns Formatted tool choice.
   */
  static formatToolChoice(
    toolChoice: string | { name: string } | undefined,
    formatType: 'openai' | 'responses'
  ): unknown {
    if (!toolChoice) return 'auto';

    if (typeof toolChoice === 'string') {
      if (formatType === 'openai') {
        return toolChoice === 'none' ? 'none' : toolChoice;
      }
      return toolChoice === 'none' ? 'auto' : toolChoice;
    }

    if (formatType === 'openai') {
      return { type: 'function', function: { name: toolChoice.name } };
    }

    return { type: 'function', name: toolChoice.name };
  }
}

/**
 * Common utilities for processing API responses.
 * @internal
 */
export class ResponseProcessor {
  /**
   * Map finish reasons from provider-specific values to standard FinishReason.
   * @param reason - The provider-specific finish reason.
   * @param mapping - Mapping object from provider reasons to standard reasons.
   * @returns Standard FinishReason.
   */
  static mapFinishReason(reason: string, mapping: Record<string, FinishReason>): FinishReason {
    return mapping[reason] || 'stop';
  }

  /**
   * Process stream lines to extract data events.
   * @param lineStream - Stream of lines from the API.
   * @param extractFn - Function to extract data from each line.
   * @returns Async iterable of extracted data.
   */
  static async *processStreamLines<T>(
    lineStream: AsyncIterable<string>,
    extractFn: (line: string) => T | null
  ): AsyncIterable<T> {
    for await (const line of lineStream) {
      const data = extractFn(line);
      if (data !== null) yield data;
    }
  }
}
