import { createProxyProvider, callProxyProvider } from '../../src/providers/proxy';
import type { ProxyRequest } from '../../src/providers/proxy';
import { userText, toReadableStream, mapStream } from '../../src/utils';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { createOpenAI } from '../../src/providers/openai_completions';
import { StreamChunk } from '../../src/types';
import { TextEncoderStream } from 'node:stream/web';

jest.mock('../../src/providers/openai_completions');

describe('E2E Proxy Provider Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should handle a full e2e proxy flow', async () => {
    // 1. Mock the actual provider that will be resolved on the "backend"
    const mockProviderStream = (async function* () {
      yield { type: 'chunk', delta: 'Hello' };
      yield { type: 'chunk', delta: ' from' };
      yield { type: 'chunk', delta: ' mocked provider' };
    })() as AsyncIterable<StreamChunk>;

    const mockProvider = jest.fn().mockReturnValue(mockProviderStream);
    const mockedCreateOpenAI = createOpenAI as jest.Mock;
    mockedCreateOpenAI.mockReturnValue(mockProvider);

    // 2. Mock the fetch call to simulate the client-server communication
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const requestBody = JSON.parse(init!.body as string) as ProxyRequest;

      // Add API key on the "server", you can validate the
      const requestWithApiKey = {
        ...requestBody,
        providerOptions: {
          ...requestBody.providerOptions,
          apiKey: 'sk-test-key',
        },
      };

      // 3. On the "backend", resolve the provider and get the SSE stream
      const sseStream = callProxyProvider(requestWithApiKey);
      const responseStream = toReadableStream(sseStream).pipeThrough(new TextEncoderStream());

      return Promise.resolve(new Response(responseStream, { status: 200 }));
    });

    // 4. "Client" side: create and use the proxy
    const proxy = createProxyProvider('openai', {
      baseURL: 'http://localhost:3000',
      model: 'gpt-4o-test',
    });

    const messages = [userText('test message')];
    const stream = proxy(messages, { temperature: 0.5 });

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // 5. Assertions
    expect(chunks).toEqual([
      { type: 'chunk', delta: 'Hello' },
      { type: 'chunk', delta: ' from' },
      { type: 'chunk', delta: ' mocked provider' },
    ]);

    // Check if createOpenAI was called correctly by resolveProxyProvider
    expect(mockedCreateOpenAI).toHaveBeenCalledWith({
      model: 'gpt-4o-test',
      apiKey: 'sk-test-key',
    });

    // Check if the mocked provider was called with the right messages and options
    expect(mockProvider).toHaveBeenCalledWith(messages, { temperature: 0.5 });

    fetchSpy.mockRestore();
  });
});
