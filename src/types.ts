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
  /** Who's talking? A user, the assistant, the system, or a tool. */
  role: 'user' | 'assistant' | 'system' | 'tool';
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
  finishReason?: 'stop' | 'length' | 'tool_use' | 'error';
  /** Any tool calls that came through in this chunk. The plot thickens. */
  toolCalls?: ToolCall[];
}

/**
 * The basic knobs and dials for controlling the AI's creative genius.
 * These are the options that all providers understand.
 */
export interface GenerationOptions {
  /** The specific model you want to use. e.g., 'gpt-4o' or 'claude-3-5-sonnet-20240620'. */
  model: string;
  /** The maximum number of tokens to generate. Don't want it to ramble on forever, do you? */
  maxTokens?: number;
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
 * OpenAI-specific settings. For when you need that special OpenAI flavor.
 * These are the secret spices for the GPT family.
 */
export interface OpenAIGenerationOptions extends GenerationOptions {
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
}

/**
 * Google Gemini-specific settings. The secret sauce for Gemini models.
 * Because Google likes to do things their own way.
 */
export interface GoogleGenerationOptions extends GenerationOptions {
  /**
   * Top-k sampling. See `GenerationOptions` for the details.
   * It's here because Google supports it.
   */
  topK?: number;
  /** How many different responses to generate. More candidates, more problems. */
  candidateCount?: number;
}

/**
 * Anthropic-specific settings. For when you're feeling a bit more... anthropic.
 * These are the special levers for Claude models.
 */
export interface AnthropicGenerationOptions extends GenerationOptions {
  /**
   * Top-k sampling. See `GenerationOptions` for the juicy gossip.
   * It's here because Anthropic supports it too.
   */
  topK?: number;
}

/**
 * Configuration for the OpenAI provider.
 * This is how you tell AIKit where to find your OpenAI API key and other secrets.
 * @group Interfaces
 */
export interface OpenAIConfig {
  /** Your OpenAI API key. Keep it secret, keep it safe. */
  apiKey: string;
  /** A custom base URL for the API. For proxies and other fun stuff. */
  baseURL?: string;
  /** Your OpenAI organization ID. For when you're part of a fancy club. */
  organization?: string;
  /** Your OpenAI project ID. For even fancier clubs. */
  project?: string;
  /** How long to wait for a response before giving up, in milliseconds. */
  timeout?: number;
  /** How many times to retry a failed request. Because sometimes the internet blinks. */
  maxRetries?: number;
}

/**
 * Configuration for the Anthropic provider.
 * All the deets AIKit needs to talk to Claude.
 * @group Interfaces
 */
export interface AnthropicConfig {
  /** Your Anthropic API key. Don't tell anyone. */
  apiKey: string;
  /** A custom base URL for the API. You know the drill. */
  baseURL?: string;
  /** How long to wait for a response before your patience wears out, in milliseconds. */
  timeout?: number;
  /** How many times to try again. Third time's the charm? */
  maxRetries?: number;
  /** For enabling beta features. Live on the edge. */
  beta?: string[];
}

/**
 * Configuration for the Google Gemini provider.
 * The credentials to unlock the power of Gemini.
 * @group Interfaces
 */
export interface GoogleConfig {
  /** Your Google AI API key. The key to the kingdom. */
  apiKey: string;
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
  generate(messages: Message[], options: GenOpts): AsyncIterable<StreamChunk>;
}
