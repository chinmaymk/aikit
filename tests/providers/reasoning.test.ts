import {
  AnthropicProvider,
  OpenAIProvider,
  GoogleGeminiProvider,
  userText,
  collectDeltas,
  processStream,
  type StreamChunk,
  type AnthropicOptions,
  type OpenAIOptions,
  type GoogleOptions,
} from '@chinmaymk/aikit';
import {
  anthropicTextResponseWithReasoning,
  anthropicReasoningDeltaChunk,
} from '../helpers/anthropicChunks';
import nock from 'nock';
import { Readable } from 'node:stream';
import { createAnthropicSSEStream } from '../helpers/stream';

/**
 * Helper to create an OpenAI streaming response with reasoning.
 */
function createOpenAIReasoningStream(): Readable {
  const chunks = [
    { choices: [{ delta: { reasoning: 'Let me think about this...' } }] },
    { choices: [{ delta: { reasoning: ' I need to consider...' } }] },
    { choices: [{ delta: { content: 'Here is my response' } }] },
    { choices: [{ finish_reason: 'stop' }] },
  ];

  const stream = new Readable({ read() {} });
  chunks.forEach(chunk => {
    stream.push(`data: ${JSON.stringify(chunk)}\n\n`);
  });
  stream.push('data: [DONE]\n\n');
  stream.push(null);
  return stream;
}

describe('Reasoning Support', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider({
      apiKey: 'test-api-key',
    } as AnthropicOptions);

    it('should expose reasoning content in stream chunks', async () => {
      const mockChunks = anthropicTextResponseWithReasoning(
        'My answer',
        'Let me think about this carefully...',
        'end_turn'
      );

      const scope = nock('https://api.anthropic.com/v1')
        .post('/messages')
        .reply(200, () => createAnthropicSSEStream(mockChunks), {
          'content-type': 'text/event-stream',
        });

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([userText('Hello')], {
        model: 'claude-3-5-sonnet-20241022',
        thinking: { type: 'enabled', budget_tokens: 1024 },
      })) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);

      // Find chunks with reasoning content
      const chunksWithReasoning = chunks.filter(chunk => chunk.reasoning);
      expect(chunksWithReasoning.length).toBeGreaterThan(0);

      const finalReasoning = chunksWithReasoning[chunksWithReasoning.length - 1].reasoning;
      expect(finalReasoning?.content).toBe('Let me think about this carefully...');
    });

    it('should include reasoning in collectDeltas result', async () => {
      const mockResponseChunks = anthropicTextResponseWithReasoning(
        'Response text',
        'This is my reasoning process',
        'end_turn'
      );

      nock('https://api.anthropic.com/v1')
        .post('/messages')
        .reply(200, () => createAnthropicSSEStream(mockResponseChunks), {
          'content-type': 'text/event-stream',
        });

      const result = await collectDeltas(
        provider.generate([userText('Test')], {
          model: 'claude-3-5-sonnet-20241022',
          thinking: { type: 'enabled', budget_tokens: 1024 },
        })
      );

      expect(result.reasoning).toBe('This is my reasoning process');
      expect(result.content).toBe('Response text');
    });

    it('should support reasoning callbacks in processStream', async () => {
      const reasoningChunks = [
        anthropicReasoningDeltaChunk('Reasoning part 1'),
        anthropicReasoningDeltaChunk(' and part 2'),
      ];

      nock('https://api.anthropic.com/v1')
        .post('/messages')
        .reply(200, () => createAnthropicSSEStream(reasoningChunks), {
          'content-type': 'text/event-stream',
        });

      const reasoningDeltas: string[] = [];
      let finalReasoning = '';

      await processStream(
        provider.generate([userText('Test')], {
          model: 'claude-3-5-sonnet-20241022',
          thinking: { type: 'enabled', budget_tokens: 1024 },
        }),
        {
          onReasoning: reasoning => {
            reasoningDeltas.push(reasoning.delta);
            finalReasoning = reasoning.content;
          },
        }
      );

      expect(reasoningDeltas).toEqual(['Reasoning part 1', ' and part 2']);
      expect(finalReasoning).toBe('Reasoning part 1 and part 2');
    });
  });

  describe('OpenAIProvider', () => {
    const provider = new OpenAIProvider({
      apiKey: 'test-api-key',
    } as OpenAIOptions);

    it('should expose reasoning content for o1 models', async () => {
      const scope = nock('https://api.openai.com/v1')
        .post('/chat/completions')
        .reply(200, () => createOpenAIReasoningStream(), {
          'content-type': 'text/event-stream',
        });

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([userText('Hello')], {
        model: 'o1-mini',
        reasoning: { effort: 'medium' },
      })) {
        chunks.push(chunk);
      }

      expect(scope.isDone()).toBe(true);

      // Find chunks with reasoning content
      const reasoningChunks = chunks.filter(chunk => chunk.reasoning);
      expect(reasoningChunks.length).toBeGreaterThan(0);

      const finalReasoning = reasoningChunks[reasoningChunks.length - 1].reasoning;
      expect(finalReasoning?.content).toBe('Let me think about this... I need to consider...');
    });

    it('should include reasoning in collectDeltas result', async () => {
      nock('https://api.openai.com/v1')
        .post('/chat/completions')
        .reply(200, () => createOpenAIReasoningStream(), {
          'content-type': 'text/event-stream',
        });

      const result = await collectDeltas(
        provider.generate([userText('Test')], {
          model: 'o1-mini',
          reasoning: { effort: 'high' },
        })
      );

      expect(result.reasoning).toBe('Let me think about this... I need to consider...');
      expect(result.content).toBe('Here is my response');
    });
  });

  describe('GoogleGeminiProvider', () => {
    const provider = new GoogleGeminiProvider({
      apiKey: 'test-api-key',
    } as GoogleOptions);

    it('should not expose reasoning content (not supported)', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Google response' }],
            },
          },
        ],
      };

      nock('https://generativelanguage.googleapis.com/v1beta')
        .post(/\/models\/.*:streamGenerateContent/)
        .reply(200, `data: ${JSON.stringify(mockResponse)}\n\n`, {
          'content-type': 'text/event-stream',
        });

      const chunks: StreamChunk[] = [];
      for await (const chunk of provider.generate([userText('Hello')], {
        model: 'gemini-1.5-pro',
      })) {
        chunks.push(chunk);
      }

      // Google doesn't support reasoning, so no chunks should have reasoning content
      const reasoningChunks = chunks.filter(chunk => chunk.reasoning);
      expect(reasoningChunks.length).toBe(0);
    });
  });
});
