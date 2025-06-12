import type {
  AIProvider,
  Message,
  GoogleConfig,
  GoogleGenerationOptions,
  StreamChunk,
  ToolCall,
  Tool,
  GenerationOptions,
} from '../types';

import { MessageTransformer } from './utils';
import { APIClient } from './api';
import { extractDataLines } from './api';

// Local replacement for the Google SDK `FunctionCallingMode` enum
type GoogleFunctionCallingMode = 'AUTO' | 'NONE' | 'ANY';

// Google-specific utility classes
class ToolChoiceHandler {
  static formatForGoogle(toolChoice: GenerationOptions['toolChoice'] | undefined) {
    const build = (mode: GoogleFunctionCallingMode) => ({
      functionCallingConfig: { mode },
    });

    if (!toolChoice) return build('AUTO' as GoogleFunctionCallingMode);

    if (toolChoice === 'auto') return build('AUTO' as GoogleFunctionCallingMode);
    if (toolChoice === 'none') return build('NONE' as GoogleFunctionCallingMode);
    if (toolChoice === 'required') return build('ANY' as GoogleFunctionCallingMode);

    if (typeof toolChoice === 'object' && toolChoice.name) {
      return {
        functionCallingConfig: {
          mode: 'ANY' as GoogleFunctionCallingMode,
          allowedFunctionNames: [toolChoice.name],
        },
      };
    }

    return build('AUTO' as GoogleFunctionCallingMode);
  }
}

type FinishReason = 'stop' | 'length' | 'tool_use' | 'error';

class FinishReasonMapper {
  static mapGoogle(reason: string): FinishReason {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'TOOL_CODE_EXECUTED':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}

// Google Gemini provider implementation

/**
 * Utility types for request/response payloads (minimal subset)
 */
type GooglePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

interface GoogleContent {
  role: 'user' | 'model' | 'function';
  parts: GooglePart[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
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
  toolConfig?: Record<string, unknown>;
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
  private readonly transformer: GoogleMessageTransformer;
  private readonly streamProcessor: GoogleStreamProcessor;

  /**
   * A handy list of Gemini models we've tested.
   * This isn't an exhaustive list, so feel free to venture off the beaten path.
   * Just don't be surprised if you encounter a grue.
   */
  readonly models = [
    // The latest and greatest
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',

    // Specific versions of 1.5
    'gemini-1.5-pro',
    'gemini-1.5-flash',

    // The trusty old guard
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  /**
   * Initializes the Google Gemini provider.
   * @param config - Your Google API credentials.
   */
  constructor(config: GoogleConfig) {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const headers = { 'Content-Type': 'application/json' };

    this.client = new APIClient(baseUrl, headers);
    this.transformer = new GoogleMessageTransformer(config.apiKey);
    this.streamProcessor = new GoogleStreamProcessor();
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
    const { endpoint, payload } = this.transformer.buildRequest(messages, options);

    const stream = await this.client.stream(endpoint, payload);
    const lineStream = this.client.processStreamAsLines(stream);

    yield* this.streamProcessor.processStream(lineStream);
  }
}

/**
 * The master artisan who forges AIKit requests into the format Google's API desires.
 * This class handles all the intricate details of message and option transformation.
 * @internal
 */
class GoogleMessageTransformer {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Builds the complete request for the Google API, including the endpoint and payload.
   * @param messages - The AIKit messages.
   * @param options - The AIKit generation options.
   * @returns An object containing the endpoint and the request payload.
   */
  buildRequest(
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
   * Transforms a list of AIKit messages into Google's format.
   * It also separates out the system message, which Google treats as a special instruction.
   * @param messages - The messages to transform.
   * @returns An object with the system instruction and the transformed messages.
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
        if (Array.isArray(mapped)) googleMessages.push(...mapped);
        else googleMessages.push(mapped);
      }
    }

    return { systemInstruction, googleMessages };
  }

  /**
   * The main dispatcher for message mapping. It decides which transformation
   * function to call based on the message role.
   * @param msg - The message to map.
   * @returns A transformed Google content object, or an array of them.
   */
  private mapMessage(msg: Message): GoogleContent | GoogleContent[] | null {
    switch (msg.role) {
      case 'tool':
        return this.toolResultToContent(msg);
      case 'assistant':
      case 'user':
        return this.standardMessageToContent(msg);
      default:
        // If we don't know the role, we'll just skip it.
        return null;
    }
  }

  /**
   * Transforms a tool result message into Google's `function` role format.
   * @param msg - The tool message.
   * @returns An array of Google content objects.
   */
  private toolResultToContent(msg: Message): GoogleContent[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map(tr => ({
      role: 'function',
      parts: [
        {
          functionResponse: {
            // Google doesn't have a tool call ID, so we have to improvise
            // and embed the function name in the response. A bit of a hack,
            // but it gets the job done.
            name: tr.toolCallId,
            response: { result: tr.result },
          },
        },
      ],
    }));
  }

  /**
   * Transforms a standard user or assistant message into Google's format.
   * @param msg - The message to transform.
   * @returns A single Google content object.
   */
  private standardMessageToContent(msg: Message): GoogleContent {
    const parts: GooglePart[] = [];

    // Regular text / image parts
    for (const c of msg.content) {
      if (c.type === 'text') parts.push({ text: c.text });
      else if (c.type === 'image') {
        parts.push({
          inlineData: {
            // Google is particular about image formats. We do our best to comply.
            mimeType: this.detectImageMimeType(c.image),
            data: c.image.replace(/^data:image\/[^;]+;base64,/, ''),
          },
        });
      }
    }

    // Assistant tool calls are also parts of the message content.
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        parts.push({
          functionCall: { name: tc.id, args: tc.arguments },
        });
      }
    }

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts,
    };
  }

  /**
   * Detects the mime type of an image from its data URL.
   * A handy little utility for keeping Google's API happy.
   * @param dataUrl - The data URL of the image.
   * @returns The detected mime type.
   */
  private detectImageMimeType(dataUrl: string): string {
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,/);
    return match ? match[1] : 'image/jpeg'; // Default to jpeg if all else fails.
  }

  /**
   * Builds the model configuration part of the request.
   * This includes generation parameters, tools, and system instructions.
   * @param systemInstruction - The system message.
   * @param options - The generation options.
   * @returns A model configuration object.
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
      config.toolConfig = ToolChoiceHandler.formatForGoogle(options.toolChoice);
    }

    return config;
  }

  /**
   * Formats AIKit tools into Google's function declaration format.
   * @param tools - The tools to format.
   * @returns An array of function declarations.
   */
  private formatTools(tools: Tool[]): FunctionDeclaration[] {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}

/**
 * The stream processor for Google's API.
 * It takes the raw stream of server-sent events and masterfully
 * transforms it into a sequence of structured AIKit stream chunks.
 * It's the zen master of stream processing.
 * @internal
 */
class GoogleStreamProcessor {
  /**
   * Processes the raw stream from the API and yields structured chunks.
   * @param lineStream - An async iterable of raw data lines.
   * @returns An async iterable of AIKit stream chunks.
   */
  async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    let toolCalls: ToolCall[] = [];

    for await (const line of extractDataLines(lineStream)) {
      try {
        const chunk: StreamGenerateContentChunk = JSON.parse(line);
        const result = this.processChunk(chunk, content, toolCalls);
        if (result) {
          content = result.content;
          toolCalls = result.toolCalls || [];
          yield result;
        }
      } catch (e) {
        // Ignore malformed JSON. The stream is a wild place.
        continue;
      }
    }
  }

  /**
   * Processes a single chunk from the stream.
   * @param chunk - The parsed chunk from the stream.
   * @param currentContent - The content accumulated so far.
   * @param toolCalls - The tool calls accumulated so far.
   * @returns A new stream chunk, or null if the chunk was empty.
   */
  private processChunk(
    chunk: StreamGenerateContentChunk,
    currentContent: string,
    toolCalls: ToolCall[]
  ): StreamChunk | null {
    if (!chunk.candidates || chunk.candidates.length === 0) return null;
    const candidate = chunk.candidates[0];
    if (!candidate.content) return null;

    let delta = '';
    const newToolCalls: ToolCall[] = [...toolCalls];

    for (const part of candidate.content.parts) {
      if ('text' in part && part.text) {
        delta += part.text;
      } else if ('functionCall' in part && part.functionCall) {
        // Since Google sends the full tool call in a single chunk,
        // we can just add it to our list.
        newToolCalls.push({
          id: part.functionCall.name,
          name: part.functionCall.name.split('/')[0],
          arguments: part.functionCall.args,
        });
      }
    }

    const finishReason = candidate.finishReason
      ? FinishReasonMapper.mapGoogle(candidate.finishReason)
      : undefined;

    return {
      content: currentContent + delta,
      delta,
      finishReason,
      toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined,
    };
  }
}
