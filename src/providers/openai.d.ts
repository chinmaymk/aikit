import type { Tool } from '../types';

export namespace OpenAI {
  // Base configuration types
  export interface BaseConfig {
    apiKey: string;
    baseURL?: string;
    organization?: string;
    project?: string;
    timeout?: number;
    maxRetries?: number;
    mutateHeaders?: (headers: Record<string, string>) => void;
  }

  // Chat Completions API Types
  export namespace Chat {
    export interface CreateParams {
      model: string;
      messages: MessageParam[];
      stream: true;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      stop?: string[];
      presence_penalty?: number;
      frequency_penalty?: number;
      user?: string;
      logprobs?: boolean;
      top_logprobs?: number;
      seed?: number;
      response_format?: ResponseFormat;
      logit_bias?: Record<string, number>;
      n?: number;
      stream_options?: StreamOptions;
      tools?: Tool[];
      tool_choice?: ToolChoice;
      parallel_tool_calls?: boolean;
      reasoning?: ReasoningConfig;
    }

    export interface MessageParam {
      role: 'system' | 'user' | 'assistant' | 'developer' | 'tool';
      content: string | ContentPart[] | null;
      tool_calls?: ToolCallParam[];
      tool_call_id?: string;
    }

    export interface ContentPart {
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }

    export interface ToolCallParam {
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }

    export interface ChatTool {
      type: 'function';
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }

    export interface ResponseFormat {
      type: 'text' | 'json_object' | 'json_schema';
      json_schema?: {
        name: string;
        description?: string;
        schema?: Record<string, unknown>;
        strict?: boolean;
      };
    }

    export interface StreamOptions {
      include_usage?: boolean;
    }

    export type ToolChoice =
      | 'auto'
      | 'required'
      | 'none'
      | {
          type: 'function';
          function: { name: string };
        };

    export interface ReasoningConfig {
      effort?: 'low' | 'medium' | 'high';
    }

    export interface StreamChunk {
      choices: {
        delta: {
          content?: string;
          tool_calls?: ToolCallDelta[];
          reasoning?: string;
        };
        finish_reason?: string;
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_tokens_details?: {
          cached_tokens?: number;
        };
        completion_tokens_details?: {
          reasoning_tokens?: number;
        };
      };
    }

    export interface ToolCallDelta {
      index?: number;
      id?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
      type?: 'function';
    }
  }

  // Responses API Types
  export namespace Responses {
    export interface CreateParams {
      model: string;
      input: ResponsesMessage[];
      stream: true;
      max_output_tokens?: number;
      temperature?: number;
      top_p?: number;
      tools?: ResponsesTool[];
      tool_choice?: ResponsesToolChoice;
      background?: boolean;
      include?: string[];
      instructions?: string;
      metadata?: Record<string, string>;
      parallel_tool_calls?: boolean;
      previous_response_id?: string;
      reasoning?: { effort?: 'low' | 'medium' | 'high' };
      service_tier?: 'auto' | 'default' | 'flex';
      store?: boolean;
      text?: {
        format?: {
          type: 'text' | 'json_object' | 'json_schema';
          json_schema?: Record<string, unknown>;
        };
      };
      truncation?: 'auto' | 'disabled';
      user?: string;
    }

    export type ResponsesMessage =
      | { role: 'system' | 'user' | 'assistant'; content: ContentPart[] }
      | FunctionCall
      | FunctionCallOutput;

    export interface FunctionCall {
      type: 'function_call';
      call_id: string;
      name: string;
      arguments: string;
    }

    export interface FunctionCallOutput {
      type: 'function_call_output';
      call_id: string;
      output: string;
    }

    export type ContentPart =
      | { type: 'input_text'; text: string }
      | { type: 'input_image'; image_url: string }
      | { type: 'output_text'; text: string }
      | { type: 'function_call'; call_id: string; name: string; arguments: Record<string, unknown> }
      | { type: 'function_call_output'; call_id: string; output: string };

    export interface ResponsesTool {
      type: 'function';
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }

    export type ResponsesToolChoice =
      | 'auto'
      | 'required'
      | {
          type: 'function';
          name: string;
        };

    export type StreamEvent =
      | { type: 'response.output_text.delta'; delta: string }
      | {
          type: 'response.output_item.added';
          response_id: string;
          output_index: number;
          item: {
            type: 'function_call';
            id: string;
            call_id: string;
            name: string;
            arguments: string;
          };
        }
      | {
          type: 'response.function_call_arguments.delta';
          response_id: string;
          item_id: string;
          output_index: number;
          call_id: string;
          delta: string;
        }
      | {
          type: 'response.function_call_arguments.done';
          response_id: string;
          item_id: string;
          output_index: number;
          call_id: string;
          arguments: string;
        }
      | {
          type: 'response.completed';
          response: { status: string };
        };
  }

  // Embeddings API Types
  export namespace Embeddings {
    export interface CreateParams {
      model: string;
      input: string[];
      dimensions?: number;
      encoding_format?: 'float' | 'base64';
      user?: string;
    }

    export interface APIResponse {
      data: { embedding: number[] }[];
      model: string;
      usage?: {
        prompt_tokens: number;
        total_tokens: number;
      };
    }
  }
}
