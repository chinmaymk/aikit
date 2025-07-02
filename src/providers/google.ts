import type {
  Message,
  StreamChunk,
  GoogleOptions,
  WithApiKey,
  StreamingGenerateFunction,
  TextContent,
  ImageContent,
  AudioContent,
} from '../types';

import { MessageTransformer, StreamState, ValidationUtils } from './utils';
import { APIClient } from './api';
import { GenerateContentRequestBody, GoogleContent, GooglePart, ModelConfig } from './google.d';
import { GoogleStreamProcessor } from './google-utils';

const GOOGLE_CONSTANTS = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
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
    const { text, images, audio } = MessageTransformer.groupContentByType(msg.content);

    // Handle text content
    this.addTextParts(text, parts);

    // Handle media content
    this.addImageParts(images, parts);
    this.addAudioParts(audio, parts);

    // Handle tool calls for assistant messages
    this.addToolCallParts(msg, parts);

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  }

  private static addTextParts(textContent: TextContent[], parts: GooglePart[]): void {
    for (const text of textContent) {
      if (text.text.trim()) {
        parts.push({ text: text.text });
      }
    }
  }

  private static addImageParts(images: ImageContent[], parts: GooglePart[]): void {
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
  }

  private static addAudioParts(audioContent: AudioContent[], parts: GooglePart[]): void {
    for (const audio of audioContent) {
      if (ValidationUtils.isValidDataUrl(audio.audio)) {
        const [mimeTypePart, data] = audio.audio.split(',');
        let mimeType = mimeTypePart.replace('data:', '').replace(';base64', '');

        if (!mimeType.startsWith('audio/')) {
          mimeType = audio.format ? `audio/${audio.format}` : 'audio/wav';
        } else {
          const knownFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
          if (!knownFormats.includes(mimeType)) {
            mimeType = audio.format ? `audio/${audio.format}` : 'audio/wav';
          }
        }

        parts.push({ inlineData: { mimeType, data } });
      }
    }
  }

  private static addToolCallParts(msg: Message, parts: GooglePart[]): void {
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
