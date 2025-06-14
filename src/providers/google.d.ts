import { DynamicParams } from './utils';

// Local replacement for the Google SDK `FunctionCallingMode` enum
export type GoogleFunctionCallingMode = 'AUTO' | 'NONE' | 'ANY';
/**
 * Utility types for request/response payloads (minimal subset)
 */
export type GooglePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: DynamicParams } }
  | { functionResponse: { name: string; response: DynamicParams } };
export interface GoogleContent {
  role: 'user' | 'model' | 'function';
  parts: GooglePart[];
}
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: DynamicParams;
}
export interface ModelConfig {
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
export interface GenerateContentRequestBody extends ModelConfig {
  contents: GoogleContent[];
}
export interface StreamGenerateContentChunk {
  candidates?: Array<{
    content?: GoogleContent;
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}
