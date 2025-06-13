/**
 * AIKit - Your friendly neighborhood AI wrangler.
 *
 * This lightweight library tames the wild beasts of AI generation from OpenAI,
 * Anthropic, and Google. It provides a unified interface so you can spend less
 * time reading API docs and more time building cool stuff. Or napping. We don't judge.
 *
 * It handles generation, streaming, and tool use for text and images.
 * For anything more exotic, you might have to consult the official SDKs.
 *
 * @packageDocumentation
 */

/**
 * Why did the generation stop? The suspense is killing us.
 * @group Types
 */
export type FinishReason = 'stop' | 'length' | 'tool_use' | 'error';

/**
 * Just good old-fashioned text. The bread and butter of language models.
 * @group Types
 */
export interface TextContent {
  /** It's text. What did you expect? */
  type: 'text';
  /** The actual, you know, text. */
  text: string;
}

/**
 * A picture is worth a thousand tokens. Use this for multimodal messages.
 * @group Types
 */
export interface ImageContent {
  /** Yup, it's an image. */
  type: 'image';
  /** Base64 encoded image or a data URL. Don't worry, the AI knows what to do with it. */
  image: string;
}

/**
 * The model used a tool, and this is what it brought back.
 * Like a cat presenting you with a mouse, but hopefully more useful.
 * @group Types
 */
export interface ToolResultContent {
  /** A tool result. The circle of life continues. */
  type: 'tool_result';
  /** The ID of the tool call this is a response to. So we know which cat to praise. */
  toolCallId: string;
  /** The glorious result of the tool's hard work. */
  result: string;
}

/**
 * A grab bag of all the things you can stuff into a message.
 * It's like a bento box of content. Mmm, bento.
 * @group Types
 */
export type Content = TextContent | ImageContent | ToolResultContent;

/**
 * Teach the AI new tricks. This is how you define a tool it can use.
 * @group Types
 */
export interface Tool {
  /** The name of your shiny new tool. Make it a good one. */
  name: string;
  /** A description of what the tool does. Be specific. The AI is smart, but not a mind reader. */
  description: string;
  /**
   * The JSON schema for the tool's parameters.
   * This is how you tell the AI what knobs and levers your tool has.
   */
  parameters: Record<string, unknown>;
}

/**
 * The AI has decided to use one of your tools. This is the moment we've all been waiting for.
 * @group Types
 */
export interface ToolCall {
  /** A unique ID for this specific tool invocation. Keep it safe. */
  id: string;
  /** The name of the tool the model wants to use. */
  name: string;
  /** The arguments the model is passing to your tool. Handle with care. */
  arguments: Record<string, unknown>;
}

/**
 * A single message in a conversation. It's a bit like a text message, but with more structured data.
 * @group Types
 */
export interface Message {
  /** Who's talking? A user, the assistant, the system, a developer, or a tool. */
  role: 'user' | 'assistant' | 'system' | 'developer' | 'tool';
  /** The actual content of the message. It's an array, because life is complicated. */
  content: Content[];
  /** If the assistant is calling a tool, the details will be in here. */
  toolCalls?: ToolCall[];
}

/**
 * A little piece of the streaming response.
 * It's like getting your data one delicious drop at a time.
 * @group Types
 */
export interface StreamChunk {
  /** The full content of the response so far. It's cumulative, like student loan debt. */
  content: string;
  /** The new bit of content that just arrived in this chunk. The delta. */
  delta: string;
  /**
   * If the generation is done, this tells you why.
   * Did it stop gracefully, run out of tokens, or decide to use a tool? The suspense is killing us.
   */
  finishReason?: FinishReason;
  /** Any tool calls that came through in this chunk. The plot thickens. */
  toolCalls?: ToolCall[];
  /** Reasoning content when available. The model's internal reasoning process. */
  reasoning?: {
    /** The full reasoning content so far. Cumulative like content. */
    content: string;
    /** The new bit of reasoning content that just arrived in this chunk. */
    delta: string;
  };
}

/**
 * The final result of collecting a stream of chunks.
 * Everything you need to know about what the AI just generated.
 * @group Types
 */
export interface StreamResult {
  /** The complete generated content. */
  content: string;
  /** Why the generation stopped, if it did. */
  finishReason?: FinishReason;
  /** Any tool calls that were made during generation. */
  toolCalls?: ToolCall[];
  /** Complete reasoning content if available. The model's internal reasoning process. */
  reasoning?: string;
}

/**
 * Usage information for an embedding request.
 * Provides details about token consumption and any truncation that occurred.
 * @group Types
 */
export interface EmbeddingUsage {
  /** The number of tokens in the input text. */
  inputTokens?: number;
  /** The total number of tokens used in the request. */
  totalTokens?: number;
  /** Whether the input text was truncated due to length limits. */
  truncated?: boolean;
}

/**
 * A single embedding result containing the vector and metadata.
 * @group Types
 */
export interface EmbeddingResult {
  /** The embedding vector as an array of floating-point numbers. */
  values: number[];
  /** Index of this embedding in the original batch request. */
  index?: number;
  /** Usage information for this specific embedding. */
  usage?: EmbeddingUsage;
}

/**
 * The complete response from an embedding generation request.
 * Contains all embeddings and aggregated usage information.
 * @group Types
 */
export interface EmbeddingResponse {
  /** Array of embedding results, one for each input text. */
  embeddings: EmbeddingResult[];
  /** Total usage information across all embeddings in the batch. */
  usage?: EmbeddingUsage;
  /** The model used to generate the embeddings. */
  model?: string;
}

/**
 * The basic options for controlling embedding generation.
 * These are the options that all embedding providers understand.
 */
export interface EmbeddingOptions {
  /** The specific embedding model you want to use. e.g., 'text-embedding-3-small' or 'text-embedding-004'. */
  model?: string;
  /** The number of dimensions in the output embeddings. Only supported by some models. */
  dimensions?: number;
  /** The type of task the embeddings will be used for. Helps optimize the embeddings. */
  taskType?: 'query' | 'document' | 'similarity' | 'classification' | 'clustering';
  /** Whether to automatically truncate input text that exceeds the model's limit. */
  autoTruncate?: boolean;
}

/**
 * Base interface for embedding provider-specific configuration options.
 * Contains common options shared across all AI embedding providers.
 */
export interface EmbeddingProviderOptions extends EmbeddingOptions {
  /** API key for authentication with the provider. */
  apiKey?: string;
  /** Custom base URL for the API endpoint. */
  baseURL?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * OpenAI-specific embedding options.
 * Extends the base embedding options with OpenAI-specific parameters.
 */
export interface OpenAIEmbeddingOptions extends EmbeddingProviderOptions {
  /** Your OpenAI organization ID. For when you're part of a fancy club. */
  organization?: string;
  /** Your OpenAI project ID. For even fancier clubs. */
  project?: string;
  /** Encoding format for the embeddings. Defaults to 'float'. */
  encodingFormat?: 'float' | 'base64';
  /** A stable identifier for your end-users. */
  user?: string;
}

/**
 * Google Gemini-specific embedding options.
 * Extends the base embedding options with Google-specific parameters.
 */
export interface GoogleEmbeddingOptions extends Omit<EmbeddingProviderOptions, 'taskType'> {
  /** Output data type for the embeddings. */
  outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
  /** Optional title for the text when task type is 'document'. */
  title?: string;
  /** Task type specific to Google's API format. */
  taskType?:
    | 'RETRIEVAL_QUERY'
    | 'RETRIEVAL_DOCUMENT'
    | 'SEMANTIC_SIMILARITY'
    | 'CLASSIFICATION'
    | 'CLUSTERING'
    | 'QUESTION_ANSWERING'
    | 'FACT_VERIFICATION'
    | 'CODE_RETRIEVAL_QUERY';
}

/**
 * The basic knobs and dials for controlling the AI's creative genius.
 * These are the options that all providers understand.
 */
export interface GenerationOptions {
  /** The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'. */
  model?: string;
  /** The maximum number of output tokens to generate. Don't want it to ramble on forever, do you? */
  maxOutputTokens?: number;
  /**
   * The sampling temperature. Higher values (e.g., 0.8) make the output more random,
   * while lower values (e.g., 0.2) make it more focused and deterministic.
   * A bit like adjusting the chaos knob.
   */
  temperature?: number;
  /**
   * Top-p sampling. It's a way to control the randomness of the output by only considering
   * the most likely tokens. It's like telling the AI to only pick from the top of the deck.
   */
  topP?: number;
  /**
   * Top-k sampling. Similar to top-p, but it considers a fixed number of top tokens.
   * Not all providers support this, because life isn't fair.
   */
  topK?: number;
  /** A list of sequences that will stop the generation. A safe word, if you will. */
  stopSequences?: string[];
  /** The list of tools you're making available to the model. */
  tools?: Tool[];
  /**
   * How the model should choose which tool to use.
   * 'auto': The model decides.
   * 'required': The model must use a tool.
   * 'none': The model can't use any tools.
   * { name: 'my_tool' }: Force the model to use a specific tool.
   */
  toolChoice?: 'auto' | 'required' | 'none' | { name: string };
}

/**
 * Base interface for provider-specific configuration options.
 * Contains common options shared across all AI providers.
 */
export interface ProviderOptions extends GenerationOptions {
  /** API key for authentication with the provider. */
  apiKey?: string;
  /** Custom base URL for the API endpoint. */
  baseURL?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries?: number;
}

/**
 * OpenAI Responses API configuration and generation options.
 * These can be provided at construction time or generation time.
 * Generation time options will override construction time options.
 */
export interface OpenAIResponsesOptions extends ProviderOptions {
  /** Your OpenAI organization ID. For when you're part of a fancy club. */
  organization?: string;
  /** Your OpenAI project ID. For even fancier clubs. */
  project?: string;
  /**
   * Whether to run the model response in the background.
   * When true, the request is processed asynchronously and can be polled for status.
   */
  background?: boolean;
  /**
   * Specify additional output data to include in the model response.
   * For example: ["reasoning.encrypted_content"] to include encrypted reasoning traces.
   */
  include?: string[];
  /**
   * Inserts a system (or developer) message as the first item in the model's context.
   * This provides high-level instructions that take precedence over user messages.
   */
  instructions?: string;
  /**
   * Set of key-value pairs that can be attached to an object for metadata purposes.
   */
  metadata?: Record<string, string>;
  /**
   * Whether to allow the model to run tool calls in parallel.
   */
  parallelToolCalls?: boolean;
  /**
   * The unique ID of the previous response to the model for multi-turn conversations.
   * This enables conversation state management by chaining responses together.
   */
  previousResponseId?: string;
  /**
   * Configuration options for reasoning models (o-series models only).
   * Controls the reasoning effort level for enhanced problem-solving capabilities.
   */
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
  };
  /**
   * Specifies the latency tier to use for processing the request.
   * 'auto' lets OpenAI choose, 'default' uses standard tier, 'flex' uses flexible tier.
   */
  serviceTier?: 'auto' | 'default' | 'flex';
  /**
   * Whether to store the generated model response for later retrieval via API.
   * Defaults to true. Set to false for stateless requests.
   */
  store?: boolean;
  /**
   * Configuration options for a text response from the model.
   * Controls the format and structure of text outputs.
   */
  text?: {
    format?: {
      type: 'text' | 'json_object' | 'json_schema';
      json_schema?: {
        name?: string;
        description?: string;
        schema?: Record<string, unknown>;
        strict?: boolean;
      };
    };
  };
  /**
   * The truncation strategy to use for the model response.
   * 'auto' lets the model decide, 'disabled' prevents truncation.
   */
  truncation?: 'auto' | 'disabled';
  /**
   * A stable identifier for your end-users.
   * Helps OpenAI monitor and detect abuse.
   */
  user?: string;
}

/**
 * OpenAI Chat Completions API configuration and generation options (default OpenAI implementation).
 * These can be provided at construction time or generation time.
 * Generation time options will override construction time options.
 */
export interface OpenAIOptions extends ProviderOptions {
  /** Your OpenAI organization ID. For when you're part of a fancy club. */
  organization?: string;
  /** Your OpenAI project ID. For even fancier clubs. */
  project?: string;
  /**
   * Presence penalty. Positive values penalize new tokens based on whether they
   * appear in the text so far, increasing the model's likelihood to talk about new topics.
   * Basically, it discourages repetition.
   */
  presencePenalty?: number;
  /**
   * Frequency penalty. Positive values penalize new tokens based on their
   * existing frequency in the text so far, decreasing the model's likelihood to
   * repeat the same line verbatim. Stop me if you've heard this one before.
   */
  frequencyPenalty?: number;
  /**
   * A stable identifier for your end-users.
   */
  user?: string;
  /**
   * Whether to return log probabilities of the output tokens or not.
   * If true, returns the log probabilities of each output token returned in the content of message.
   * This feature is available on gpt-4.1, gpt-4o, gpt-4o-mini, gpt-3.5-turbo, and other supported models.
   */
  logprobs?: boolean;
  /**
   * An integer between 0 and 20 specifying the number of most likely tokens to return at each token position,
   * each with an associated log probability. logprobs must be set to true if this parameter is used.
   */
  topLogprobs?: number;
  /**
   * This feature is in Beta. If specified, our system will make a best effort to sample deterministically,
   * such that repeated requests with the same seed and parameters should return the same result.
   * Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter
   * to monitor changes in the backend.
   */
  seed?: number;
  /**
   * An object specifying the format that the model must output.
   * Compatible with GPT-4.1, GPT-4o, GPT-4o-mini, GPT-3.5 Turbo, and all GPT-4 Turbo models newer than gpt-4-turbo-2024-04-09.
   * Setting to { "type": "json_object" } enables JSON mode, which guarantees the message the model generates is valid JSON.
   * Important: when using JSON mode, you must also instruct the model to produce JSON yourself via a system or user message.
   * Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit,
   * resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off
   * if finish_reason="length", which indicates the generation exceeded max_tokens or the conversation exceeded the max context length.
   */
  responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      description?: string;
      schema?: Record<string, unknown>;
      strict?: boolean;
    };
  };
  /**
   * Modify the likelihood of specified tokens appearing in the completion.
   * Accepts a JSON object that maps tokens (specified by their token ID in the tokenizer) to an associated bias value from -100 to 100.
   * Mathematically, the bias is added to the logits generated by the model prior to sampling.
   * The exact effect will vary per model, but values between -1 and 1 should decrease or increase likelihood of selection;
   * values like -100 or 100 should result in a ban or exclusive selection of the relevant token.
   */
  logitBias?: Record<string, number>;
  /**
   * How many chat completion choices to generate for each input message.
   * Note that you will be charged based on the number of generated tokens across all of the choices.
   * Keep n as 1 to minimize costs.
   */
  n?: number;
  /**
   * Options for streaming response. Only set this when you set stream: true.
   * When streaming, the stream will include usage data.
   */
  streamOptions?: {
    includeUsage?: boolean;
  };
  /**
   * Whether to allow the model to run tool calls in parallel.
   */
  parallelToolCalls?: boolean;
  /**
   * Configuration options for reasoning models (o-series models only).
   * Controls the reasoning effort level for enhanced problem-solving capabilities.
   * When enabled, the reasoning process is included in the response.
   */
  reasoning?: {
    effort?: 'low' | 'medium' | 'high';
  };
}

/**
 * Google-specific configuration and generation options.
 * These can be provided at construction time or generation time.
 * Generation time options will override construction time options.
 */
export interface GoogleOptions extends ProviderOptions {
  /**
   * Top-k sampling. See `GenerationOptions` for the details.
   * It's here because Google supports it.
   */
  topK?: number;
  /** How many different responses to generate. More candidates, more problems. */
  candidateCount?: number;
  /**
   * Presence penalty. Positive values penalize new tokens based on whether they
   * appear in the text so far, increasing the model's likelihood to talk about new topics.
   */
  presencePenalty?: number;
  /**
   * Frequency penalty. Positive values penalize new tokens based on their
   * existing frequency in the text so far, decreasing the model's likelihood to
   * repeat the same line verbatim.
   */
  frequencyPenalty?: number;
  /**
   * The MIME type of the generated candidate text.
   * Supported values: 'text/plain' (default), 'application/json'
   */
  responseMimeType?: 'text/plain' | 'application/json';
  /**
   * Output schema of the generated candidate text when responseMimeType is set to 'application/json'.
   * Schema must be a subset of the OpenAPI schema and can be objects, primitives or arrays.
   */
  responseSchema?: Record<string, unknown>;
  /**
   * This feature is in Beta. If specified, our system will make a best effort to sample deterministically,
   * such that repeated requests with the same seed and parameters should return the same result.
   */
  seed?: number;
  /**
   * Whether to return log probabilities of the output tokens or not.
   * If true, returns the log probabilities of each output token returned in the content of message.
   */
  responseLogprobs?: boolean;
  /**
   * An integer between 1 and 20 specifying the number of most likely tokens to return at each token position,
   * each with an associated log probability. responseLogprobs must be set to true if this parameter is used.
   */
  logprobs?: number;
  /**
   * Whether to include audio timestamp information in the response.
   * Only applicable for audio generation models.
   */
  audioTimestamp?: boolean;
  /**
   * Safety settings for content filtering.
   * Configure safety thresholds for different harm categories.
   */
  safetySettings?: Array<{
    /** The category of harmful content to filter */
    category:
      | 'HARM_CATEGORY_HARASSMENT'
      | 'HARM_CATEGORY_HATE_SPEECH'
      | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
      | 'HARM_CATEGORY_DANGEROUS_CONTENT'
      | 'HARM_CATEGORY_CIVIC_INTEGRITY';
    /** The threshold for blocking content */
    threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
  }>;
}

/**
 * Anthropic-specific configuration and generation options.
 * These can be provided at construction time or generation time.
 * Generation time options will override construction time options.
 */
export interface AnthropicOptions extends ProviderOptions {
  /** For enabling beta features. Live on the edge. */
  beta?: string[];
  /**
   * Top-k sampling. See `GenerationOptions` for the juicy gossip.
   * It's here because Anthropic supports it too.
   */
  topK?: number;
  /** Container identifier for reuse across requests. */
  container?: string;
  /** MCP servers to be utilized in this request. */
  mcpServers?: Array<{
    name: string;
    url: string;
    authorization_token?: string;
    tool_configuration?: {
      enabled?: boolean;
      allowed_tools?: string[];
    };
  }>;
  /** An object describing metadata about the request. */
  metadata?: {
    user_id?: string;
  };
  /**
   * Determines whether to use priority capacity (if available) or standard capacity for this request.
   * 'auto' | 'standard_only'
   */
  serviceTier?: 'auto' | 'standard_only';
  /**
   * Configuration for enabling Claude's extended thinking.
   * When enabled, responses include thinking content blocks showing Claude's thinking process.
   * Requires a minimum budget of 1,024 tokens.
   */
  thinking?:
    | {
        type: 'enabled';
        budget_tokens: number;
      }
    | {
        type: 'disabled';
      };
  /**
   * The version of the Anthropic API you want to use.
   * Read more about versioning and version history at https://docs.anthropic.com/en/api/versioning
   */
  anthropicVersion?: string;
  /**
   * System prompt content. Can be a string or an array of text blocks.
   * Provides context and instructions to Claude, such as specifying a particular goal or role.
   * See the guide to system prompts: https://docs.anthropic.com/en/docs/system-prompts
   */
  system?: string | Array<{ type: 'text'; text: string }>;
}

/**
 * The core interface that all AI providers must implement.
 * It's the social contract that holds this whole library together.
 * @group Interfaces
 */
export interface AIProvider<GenOpts extends GenerationOptions = GenerationOptions> {
  /**
   * The main event. This is where the magic happens.
   * Give it a list of messages and some options, and it'll give you back a stream of consciousness.
   * @param messages - The conversation so far. A story waiting to be told.
   * @param options - The rules of the game. How you want the AI to behave.
   * @returns An async iterable of stream chunks. Data, glorious data!
   */
  generate(messages: Message[], options?: GenOpts): AsyncIterable<StreamChunk>;
}

/**
 * Interface for AI providers that support embedding generation.
 * Embedding providers convert text into numerical vectors for semantic similarity tasks.
 * @group Types
 */
export interface EmbeddingProvider<EmbedOpts extends EmbeddingOptions = EmbeddingOptions> {
  /**
   * Generate embeddings for one or more text inputs.
   * Transforms text into numerical vectors that capture semantic meaning.
   * @param texts - Array of text strings to embed. Each string will be converted to an embedding vector.
   * @param options - Configuration options for the embedding generation.
   * @returns Promise that resolves to an embedding response with vectors and usage information.
   */
  embed(texts: string[], options?: EmbedOpts): Promise<EmbeddingResponse>;
}
