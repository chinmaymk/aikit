import type {
  AIProvider,
  Message,
  GoogleConfig,
  GoogleGenerationOptions,
  StreamChunk,
  ToolCall,
  Tool,
} from '../types';

import { MessageTransformer, StreamUtils, DynamicParams } from './utils';
import { APIClient } from './api';

// Local replacement for the Google SDK `FunctionCallingMode` enum
type GoogleFunctionCallingMode = 'AUTO' | 'NONE' | 'ANY';

/**
 * Utility types for request/response payloads (minimal subset)
 */
type GooglePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: DynamicParams } }
  | { functionResponse: { name: string; response: DynamicParams } };

interface GoogleContent {
  role: 'user' | 'model' | 'function';
  parts: GooglePart[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: DynamicParams;
}

interface ModelConfig {
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    candidateCount?: number;
  };
  systemInstruction?: string;
  tools?: Array<{ functionDeclarations: FunctionDeclaration[] }>;
  toolConfig?: DynamicParams;
}

interface GenerateContentRequestBody extends ModelConfig {
  contents: GoogleContent[];
}

interface StreamGenerateContentChunk {
  candidates?: Array<{
    content?: GoogleContent;
    finishReason?: string;
  }>;
}

/**
 * Your gateway to the world of Google's Gemini models.
 * This class is the master translator, converting AIKit's standard format
 * into the specific dialect that Gemini understands. It's like having a
 * personal interpreter for one of the most powerful AIs on the planet.
 *
 * @group Providers
 */
export class GoogleGeminiProvider implements AIProvider<GoogleGenerationOptions> {
  private readonly client: APIClient;
  private readonly apiKey: string;

  /**
   * Initializes the Google Gemini provider.
   * @param config - Your Google API credentials.
   */
  constructor(config: GoogleConfig) {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const headers = { 'Content-Type': 'application/json' };

    this.client = new APIClient(baseUrl, headers);
    this.apiKey = config.apiKey;
  }

  /**
   * Kicks off the generation process with the Gemini API.
   * It transforms the request, makes the call, and processes the stream of
   * consciousness that comes back.
   * @param messages - The conversation history.
   * @param options - Generation options for the request.
   * @returns An async iterable of stream chunks.
   */
  async *generate(
    messages: Message[],
    options: GoogleGenerationOptions
  ): AsyncIterable<StreamChunk> {
    const { endpoint, payload } = this.buildRequest(messages, options);

    const stream = await this.client.stream(endpoint, payload);
    const lineStream = this.client.processStreamAsLines(stream);

    yield* this.processStream(lineStream);
  }

  /**
   * Builds the complete request for the Google API, including the endpoint and payload.
   */
  private buildRequest(
    messages: Message[],
    options: GoogleGenerationOptions
  ): { endpoint: string; payload: GenerateContentRequestBody } {
    const { systemInstruction, googleMessages } = this.transformMessages(messages);
    const modelConfig = this.buildModelConfig(systemInstruction, options);

    const payload: GenerateContentRequestBody = {
      ...modelConfig,
      contents: googleMessages,
    };

    // The key is passed as a query parameter, which is a bit different from other providers.
    const endpoint = `/models/${options.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    return { endpoint, payload };
  }

  /**
   * Processes the stream of responses from Google's API.
   */
  private async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let currentContent = '';
    let pendingToolCalls: ToolCall[] = [];

    for await (const line of lineStream) {
      if (!line.trim() || !line.startsWith('data: ')) continue;

      const data = line.slice(6);
      if (data.trim() === '[DONE]') break;

      const chunk = StreamUtils.parseStreamEvent<StreamGenerateContentChunk>(data);
      if (!chunk) continue;

      const result = this.processChunk(chunk, currentContent, pendingToolCalls);
      if (result) {
        currentContent = result.content;
        // Update pendingToolCalls if new tool calls were added
        if (result.toolCalls) {
          pendingToolCalls = result.toolCalls;
        }
        yield result;
      }
    }
  }

  /**
   * Processes a single chunk from the stream.
   */
  private processChunk(
    chunk: StreamGenerateContentChunk,
    currentContent: string,
    pendingToolCalls: ToolCall[]
  ): StreamChunk | null {
    const candidate = chunk.candidates?.[0];
    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts)) return null;

    let delta = '';
    const newToolCalls: ToolCall[] = [];

    for (const part of candidate.content.parts) {
      if ('text' in part) {
        delta += part.text;
        currentContent += part.text;
      } else if ('functionCall' in part) {
        // For Google Gemini, we use the function name as the ID since Google doesn't provide explicit IDs
        const toolCall: ToolCall = {
          id: part.functionCall.name,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        };
        newToolCalls.push(toolCall);
        pendingToolCalls.push(toolCall);
      }
    }

    // Determine finish reason - if we have function calls, it's tool_use regardless of what Google says
    const hasToolCalls = newToolCalls.length > 0;
    const finishReason = hasToolCalls
      ? ('tool_use' as const)
      : candidate.finishReason
        ? this.mapFinishReason(candidate.finishReason)
        : undefined;

    return MessageTransformer.createStreamChunk(
      currentContent,
      delta,
      hasToolCalls ? pendingToolCalls : undefined,
      finishReason
    );
  }

  /**
   * Maps Google's finish reasons to AIKit format.
   */
  private mapFinishReason(reason: string): 'stop' | 'length' | 'tool_use' | undefined {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'TOOL_CODE_EXECUTED':
        return 'tool_use';
      case 'SAFETY':
        return 'stop';
      case 'RECITATION':
        return 'stop';
      case 'OTHER':
        return 'stop';
      default:
        return 'stop';
    }
  }

  /**
   * Transforms a list of AIKit messages into Google's format.
   * It also separates out the system message, which Google treats as a special instruction.
   */
  private transformMessages(messages: Message[]): {
    systemInstruction: string;
    googleMessages: GoogleContent[];
  } {
    let systemInstruction = '';
    const googleMessages: GoogleContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = MessageTransformer.extractTextContent(msg.content);
        continue;
      }

      const mapped = this.mapMessage(msg);
      if (mapped) {
        if (Array.isArray(mapped)) {
          googleMessages.push(...mapped);
        } else {
          googleMessages.push(mapped);
        }
      }
    }

    return { systemInstruction, googleMessages };
  }

  /**
   * Maps a single AIKit message to Google's format.
   */
  private mapMessage(msg: Message): GoogleContent | GoogleContent[] | null {
    switch (msg.role) {
      case 'system':
        return null;
      case 'tool':
        return this.toolResultToContent(msg);
      case 'user':
      case 'assistant':
        return this.standardMessageToContent(msg);
      default:
        return null;
    }
  }

  /**
   * Converts tool result messages to Google's format.
   */
  private toolResultToContent(msg: Message): GoogleContent[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);

    return toolResults.map(result => ({
      role: 'function' as const,
      parts: [
        {
          functionResponse: {
            name: result.toolCallId,
            response: { result: result.result },
          },
        },
      ],
    }));
  }

  /**
   * Converts standard user/assistant messages to Google's format.
   */
  private standardMessageToContent(msg: Message): GoogleContent {
    const parts: GooglePart[] = [];

    for (const content of msg.content) {
      if (content.type === 'text') {
        parts.push({ text: content.text });
      } else if (content.type === 'image') {
        parts.push({
          inlineData: {
            mimeType: MessageTransformer.detectImageMimeType(content.image),
            data: MessageTransformer.extractBase64Data(content.image),
          },
        });
      }
    }

    // Add tool calls for assistant messages
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const toolCall of msg.toolCalls) {
        parts.push({
          functionCall: {
            name: toolCall.name,
            args: toolCall.arguments,
          },
        });
      }
    }

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts,
    };
  }

  /**
   * Builds the model configuration for the Google API.
   */
  private buildModelConfig(
    systemInstruction: string,
    options: GoogleGenerationOptions
  ): ModelConfig {
    const config: ModelConfig = {
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        maxOutputTokens: options.maxTokens,
        stopSequences: options.stopSequences,
        candidateCount: options.candidateCount,
      },
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (options.tools) {
      config.tools = [{ functionDeclarations: this.formatTools(options.tools) }];
      if (options.toolChoice) {
        config.toolConfig = this.formatToolChoice(options.toolChoice);
      }
    }

    return config;
  }

  /**
   * Formats tools for Google API.
   */
  private formatTools(tools: Tool[]): FunctionDeclaration[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Formats tool choice for Google API.
   */
  private formatToolChoice(toolChoice: GoogleGenerationOptions['toolChoice']) {
    const build = (mode: GoogleFunctionCallingMode) => ({
      functionCallingConfig: { mode },
    });

    if (!toolChoice) return build('AUTO');

    if (toolChoice === 'auto') return build('AUTO');
    if (toolChoice === 'none') return build('NONE');
    if (toolChoice === 'required') return build('ANY');

    if (typeof toolChoice === 'object' && toolChoice.name) {
      return {
        functionCallingConfig: {
          mode: 'ANY' as GoogleFunctionCallingMode,
          allowedFunctionNames: [toolChoice.name],
        },
      };
    }

    return build('AUTO');
  }
}
