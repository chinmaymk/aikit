/**
 * Text content for messages
 * @group Types
 */
export interface TextContent {
  /** Content type identifier */
  type: 'text';
  /** The text content */
  text: string;
}

/**
 * Image content for multimodal messages
 * @group Types
 */
export interface ImageContent {
  /** Content type identifier */
  type: 'image';
  /** Base64 encoded image or data URL */
  image: string;
}

/**
 * Tool result content for tool responses
 * @group Types
 */
export interface ToolResultContent {
  /** Content type identifier */
  type: 'tool_result';
  /** ID of the tool call this result corresponds to */
  toolCallId: string;
  /** The result of the tool execution */
  result: string;
}

/**
 * Union type representing all possible content types
 * @group Types
 */
export type Content = TextContent | ImageContent | ToolResultContent;

/**
 * Tool definition for function calling
 * @group Types
 */
export interface Tool {
  /** Name of the tool/function */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON schema for the tool parameters */
  parameters: Record<string, unknown>;
}

/**
 * Represents a tool call made by the AI model
 * @group Types
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Arguments passed to the tool */
  arguments: Record<string, unknown>;
}

/**
 * Represents a message in a conversation
 * @group Types
 */
export interface Message {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Content of the message */
  content: Content[];
  /** Tool calls made in this message (for assistant messages) */
  toolCalls?: ToolCall[];
}

/**
 * Represents a chunk of streaming response
 * @group Types
 */
export interface StreamChunk {
  /** Full content received so far */
  content: string;
  /** Incremental content for this chunk */
  delta: string;
  /** Reason why generation finished (if it did) */
  finishReason?: 'stop' | 'length' | 'tool_use' | 'error';
  /** Tool calls in this chunk */
  toolCalls?: ToolCall[];
}

/**
 * Options for text generation
 * @group Types
 */
export interface GenerationOptions {
  /** Model to use for generation */
  model: string;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Top-k sampling parameter (Google only) */
  topK?: number;
  /** Sequences that will stop generation */
  stopSequences?: string[];
  /** Available tools for function calling */
  tools?: Tool[];
  /** How to choose tools ('auto', 'required', 'none', or specific tool) */
  toolChoice?: 'auto' | 'required' | 'none' | { name: string };
}

/**
 * Configuration options for OpenAI provider
 * @group Interfaces
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Custom base URL for API requests */
  baseURL?: string;
  /** OpenAI organization ID */
  organization?: string;
  /** OpenAI project ID */
  project?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
}

/**
 * Configuration options for Anthropic provider
 * @group Interfaces
 */
export interface AnthropicConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Custom base URL for API requests */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Beta features to enable */
  beta?: string[];
}

/**
 * Configuration options for Google Gemini provider
 * @group Interfaces
 */
export interface GoogleConfig {
  /** Google AI API key */
  apiKey: string;
}

/**
 * Core interface implemented by all AI providers
 * @group Interfaces
 */
export interface AIProvider {
  /** List of available models for this provider */
  readonly models: string[];

  /**
   * Generate streaming response for given messages
   * @param messages - Array of conversation messages
   * @param options - Generation options including model and parameters
   * @returns Async iterable of stream chunks
   */
  generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk>;
}
