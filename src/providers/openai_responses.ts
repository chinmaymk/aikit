import type {
  Message,
  StreamChunk,
  OpenAIResponsesOptions,
  WithApiKey,
  StreamingGenerateFunction,
} from '../types';
import { OpenAIClientFactory, OpenAIRequestBuilder, OpenAIStreamProcessor } from './openai_util';
import { StreamState } from './utils';

/**
 * Creates an OpenAI Responses generation function with pre-configured defaults.
 * Returns a simple function that takes messages and options.
 *
 * @example
 * ```typescript
 * const openaiResponses = createOpenAIResponses({ apiKey: '...', model: 'gpt-4o' });
 *
 * // Use like any function
 * const result = await collectDeltas(openaiResponses([userText('Hello')]));
 *
 * // Override options
 * const creative = await collectDeltas(openaiResponses([userText('Be creative')], { temperature: 0.9 }));
 * ```
 */
export function createOpenAIResponses(
  config: WithApiKey<OpenAIResponsesOptions>
): StreamingGenerateFunction<Partial<OpenAIResponsesOptions>> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const client = OpenAIClientFactory.createClient(config);
  const { apiKey, ...defaultGenerationOptions } = config;
  const defaultOptions = { apiKey, ...defaultGenerationOptions };

  return async function* openaiResponses(
    messages: Message[],
    options: Partial<OpenAIResponsesOptions> = {}
  ): AsyncIterable<StreamChunk> {
    const mergedOptions = { ...defaultOptions, ...options };

    if (!mergedOptions.model) {
      throw new Error('Model is required in config or options');
    }

    const params = OpenAIRequestBuilder.buildResponsesParams(messages, mergedOptions);

    // Create StreamState at request time for accurate timing
    const streamState = new StreamState();
    const stream = await client.stream('/responses', params);
    const lineStream = client.processStreamAsLines(stream);
    yield* OpenAIStreamProcessor.processResponsesStream(lineStream, streamState);
  };
}

/**
 * Direct OpenAI Responses function - no configuration step needed
 *
 * @example
 * ```typescript
 * const result = await collectDeltas(
 *   openaiResponses({ apiKey: '...', model: 'gpt-4o' }, [userText('Hello')])
 * );
 * ```
 */
export async function* openaiResponses(
  config: WithApiKey<OpenAIResponsesOptions>,
  messages: Message[]
): AsyncIterable<StreamChunk> {
  const provider = createOpenAIResponses(config);
  yield* provider(messages);
}
