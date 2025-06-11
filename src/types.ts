// Content types - simplified
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  image: string; // base64 or data URL
}

export interface ToolResultContent {
  type: 'tool_result';
  toolCallId: string;
  result: string;
}

export type Content = TextContent | ImageContent | ToolResultContent;

// Tools - simplified
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

// Messages - simplified
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: Content[];
  toolCalls?: ToolCall[];
}

// Streaming response - simplified
export interface StreamChunk {
  content: string;
  delta: string;
  finishReason?: 'stop' | 'length' | 'tool_use' | 'error';
  toolCalls?: ToolCall[];
}

export interface GenerationOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  tools?: Tool[];
  toolChoice?: 'auto' | 'required' | 'none' | { name: string };
}

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  project?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  beta?: string[];
}

export interface GoogleConfig {
  apiKey: string;
}

// Provider interface - simple and clean
export interface AIProvider {
  readonly models: string[];
  generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk>;
}

// Base class for providers with strongly typed config
export abstract class BaseAIProvider<TConfig> implements AIProvider {
  protected config: TConfig;
  abstract readonly models: string[];

  constructor(config: TConfig) {
    this.config = config;
  }

  abstract generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk>;
}
