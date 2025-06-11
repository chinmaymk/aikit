import type {
  Content,
  Tool,
  BaseGenerationOptions,
  TextContent,
  ImageContent,
  ToolResultContent,
} from '../types';
import type { Anthropic } from '@anthropic-ai/sdk';
import type { FunctionCallingMode } from '@google/generative-ai';

export interface GroupedContent {
  text: TextContent[];
  images: ImageContent[];
  toolResults: ToolResultContent[];
}

export type FinishReason = 'stop' | 'length' | 'tool_use' | 'error';

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
  static formatForAnthropic(tools: Tool[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));
  }

  /**
   * Convert tools to the structure expected by Google Gemini.
   * They are supplied as an array with a single FunctionDeclarationsTool object
   * whose "functionDeclarations" field contains all Tool definitions.
   */
  static formatForGoogle(tools: Tool[]): { functionDeclarations: Tool[] }[] {
    return [
      {
        functionDeclarations: tools,
      },
    ];
  }
}

export class ToolChoiceHandler {
  static formatForAnthropic(toolChoice: BaseGenerationOptions['toolChoice']): Anthropic.ToolChoice {
    if (toolChoice === 'required') return { type: 'any' };
    if (toolChoice === 'auto') return { type: 'auto' };
    if (typeof toolChoice === 'object') {
      return { type: 'tool', name: toolChoice.name };
    }
    return { type: 'auto' };
  }

  static formatForGoogle(toolChoice: BaseGenerationOptions['toolChoice'] | undefined) {
    const build = (mode: FunctionCallingMode) => ({
      functionCallingConfig: { mode },
    });

    if (!toolChoice) return build('AUTO' as FunctionCallingMode);

    if (toolChoice === 'auto') return build('AUTO' as FunctionCallingMode);
    if (toolChoice === 'none') return build('NONE' as FunctionCallingMode);
    if (toolChoice === 'required') return build('ANY' as FunctionCallingMode);

    if (typeof toolChoice === 'object' && toolChoice.name) {
      return {
        functionCallingConfig: {
          mode: 'ANY' as FunctionCallingMode,
          allowedFunctionNames: [toolChoice.name],
        },
      };
    }

    return build('AUTO' as FunctionCallingMode);
  }
}

export class FinishReasonMapper {
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
