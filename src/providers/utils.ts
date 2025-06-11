import type {
  Content,
  Tool,
  GenerationOptions,
  TextContent,
  ImageContent,
  ToolResultContent,
} from '../types';

// Local replacement for the Google SDK `FunctionCallingMode` enum
type GoogleFunctionCallingMode = 'AUTO' | 'NONE' | 'ANY';

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
