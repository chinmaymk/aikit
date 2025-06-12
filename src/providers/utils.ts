import type { Content, TextContent, ImageContent, ToolResultContent } from '../types';

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
}
