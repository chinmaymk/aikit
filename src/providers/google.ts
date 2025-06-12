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

export class GoogleGeminiProvider implements AIProvider<GoogleGenerationOptions> {
  private readonly client: APIClient;
  private readonly transformer: GoogleMessageTransformer;
  private readonly streamProcessor: GoogleStreamProcessor;

  readonly models = [
    // Gemini 2.5
    'gemini-2.5-pro-preview-06-05',
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-preview-native-audio-dialog',
    'gemini-2.5-flash-exp-native-audio-thinking-dialog',
    'gemini-2.5-flash-preview-tts',

    // Gemini 2.0
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-live-001',

    // Gemini 1.5
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',

    // Legacy 1.x models
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  constructor(config: GoogleConfig) {
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const headers = { 'Content-Type': 'application/json' };

    this.client = new APIClient(baseUrl, headers);
    this.transformer = new GoogleMessageTransformer(config.apiKey);
    this.streamProcessor = new GoogleStreamProcessor();
  }

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

// Converts generic messages to Google request format

class GoogleMessageTransformer {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

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

    const endpoint = `/models/${options.model}:streamGenerateContent?key=${encodeURIComponent(
      this.apiKey
    )}&alt=sse`;

    return { endpoint, payload };
  }

  // ---------- Message Conversion ----------

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

  private mapMessage(msg: Message): GoogleContent | GoogleContent[] | null {
    switch (msg.role) {
      case 'tool':
        return this.toolResultToContent(msg);
      case 'assistant':
      case 'user':
        return this.standardMessageToContent(msg);
      default:
        return null;
    }
  }

  private toolResultToContent(msg: Message): GoogleContent[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map(tr => ({
      role: 'function',
      parts: [
        {
          functionResponse: {
            name: tr.toolCallId.split('_')[0],
            response: { result: tr.result },
          },
        },
      ],
    }));
  }

  private standardMessageToContent(msg: Message): GoogleContent {
    const parts: GooglePart[] = [];

    // Regular text / image parts
    for (const c of msg.content) {
      if (c.type === 'text') parts.push({ text: c.text });
      else if (c.type === 'image') {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: MessageTransformer.extractBase64Data(c.image),
          },
        });
      }
    }

    // Tool calls (assistant messages)
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
      }
    }

    return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
  }

  // ---------- Model Config ----------

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

    if (systemInstruction) config.systemInstruction = systemInstruction;

    if (options.tools) {
      config.tools = [
        {
          functionDeclarations: options.tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];

      if (options.toolChoice) {
        config.toolConfig = ToolChoiceHandler.formatForGoogle(options.toolChoice);
      }
    }

    return config;
  }
}

// Parses SSE chunks from the Gemini API response

class GoogleStreamProcessor {
  async *processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for await (const data of extractDataLines(lineStream)) {
      try {
        const chunk = JSON.parse(data) as StreamGenerateContentChunk;
        const streamChunk = this.processChunk(chunk, content, toolCalls);
        if (streamChunk) {
          content = streamChunk.content;
          yield streamChunk;
          if (streamChunk.finishReason) return;
        }
      } catch {
        continue; // skip invalid JSON
      }
    }
  }

  private processChunk(
    chunk: StreamGenerateContentChunk,
    currentContent: string,
    toolCalls: ToolCall[]
  ): StreamChunk | null {
    const candidate = chunk.candidates?.[0];
    if (!candidate?.content?.parts) return null;

    let delta = '';

    for (const part of candidate.content.parts as GooglePart[]) {
      if ('text' in part && part.text) {
        delta += part.text;
        currentContent += part.text;
      } else if ('functionCall' in part && part.functionCall) {
        const { name, args } = part.functionCall;
        if (!toolCalls.find(tc => tc.name === name)) {
          toolCalls.push({
            id: `${name}_${Date.now()}_${toolCalls.length}`,
            name,
            arguments: args,
          });
        }
      }
    }

    if (!delta.trim() && !candidate.finishReason && toolCalls.length === 0) {
      return null;
    }

    const finishReason = candidate.finishReason
      ? FinishReasonMapper.mapGoogle(candidate.finishReason)
      : undefined;

    return {
      content: currentContent,
      delta,
      finishReason,
      toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
    };
  }
}
