import {
  GoogleMessageTransformer,
  GoogleRequestBuilder,
  GoogleStreamProcessor,
  createGoogle,
} from '../../src/providers/google';
import { StreamState } from '../../src/providers/utils';
import type { Message } from '../../src/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Google Provider - Coverage', () => {
  it('GoogleMessageTransformer.transform should handle all roles and tool mapping', () => {
    const messages: Message[] = [
      { role: 'system', content: [{ type: 'text', text: 'sys' }] },
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'hello' }],
        toolCalls: [{ id: '1', name: 'func', arguments: {} }],
      },
      { role: 'tool', content: [{ type: 'tool_result', toolCallId: '1', result: 'ok' }] },
    ];
    const result = GoogleMessageTransformer.transform(messages);
    expect(result.systemInstruction).toContain('sys');
    expect(result.googleMessages.length).toBeGreaterThan(0);
  });

  it('GoogleMessageTransformer.mapMessage should throw on unknown role', () => {
    expect(() =>
      // @ts-expect-error purposely passing unknown role
      GoogleMessageTransformer['mapMessage']({ role: 'unknown', content: [] }, new Map())
    ).toThrow();
  });

  it('GoogleRequestBuilder.build should return endpoint and payload', () => {
    const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }];
    const options = { model: 'foo', apiKey: 'bar' };
    const { endpoint, payload } = GoogleRequestBuilder.build(messages, options);
    expect(endpoint).toContain('foo');
    expect(payload.contents.length).toBe(1);
  });

  it('GoogleRequestBuilder.formatToolChoice should handle all cases', () => {
    expect(GoogleRequestBuilder['formatToolChoice']('required')).toEqual({ mode: 'ANY' });
    expect(GoogleRequestBuilder['formatToolChoice']('auto')).toEqual({ mode: 'AUTO' });
    expect(GoogleRequestBuilder['formatToolChoice']('none')).toEqual({ mode: 'NONE' });
    expect(GoogleRequestBuilder['formatToolChoice']({ name: 'x' })).toEqual({
      mode: 'ANY',
      allowedFunctionNames: ['x'],
    });
    expect(GoogleRequestBuilder['formatToolChoice'](undefined)).toEqual({ mode: 'AUTO' });
  });

  it('GoogleStreamProcessor.process should yield a StreamChunk', async () => {
    const lines = async function* () {
      yield 'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}],"usageMetadata":{"promptTokenCount":1}}';
      yield 'data: [DONE]';
    };
    const chunks = [];
    for await (const chunk of GoogleStreamProcessor.process(lines())) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toBe('hi');
  });

  it('GoogleStreamProcessor.processChunk should handle missing parts', () => {
    const state = new StreamState();
    const chunk = { candidates: [{}], usageMetadata: { promptTokenCount: 1 } };
    const result = GoogleStreamProcessor['processChunk'](chunk, state);
    expect(result).not.toBeNull();
  });

  it('GoogleStreamProcessor.extractUsage should handle all usage fields', () => {
    const chunk = {
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 2,
        totalTokenCount: 3,
        cachedContentTokenCount: 4,
      },
    };
    const usage = GoogleStreamProcessor['extractUsage'](chunk);
    expect(usage).toBeDefined();
    expect(usage!.inputTokens).toBe(1);
    expect(usage!.outputTokens).toBe(2);
    expect(usage!.totalTokens).toBe(3);
    expect(usage!.cacheTokens).toBe(4);
  });

  it('createGoogle should throw if no apiKey or model', async () => {
    // @ts-expect-error purposely missing apiKey
    expect(() => createGoogle({})).toThrow();
    const provider = createGoogle({ apiKey: 'x', model: 'foo' });
    await expect(
      (async () => {
        for await (const chunk of provider([], {})) {
          void chunk;
        }
      })()
    ).rejects.toThrow();
  });
});
