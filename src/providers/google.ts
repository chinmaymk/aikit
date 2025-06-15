import type {
  Message,
  StreamChunk,
  Tool,
  ToolCall,
  GoogleOptions,
  WithApiKey,
  StreamingGenerateFunction,
  GenerationUsage,
} from '../types';

import { MessageTransformer, StreamUtils, StreamState, ValidationUtils } from './utils';
import { APIClient } from './api';
import {
  GenerateContentRequestBody,
  StreamGenerateContentChunk,
  GoogleContent,
  GooglePart,
  ModelConfig,
  FunctionDeclaration,
  GoogleFunctionCallingMode,
} from './google.d';

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const GOOGLE_CONSTANTS = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  FINISH_REASON_MAPPINGS: {
    STOP: 'stop',
    MAX_TOKENS: 'length',
    TOOL_CODE_EXECUTED: 'tool_use',
    OTHER: 'stop',
    SAFETY: 'stop',
    RECITATION: 'stop',
  } as const,
} as const;

// ============================================================================
// CLIENT FACTORY
// ============================================================================

export class GoogleClientFactory {
  static createClient(config: WithApiKey<GoogleOptions>): APIClient {
    const headers = { 'Content-Type': 'application/json' };
    return new APIClient(
      config.baseURL ?? GOOGLE_CONSTANTS.BASE_URL,
      headers,
      config.timeout,
      config.maxRetries
    );
  }
}

// ============================================================================
// MESSAGE TRANSFORMERS
// ============================================================================

export class GoogleMessageTransformer {
  static transform(messages: Message[]): {
    systemInstruction: string;
    googleMessages: GoogleContent[];
  } {
    const systemInstructions: string[] = [];
    const googleMessages: GoogleContent[] = [];
    const toolCallIdToName = this.buildToolCallMap(messages);

    for (const msg of messages) {
      if (msg.role === 'system') {
        const systemText = MessageTransformer.extractTextContent(msg.content);
        if (systemText) {
          systemInstructions.push(systemText);
        }
        continue;
      }

      const transformed = this.mapMessage(msg, toolCallIdToName);
      if (transformed) {
        if (Array.isArray(transformed)) {
          googleMessages.push(...transformed);
        } else {
          googleMessages.push(transformed);
        }
      }
    }

    return {
      systemInstruction: systemInstructions.join('\n\n'),
      googleMessages,
    };
  }

  private static buildToolCallMap(messages: Message[]): Map<string, string> {
    const toolCallIdToName = new Map<string, string>();

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.toolCalls) {
        for (const toolCall of msg.toolCalls) {
          toolCallIdToName.set(toolCall.id, toolCall.name);
        }
      }
    }

    return toolCallIdToName;
  }

  private static mapMessage(
    msg: Message,
    toolCallIdToName: Map<string, string>
  ): GoogleContent | GoogleContent[] | null {
    switch (msg.role) {
      case 'system':
        return null; // Already handled in transform
      case 'tool':
        return this.mapToolResultMessage(msg, toolCallIdToName);
      case 'user':
      case 'assistant':
        return this.mapStandardMessage(msg);
      default:
        throw new Error(
          `Unsupported message role '${msg.role}' for Google provider. Supported roles: user, assistant, system, tool`
        );
    }
  }

  private static mapToolResultMessage(
    msg: Message,
    toolCallIdToName: Map<string, string>
  ): GoogleContent[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);

    return toolResults.map(toolResult => ({
      role: 'function' as const,
      parts: [
        {
          functionResponse: {
            name: toolCallIdToName.get(toolResult.toolCallId) || toolResult.toolCallId,
            response: { result: toolResult.result },
          },
        },
      ],
    }));
  }

  private static mapStandardMessage(msg: Message): GoogleContent {
    const parts: GooglePart[] = [];

    // Add text content
    const { text, images } = MessageTransformer.groupContentByType(msg.content);
    if (text.length > 0) {
      const combinedText = text.map(t => t.text).join('\n');
      if (combinedText.trim()) {
        parts.push({ text: combinedText });
      }
    }

    // Add image content
    for (const imageContent of images) {
      if (ValidationUtils.isValidDataUrl(imageContent.image)) {
        const [mimeTypePart, data] = imageContent.image.split(',');
        let mimeType = mimeTypePart.replace('data:', '').replace(';base64', '');

        // Validate and fallback MIME type
        if (!mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        } else {
          const knownFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!knownFormats.includes(mimeType)) {
            mimeType = 'image/jpeg';
          }
        }

        parts.push({
          inlineData: {
            mimeType,
            data,
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
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  }
}

// ============================================================================
// REQUEST BUILDER
// ============================================================================

export class GoogleRequestBuilder {
  static build(
    messages: Message[],
    options: GoogleOptions
  ): {
    endpoint: string;
    payload: GenerateContentRequestBody;
  } {
    const { systemInstruction, googleMessages } = GoogleMessageTransformer.transform(messages);
    const modelConfig = this.buildModelConfig(systemInstruction, options);

    const payload: GenerateContentRequestBody = {
      ...modelConfig,
      contents: googleMessages,
    };

    const endpoint = `/models/${options.model!}:streamGenerateContent?key=${options.apiKey}&alt=sse`;

    return { endpoint, payload };
  }

  private static buildModelConfig(systemInstruction: string, options: GoogleOptions): ModelConfig {
    const config: ModelConfig = {};

    // Add generation config
    const generationConfig = this.buildGenerationConfig(options);
    if (generationConfig && Object.keys(generationConfig).length > 0) {
      config.generationConfig = generationConfig;
    }

    // Add system instruction
    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // Add tools
    if (options.tools) {
      config.tools = [{ functionDeclarations: this.formatTools(options.tools) }];

      if (options.toolChoice) {
        config.toolConfig = { functionCallingConfig: this.formatToolChoice(options.toolChoice) };
      }
    }

    return config;
  }

  private static buildGenerationConfig(options: GoogleOptions): ModelConfig['generationConfig'] {
    const config: ModelConfig['generationConfig'] = {};

    if (options.temperature !== undefined) config.temperature = options.temperature;
    if (options.topP !== undefined) config.topP = options.topP;
    if (options.topK !== undefined) config.topK = options.topK;
    if (options.maxOutputTokens !== undefined) config.maxOutputTokens = options.maxOutputTokens;
    if (options.candidateCount !== undefined) config.candidateCount = options.candidateCount;
    if (options.presencePenalty !== undefined) config.presencePenalty = options.presencePenalty;
    if (options.frequencyPenalty !== undefined) config.frequencyPenalty = options.frequencyPenalty;
    if (options.responseMimeType !== undefined) config.responseMimeType = options.responseMimeType;
    if (options.responseSchema !== undefined) config.responseSchema = options.responseSchema;
    if (options.seed !== undefined) config.seed = options.seed;
    if (options.responseLogprobs !== undefined) config.responseLogprobs = options.responseLogprobs;
    if (options.logprobs !== undefined) config.logprobs = options.logprobs;
    if (options.audioTimestamp !== undefined) config.audioTimestamp = options.audioTimestamp;

    if (options.stopSequences?.length) {
      config.stopSequences = options.stopSequences;
    }

    return config;
  }

  private static formatTools(tools: Tool[]): FunctionDeclaration[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  private static formatToolChoice(toolChoice: GoogleOptions['toolChoice']) {
    const build = (mode: GoogleFunctionCallingMode, allowedFunctionNames?: string[]) => ({
      mode,
      ...(allowedFunctionNames && { allowedFunctionNames }),
    });

    if (toolChoice === 'required') return build('ANY');
    if (toolChoice === 'auto') return build('AUTO');
    if (toolChoice === 'none') return build('NONE');
    if (typeof toolChoice === 'object' && toolChoice && 'name' in toolChoice) {
      return build('ANY', [toolChoice.name]);
    }

    return build('AUTO');
  }
}

// ============================================================================
// STREAM PROCESSOR
// ============================================================================

export class GoogleStreamProcessor {
  static async *process(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    const state = new StreamState();

    for await (const line of lineStream) {
      if (!line.trim() || !line.startsWith('data: ')) continue;

      const data = line.slice(6);
      if (data.trim() === '[DONE]') break;

      const chunk = StreamUtils.parseStreamEvent<StreamGenerateContentChunk>(data);
      if (!chunk) continue;

      const result = this.processChunk(chunk, state);
      if (result) {
        yield result;
      }
    }
  }

  private static processChunk(
    chunk: StreamGenerateContentChunk,
    state: StreamState
  ): StreamChunk | null {
    const usage = this.extractUsage(chunk);
    const candidate = chunk.candidates?.[0];

    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts)) {
      // Return usage-only chunk if available
      if (usage) {
        return state.createChunk('', undefined, usage);
      }
      return null;
    }

    let delta = '';
    const newToolCalls: ToolCall[] = [];

    for (const part of candidate.content.parts) {
      if ('text' in part) {
        delta += part.text;
        state.addContentDelta(part.text);
      } else if ('functionCall' in part) {
        const toolCall: ToolCall = {
          id: part.functionCall.name,
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        };
        newToolCalls.push(toolCall);
        state.hasToolCalls = true;
      }
    }

    const finishReason = candidate.finishReason
      ? this.mapFinishReason(candidate.finishReason)
      : undefined;

    // Enhanced usage with timing when stream completes
    let finalUsage = usage;
    if (finishReason && usage) {
      const timeToFirstToken = state.getTimeToFirstToken();
      finalUsage = {
        ...usage,
        ...(timeToFirstToken !== undefined && { timeToFirstToken }),
        totalTime: Date.now() - state['startTime'],
      };
    }

    return {
      content: state.content,
      delta,
      finishReason,
      toolCalls: newToolCalls.length > 0 ? newToolCalls : state.hasToolCalls ? [] : undefined,
      usage: finalUsage,
    };
  }

  private static mapFinishReason(reason: string): 'stop' | 'length' | 'tool_use' | undefined {
    return (
      (GOOGLE_CONSTANTS.FINISH_REASON_MAPPINGS as Record<string, 'stop' | 'length' | 'tool_use'>)[
        reason
      ] || 'stop'
    );
  }

  private static extractUsage(chunk: StreamGenerateContentChunk): GenerationUsage | undefined {
    const usage = chunk.usageMetadata;
    if (!usage) return undefined;

    const result: GenerationUsage = {};

    if (usage.promptTokenCount) {
      result.inputTokens = usage.promptTokenCount;
    }

    if (usage.candidatesTokenCount) {
      result.outputTokens = usage.candidatesTokenCount;
    }

    if (usage.totalTokenCount) {
      result.totalTokens = usage.totalTokenCount;
    }

    if (usage.cachedContentTokenCount) {
      result.cacheTokens = usage.cachedContentTokenCount;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }
}

// ============================================================================
// MAIN PROVIDER FUNCTIONS
// ============================================================================

/**
 * Creates a Google Gemini generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const google = createGoogle({ apiKey: '...', model: 'gemini-1.5-pro' });
 *
 * // Use like any function
 * const result = await collectDeltas(google([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(google([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createGoogle(
  config: WithApiKey<GoogleOptions>
): StreamingGenerateFunction<Partial<GoogleOptions>> {
  if (!config.apiKey) {
    throw new Error('Google API key is required');
  }

  const client = GoogleClientFactory.createClient(config);
  const { apiKey, ...defaultGenerationOptions } = config;
  const defaultOptions = { apiKey, ...defaultGenerationOptions };

  return async function* google(messages: Message[], options: Partial<GoogleOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const { endpoint, payload } = GoogleRequestBuilder.build(messages, mergedOptions);
    const stream = await client.stream(endpoint, payload);
    const lineStream = client.processStreamAsLines(stream);
    yield* GoogleStreamProcessor.process(lineStream);
  };
}

/**
 * Direct Google function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   google({ apiKey: '...', model: 'gemini-1.5-pro' }, [userText('Hello')])
 * );
 * ```
 */
export async function* google(
  messages: Message[],
  config: WithApiKey<GoogleOptions>
): AsyncIterable<StreamChunk> {
  const provider = createGoogle(config);
  yield* provider(messages);
}
