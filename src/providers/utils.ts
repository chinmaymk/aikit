import type {
  Content,
  TextContent,
  ImageContent,
  ToolResultContent,
  ToolCall,
  StreamChunk,
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
   * @returns A properly formed StreamChunk.
   */
  static createStreamChunk(
    content: string,
    delta: string,
    toolCalls?: ToolCall[],
    finishReason?: 'stop' | 'length' | 'tool_use' | 'error'
  ): StreamChunk {
    return { content, delta, toolCalls, finishReason };
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
