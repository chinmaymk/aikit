import type {
  GenerationOptions,
  Message,
  ToolCall,
  StreamResult,
  AnyGenerationProvider,
} from './types';

// Re-export from modular files
export * from './message-helpers';
export * from './stream-utils';
export * from './conversation-builder';

export const generate = async (
  provider: AnyGenerationProvider,
  messages: Message[],
  options: Partial<GenerationOptions> = {}
): Promise<StreamResult> => {
  const stream = provider(messages, options);
  const { collectStream } = await import('./stream-utils');
  return collectStream(stream);
};

export function executeToolCall<T, TArgs extends Record<string, unknown> = Record<string, unknown>>(
  toolCall: ToolCall,
  selector: (toolName: string) => ((args: TArgs) => T) | undefined
): T {
  const fn = selector(toolCall.name);
  if (!fn) {
    throw new Error(`No function found for tool: ${toolCall.name}`);
  }
  return fn(toolCall.arguments as TArgs);
}
