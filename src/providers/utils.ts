import type { OpenAI } from 'openai';
import type { Anthropic } from '@anthropic-ai/sdk';
import type {
  Content,
  Tool,
  GenerationOptions,
  TextContent,
  ImageContent,
  ToolResultContent,
} from '../types';
import type { ToolConfig } from '@google/generative-ai';
import { FunctionCallingMode } from '@google/generative-ai';

export interface GroupedContent {
  text: TextContent[];
  images: ImageContent[];
  toolResults: ToolResultContent[];
}

export type FinishReason = 'stop' | 'length' | 'tool_use';

export class MessageTransformer {
  static extractTextContent(content: Content[]): string {
    const textContent = content.find(c => c.type === 'text') as TextContent;
    return textContent?.text ?? '';
  }

  static groupContentByType(content: Content[]): GroupedContent {
    return {
      text: content.filter(c => c.type === 'text') as TextContent[],
      images: content.filter(c => c.type === 'image') as ImageContent[],
      toolResults: content.filter(c => c.type === 'tool_result') as ToolResultContent[],
    };
  }

  static extractBase64Data(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
  }
}

export class ToolFormatter {
  static formatForOpenAI(tools: Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  static formatForAnthropic(tools: Tool[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  static formatForGoogle(tools: Tool[]): Array<{ functionDeclarations: Tool[] }> {
    return [{ functionDeclarations: tools }];
  }
}

export class ToolChoiceHandler {
  static formatForOpenAI(
    toolChoice: GenerationOptions['toolChoice']
  ): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption {
    if (typeof toolChoice === 'object') {
      return { type: 'function', function: { name: toolChoice.name } };
    }
    return toolChoice as OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
  }

  static formatForAnthropic(toolChoice: GenerationOptions['toolChoice']): Anthropic.ToolChoice {
    if (toolChoice === 'required') return { type: 'any' };
    if (toolChoice === 'auto') return { type: 'auto' };
    if (typeof toolChoice === 'object') {
      return { type: 'tool', name: toolChoice.name };
    }
    // Default fallback for 'none' or other cases
    return { type: 'auto' };
  }

  static formatForGoogle(toolChoice: GenerationOptions['toolChoice']): ToolConfig {
    if (toolChoice === 'required')
      return { functionCallingConfig: { mode: FunctionCallingMode.ANY } };
    if (toolChoice === 'auto') return { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
    if (toolChoice === 'none') return { functionCallingConfig: { mode: FunctionCallingMode.NONE } };
    // Default fallback
    return { functionCallingConfig: { mode: FunctionCallingMode.AUTO } };
  }
}

export class FinishReasonMapper {
  static mapOpenAI(reason: string | null): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_use';
      default:
        return 'stop'; // Default fallback
    }
  }

  static mapGoogle(reason: string): Exclude<FinishReason, 'tool_use'> {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      default:
        return 'stop'; // Default fallback
    }
  }
}
