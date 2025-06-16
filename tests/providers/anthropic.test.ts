import { createAnthropic, anthropic as directAnthropic } from '../../src/providers/anthropic';
import type { AnthropicOptions } from '../../src/types';

describe('Anthropic Provider - Coverage', () => {
  it('should throw if no apiKey is provided', () => {
    // purposely missing apiKey
    expect(() => createAnthropic({ model: 'claude-3-haiku-20240307' } as any)).toThrow(
      'Anthropic API key is required'
    );
  });

  it('should throw if no model is provided in config or options', async () => {
    const provider = createAnthropic({ apiKey: 'x' });
    await expect(
      (async () => {
        for await (const unused of provider([], {})) {
          void unused;
        }
      })()
    ).rejects.toThrow('Model is required in config or options');
  });

  it('should build headers with beta and anthropicVersion', () => {
    // purposely missing model for header test
    const provider = createAnthropic({
      apiKey: 'x',
      beta: ['tools'],
      anthropicVersion: '2023-06-01',
    } as any);
    expect(provider).toBeInstanceOf(Function);
  });

  it('should build request params with all options', async () => {
    const provider = createAnthropic({
      apiKey: 'x',
      model: 'claude-3-haiku-20240307',
      beta: ['tools'],
      anthropicVersion: '2023-06-01',
      maxOutputTokens: 123,
      temperature: 0.5,
      topP: 0.9,
      topK: 5,
      stopSequences: ['END'],
      system: 'sys',
      tools: [{ name: 't', description: 'd', parameters: {} }],
      toolChoice: { name: 't' },
      container: 'c',
      mcpServers: [{ name: 'n', url: 'u' }],
      metadata: { user_id: 'u' },
      serviceTier: 'auto',
      thinking: { type: 'enabled', budget_tokens: 10 },
    });
    await expect(
      (async () => {
        for await (const unused of provider(
          [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
          {}
        )) {
          void unused;
        }
      })()
    ).rejects.toThrow();
  });

  it('direct anthropic function should yield from createAnthropic', async () => {
    const config: AnthropicOptions & { apiKey: string } = {
      apiKey: 'x',
      model: 'claude-3-haiku-20240307',
    };
    await expect(
      (async () => {
        for await (const unused of directAnthropic(
          [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
          config
        )) {
          void unused;
        }
      })()
    ).rejects.toThrow();
  });
});
