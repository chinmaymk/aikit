import type {
  Message,
  StreamChunk,
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
} from './google.d';

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

export class GoogleClientFactory {
  static createClient(config: WithApiKey<GoogleOptions>): APIClient {
    return new APIClient(
      config.baseURL ?? GOOGLE_CONSTANTS.BASE_URL,
      { 'Content-Type': 'application/json' },
      config.timeout,
      config.maxRetries,
      config.mutateHeaders
    );
  }
}

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
        if (systemText) systemInstructions.push(systemText);
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

    return { systemInstruction: systemInstructions.join('\n\n'), googleMessages };
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
        return null;
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
    const { text, images } = MessageTransformer.groupContentByType(msg.content);

    // Handle multiple text blocks separately to preserve structure
    for (const textContent of text) {
      if (textContent.text.trim()) {
        parts.push({ text: textContent.text });
      }
    }

    // Handle images
    for (const imageContent of images) {
      if (ValidationUtils.isValidDataUrl(imageContent.image)) {
        const [mimeTypePart, data] = imageContent.image.split(',');
        let mimeType = mimeTypePart.replace('data:', '').replace(';base64', '');

        if (!mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        } else {
          const knownFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
          if (!knownFormats.includes(mimeType)) mimeType = 'image/jpeg';
        }

        parts.push({ inlineData: { mimeType, data } });
      }
    }

    // Handle tool calls for assistant messages
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

export class GoogleRequestBuilder {
  static build(
    messages: Message[],
    options: GoogleOptions
  ): { endpoint: string; payload: GenerateContentRequestBody } {
    const { systemInstruction, googleMessages } = GoogleMessageTransformer.transform(messages);
    const modelConfig = this.buildModelConfig(systemInstruction, options);
    const payload: GenerateContentRequestBody = { ...modelConfig, contents: googleMessages };
    const endpoint = `/models/${options.model!}:streamGenerateContent?key=${options.apiKey}&alt=sse`;
    return { endpoint, payload };
  }

  private static buildModelConfig(systemInstruction: string, options: GoogleOptions): ModelConfig {
    const config: ModelConfig = {};
    const generationConfig = this.buildGenerationConfig(options);
    if (generationConfig && Object.keys(generationConfig).length > 0)
      config.generationConfig = generationConfig;
    if (systemInstruction) config.systemInstruction = { parts: [{ text: systemInstruction }] };
    if (options.tools) {
      config.tools = [
        {
          functionDeclarations: options.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ];
      if (options.toolChoice)
        config.toolConfig = { functionCallingConfig: this.formatToolChoice(options.toolChoice) };
    }
    return config;
  }

  private static buildGenerationConfig(options: GoogleOptions): ModelConfig['generationConfig'] {
    const config: ModelConfig['generationConfig'] = {};
    const directMappings: Array<keyof GoogleOptions> = [
      'temperature',
      'topP',
      'topK',
      'maxOutputTokens',
      'candidateCount',
      'presencePenalty',
      'frequencyPenalty',
      'responseMimeType',
      'responseSchema',
      'seed',
      'responseLogprobs',
      'logprobs',
      'audioTimestamp',
    ];
    for (const key of directMappings) {
      if (options[key] !== undefined) (config as any)[key] = options[key];
    }
    if (options.stopSequences?.length) config.stopSequences = options.stopSequences;
    return config;
  }

  private static formatToolChoice(toolChoice: GoogleOptions['toolChoice']) {
    if (toolChoice === 'required') return { mode: 'ANY' };
    if (toolChoice === 'auto') return { mode: 'AUTO' };
    if (toolChoice === 'none') return { mode: 'NONE' };
    if (typeof toolChoice === 'object' && toolChoice && 'name' in toolChoice) {
      return { mode: 'ANY', allowedFunctionNames: [toolChoice.name] };
    }
    return { mode: 'AUTO' };
  }
}

export class GoogleStreamProcessor {
  static async *process(
    lineStream: AsyncIterable<string>,
    state?: StreamState
  ): AsyncIterable<StreamChunk> {
    const streamState = state ?? new StreamState();
    for await (const line of lineStream) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data.trim() === '[DONE]') break;
      const chunk = StreamUtils.parseStreamEvent<StreamGenerateContentChunk>(data);
      if (!chunk) continue;
      const result = this.processChunk(chunk, streamState);
      if (result) yield result;
    }
  }

  private static processChunk(
    chunk: StreamGenerateContentChunk,
    state: StreamState
  ): StreamChunk | null {
    const usage = this.extractUsage(chunk);
    const candidate = chunk.candidates?.[0];
    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts)) {
      return usage ? state.createChunk('', undefined, usage) : null;
    }
    let delta = '';
    const newToolCalls: ToolCall[] = [];
    for (const part of candidate.content.parts) {
      if ('text' in part) {
        delta += part.text;
        state.addContentDelta(part.text);
      } else if ('functionCall' in part) {
        newToolCalls.push({
          id: part.functionCall.name,
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        });
        state.hasToolCalls = true;
      }
    }
    const finishReason = candidate.finishReason
      ? (GOOGLE_CONSTANTS.FINISH_REASON_MAPPINGS as Record<string, 'stop' | 'length' | 'tool_use'>)[
          candidate.finishReason
        ] || 'stop'
      : undefined;
    const streamChunk = state.createChunk(delta, finishReason, usage);
    if (newToolCalls.length > 0) streamChunk.toolCalls = newToolCalls;
    else if (state.hasToolCalls) streamChunk.toolCalls = [];
    return streamChunk;
  }

  private static extractUsage(chunk: StreamGenerateContentChunk): GenerationUsage | undefined {
    const usage = chunk.usageMetadata;
    if (!usage) return undefined;
    const result: GenerationUsage = {};
    if (usage.promptTokenCount) result.inputTokens = usage.promptTokenCount;
    if (usage.candidatesTokenCount) result.outputTokens = usage.candidatesTokenCount;
    if (usage.totalTokenCount) result.totalTokens = usage.totalTokenCount;
    if (usage.cachedContentTokenCount) result.cacheTokens = usage.cachedContentTokenCount;
    return Object.keys(result).length > 0 ? result : undefined;
  }
}

export function createGoogle(
  config: WithApiKey<GoogleOptions>
): StreamingGenerateFunction<Partial<GoogleOptions>> {
  if (!config.apiKey) throw new Error('Google API key is required');
  const client = GoogleClientFactory.createClient(config);
  const { apiKey, ...defaultGenerationOptions } = config;
  const defaultOptions = { apiKey, ...defaultGenerationOptions };
  return async function* google(messages: Message[], options: Partial<GoogleOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };
    if (!mergedOptions.model) throw new Error('Model is required in config or options');
    const { endpoint, payload } = GoogleRequestBuilder.build(messages, mergedOptions);
    const streamState = new StreamState();
    const stream = await client.stream(endpoint, payload);
    const lineStream = client.processStreamAsLines(stream);
    yield* GoogleStreamProcessor.process(lineStream, streamState);
  };
}

export async function* google(
  messages: Message[],
  config: WithApiKey<GoogleOptions>
): AsyncIterable<StreamChunk> {
  const provider = createGoogle(config);
  yield* provider(messages);
}
