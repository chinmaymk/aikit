import type {
  Message,
  StreamChunk,
  Tool,
  ToolCall,
  GoogleOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';

import { MessageTransformer, StreamUtils, DynamicParams } from './utils';
import { APIClient } from './api';

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

  const baseUrl = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
  const headers = { 'Content-Type': 'application/json' };
  const client = new APIClient(baseUrl, headers, config.timeout, config.maxRetries);

  const { apiKey, ...defaultGenerationOptions } = config;
  const defaultOptions = { apiKey, ...defaultGenerationOptions };

  return async function* google(messages: Message[], options: Partial<GoogleOptions> = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const { endpoint, payload } = buildRequest(messages, mergedOptions);
    const stream = await client.stream(endpoint, payload);
    const lineStream = client.processStreamAsLines(stream);
    yield* processStream(lineStream);
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
  config: WithApiKey<GoogleOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createGoogle(config);
  yield* provider(messages);
}

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
    presencePenalty?: number;
    frequencyPenalty?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
    seed?: number;
    responseLogprobs?: boolean;
    logprobs?: number;
    audioTimestamp?: boolean;
  };
  systemInstruction?: { parts: GooglePart[] };
  tools?: Array<{ functionDeclarations: FunctionDeclaration[] }>;
  toolConfig?: DynamicParams;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
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

// Helper functions for functional API
function buildRequest(
  messages: Message[],
  options: GoogleOptions
): { endpoint: string; payload: GenerateContentRequestBody } {
  const { systemInstruction, googleMessages } = transformMessages(messages);
  const modelConfig = buildModelConfig(systemInstruction, options);

  const payload: GenerateContentRequestBody = {
    ...modelConfig,
    contents: googleMessages,
  };

  // The key is passed as a query parameter, which is a bit different from other providers.
  const endpoint = `/models/${options.model!}:streamGenerateContent?key=${options.apiKey}&alt=sse`;

  return { endpoint, payload };
}

async function* processStream(lineStream: AsyncIterable<string>): AsyncIterable<StreamChunk> {
  let currentContent = '';
  let pendingToolCalls: ToolCall[] = [];

  for await (const line of lineStream) {
    if (!line.trim() || !line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (data.trim() === '[DONE]') break;

    const chunk = StreamUtils.parseStreamEvent<StreamGenerateContentChunk>(data);
    if (!chunk) continue;

    const result = processChunk(chunk, currentContent, pendingToolCalls);
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

function processChunk(
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
        arguments: part.functionCall.args,
      };
      newToolCalls.push(toolCall);
    }
  }

  const finishReason = candidate.finishReason ? mapFinishReason(candidate.finishReason) : undefined;

  return {
    content: currentContent,
    delta,
    finishReason,
    toolCalls:
      newToolCalls.length > 0
        ? newToolCalls
        : pendingToolCalls.length > 0
          ? pendingToolCalls
          : undefined,
  };
}

function mapFinishReason(reason: string): 'stop' | 'length' | 'tool_use' | undefined {
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'TOOL_CODE_EXECUTED':
      return 'tool_use';
    case 'OTHER':
      return 'stop';
    case 'SAFETY':
    case 'RECITATION':
      return 'stop';
    default:
      return 'stop';
  }
}

function transformMessages(messages: Message[]): {
  systemInstruction: string;
  googleMessages: GoogleContent[];
} {
  let systemInstruction = '';
  const googleMessages: GoogleContent[] = [];
  const toolCallIdToName = new Map<string, string>();

  // First pass: collect tool call IDs and names for mapping
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.toolCalls) {
      for (const toolCall of msg.toolCalls) {
        toolCallIdToName.set(toolCall.id, toolCall.name);
      }
    }
  }

  // Second pass: transform messages
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = MessageTransformer.extractTextContent(msg.content);
      continue;
    }

    const transformed = mapMessage(msg, toolCallIdToName);
    if (transformed) {
      if (Array.isArray(transformed)) {
        googleMessages.push(...transformed);
      } else {
        googleMessages.push(transformed);
      }
    }
  }

  return { systemInstruction, googleMessages };
}

function mapMessage(
  msg: Message,
  toolCallIdToName: Map<string, string>
): GoogleContent | GoogleContent[] | null {
  switch (msg.role) {
    case 'system':
      return null; // Already handled in transformMessages
    case 'tool':
      return toolResultToContent(msg, toolCallIdToName);
    case 'user':
    case 'assistant':
      return standardMessageToContent(msg);
    default:
      return null;
  }
}

function toolResultToContent(msg: Message, toolCallIdToName: Map<string, string>): GoogleContent[] {
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

function standardMessageToContent(msg: Message): GoogleContent {
  const parts: GooglePart[] = [];

  // Add text content
  const textContent = MessageTransformer.extractTextContent(msg.content);
  if (textContent) {
    parts.push({ text: textContent });
  }

  // Add image content
  const { images } = MessageTransformer.groupContentByType(msg.content);
  for (const imageContent of images) {
    if (imageContent.image.startsWith('data:')) {
      const [mimeTypePart, data] = imageContent.image.split(',');
      let mimeType = mimeTypePart.replace('data:', '').replace(';base64', '');

      // Fallback to image/jpeg for unknown MIME types
      if (!mimeType.startsWith('image/')) {
        mimeType = 'image/jpeg';
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

function buildModelConfig(systemInstruction: string, options: GoogleOptions): ModelConfig {
  const config: ModelConfig = {};

  // Add generation config
  const generationConfig: ModelConfig['generationConfig'] = {};
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
  if (options.topP !== undefined) generationConfig.topP = options.topP;
  if (options.topK !== undefined) generationConfig.topK = options.topK;
  if (options.maxOutputTokens !== undefined)
    generationConfig.maxOutputTokens = options.maxOutputTokens;
  if (options.stopSequences && options.stopSequences.length > 0) {
    generationConfig.stopSequences = options.stopSequences;
  }
  if (options.candidateCount !== undefined)
    generationConfig.candidateCount = options.candidateCount;
  if (options.presencePenalty !== undefined)
    generationConfig.presencePenalty = options.presencePenalty;
  if (options.frequencyPenalty !== undefined)
    generationConfig.frequencyPenalty = options.frequencyPenalty;
  if (options.responseMimeType !== undefined)
    generationConfig.responseMimeType = options.responseMimeType;
  if (options.responseSchema !== undefined)
    generationConfig.responseSchema = options.responseSchema;
  if (options.seed !== undefined) generationConfig.seed = options.seed;
  if (options.responseLogprobs !== undefined)
    generationConfig.responseLogprobs = options.responseLogprobs;
  if (options.logprobs !== undefined) generationConfig.logprobs = options.logprobs;
  if (options.audioTimestamp !== undefined)
    generationConfig.audioTimestamp = options.audioTimestamp;

  if (Object.keys(generationConfig).length > 0) {
    config.generationConfig = generationConfig;
  }

  // Add system instruction
  if (systemInstruction) {
    config.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  // Add tools
  if (options.tools) {
    config.tools = [{ functionDeclarations: formatTools(options.tools) }];
    if (options.toolChoice) {
      config.toolConfig = formatToolChoice(options.toolChoice);
    }
  }

  // Add safety settings
  if (options.safetySettings) {
    config.safetySettings = options.safetySettings;
  }

  return config;
}

function formatTools(tools: Tool[]): FunctionDeclaration[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

function formatToolChoice(toolChoice: GoogleOptions['toolChoice']) {
  const build = (mode: GoogleFunctionCallingMode) => ({
    functionCallingConfig: { mode },
  });

  if (toolChoice === 'required') return build('ANY');
  if (toolChoice === 'auto') return build('AUTO');
  if (toolChoice === 'none') return build('NONE');
  if (typeof toolChoice === 'object') {
    return {
      functionCallingConfig: {
        mode: 'ANY' as GoogleFunctionCallingMode,
        allowedFunctionNames: [toolChoice.name],
      },
    };
  }
  return build('AUTO');
}
