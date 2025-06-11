import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  Content as GoogleContent,
  Part,
  FunctionDeclaration,
  FunctionDeclarationSchema,
  FunctionDeclarationsTool,
  ModelParams,
  GenerateContentRequest,
  GenerateContentStreamResult,
} from '@google/generative-ai';

import type {
  AIProvider,
  Message,
  GoogleConfig,
  GenerationOptions,
  StreamChunk,
  ToolCall,
} from '../types';
import { MessageTransformer, ToolChoiceHandler, FinishReasonMapper } from './utils';

export class GoogleGeminiProvider implements AIProvider {
  private genai: GoogleGenerativeAI;
  readonly models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-pro'];

  constructor(config: GoogleConfig) {
    this.genai = new GoogleGenerativeAI(config.apiKey);
  }

  async *generate(messages: Message[], options: GenerationOptions): AsyncIterable<StreamChunk> {
    const { systemInstruction, googleMessages } = this.transformMessages(messages);
    const modelConfig = this.buildModelConfig(systemInstruction, options);

    const model = this.genai.getGenerativeModel(modelConfig);
    const request: GenerateContentRequest = { contents: googleMessages };
    const stream = await model.generateContentStream(request);

    yield* this.processStream(stream);
  }

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

      const transformed = this.transformMessage(msg);
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

  private transformMessage(msg: Message): GoogleContent | GoogleContent[] | null {
    switch (msg.role) {
      case 'tool':
        return this.transformToolMessage(msg);
      case 'user':
      case 'assistant':
        return this.transformUserOrAssistantMessage(msg);
      default:
        return null;
    }
  }

  private transformToolMessage(msg: Message): GoogleContent[] {
    const { toolResults } = MessageTransformer.groupContentByType(msg.content);
    return toolResults.map<GoogleContent>(content => ({
      role: 'function',
      parts: [
        {
          functionResponse: {
            name: content.toolCallId.split('_')[0],
            response: { result: content.result },
          },
        },
      ],
    }));
  }

  private transformUserOrAssistantMessage(msg: Message): GoogleContent {
    const parts = this.buildMessageParts(msg);
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  }

  private buildMessageParts(msg: Message): Part[] {
    const parts: Part[] = [];

    for (const content of msg.content) {
      if (content.type === 'text') {
        parts.push({ text: content.text });
      } else if (content.type === 'image') {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: MessageTransformer.extractBase64Data(content.image),
          },
        });
      }
    }

    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        parts.push({
          functionCall: {
            name: tc.name,
            args: tc.arguments,
          },
        });
      }
    }

    return parts;
  }

  private buildModelConfig(systemInstruction: string, options: GenerationOptions): ModelParams {
    const params: ModelParams = {
      model: options.model,
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        maxOutputTokens: options.maxTokens,
        stopSequences: options.stopSequences,
      },
    };

    if (systemInstruction) {
      params.systemInstruction = systemInstruction;
    }

    if (options.tools) {
      const functionDeclarations: FunctionDeclaration[] = options.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as unknown as FunctionDeclarationSchema,
      }));

      const googleTool: FunctionDeclarationsTool = { functionDeclarations };
      params.tools = [googleTool];

      if (options.toolChoice) {
        params.toolConfig = ToolChoiceHandler.formatForGoogle(options.toolChoice);
      }
    }

    return params;
  }

  private async *processStream(stream: GenerateContentStreamResult): AsyncIterable<StreamChunk> {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for await (const response of stream.stream) {
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) continue;

      let delta = '';

      for (const part of candidate.content.parts) {
        if ('text' in part && part.text) {
          delta += part.text;
          content += part.text;
        } else if ('functionCall' in part && part.functionCall) {
          const fc = part.functionCall;
          const existingCall = toolCalls.find(tc => tc.name === fc.name);
          if (!existingCall) {
            const args: Record<string, unknown> = (fc.args as Record<string, unknown>) || {};
            toolCalls.push({
              id: `${fc.name}_${toolCalls.length}`,
              name: fc.name,
              arguments: args,
            });
          }
        }
      }

      const finishReason = candidate?.finishReason
        ? FinishReasonMapper.mapGoogle(candidate.finishReason)
        : undefined;

      yield {
        content,
        delta,
        finishReason,
        toolCalls: toolCalls.length ? toolCalls : undefined,
      };
    }
  }
}
