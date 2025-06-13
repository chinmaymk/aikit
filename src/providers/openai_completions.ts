import type {
  Message,
  StreamChunk,
  OpenAIOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';
import { OpenAIClientFactory, OpenAIRequestBuilder, OpenAIStreamProcessor } from './openai_util';

/**
 * Creates an OpenAI generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const openai = createOpenAI({ apiKey: '...', model: 'gpt-4o' });
 *
 * // Use like any function
 * const result = await collectDeltas(openai([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(openai([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createOpenAI(
  config: WithApiKey<OpenAIOptions>
): StreamingGenerateFunction<Partial<OpenAIOptions>> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const client = OpenAIClientFactory.createClient(config);
  const { apiKey, ...defaultGenerationOptions } = config;
  const defaultOptions = { apiKey, ...defaultGenerationOptions };

  return async function* openai(
    messages: Message[],
    options: Partial<OpenAIOptions> = {}
  ): AsyncIterable<StreamChunk> {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const params = OpenAIRequestBuilder.buildChatCompletionParams(messages, mergedOptions);
    const stream = await client.stream('/chat/completions', params);
    const lineStream = client.processStreamAsLines(stream);
    yield* OpenAIStreamProcessor.processChatStream(lineStream);
  };
}

/**
 * Direct OpenAI function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   openai({ apiKey: '...', model: 'gpt-4o' }, [userText('Hello')])
 * );
 * ```
 */
export async function* openai(
  config: WithApiKey<OpenAIOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createOpenAI(config);
  yield* provider(messages);
}
