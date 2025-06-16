import { createProvider } from '@chinmaymk/aikit/factory';

describe('Provider Factory Edge Cases', () => {
  it('should throw for unknown provider type', () => {
    // @ts-expect-error: intentionally passing invalid type
    expect(() => createProvider('unknown', {})).toThrow();
  });

  it('should throw for missing API key for openai', () => {
    expect(() => {
      // @ts-expect-error: missing apiKey
      createProvider('openai', { model: 'gpt-3.5-turbo' });
    }).toThrow();
  });

  it('should throw for missing API key for google', () => {
    expect(() => {
      // @ts-expect-error: missing apiKey
      createProvider('google', { model: 'gemini-1.5-pro' });
    }).toThrow();
  });

  it('should throw for missing API key for anthropic', () => {
    expect(() => {
      // @ts-expect-error: missing apiKey
      createProvider('anthropic', { model: 'claude-3-opus-20240229' });
    }).toThrow();
  });

  it('should throw for missing model for openai', () => {
    expect(() => {
      createProvider('openai', { apiKey: 'sk-test' });
    }).toThrow();
  });

  it('should throw for missing model for google', () => {
    expect(() => {
      createProvider('google', { apiKey: 'sk-test' });
    }).toThrow();
  });

  it('should throw for missing model for anthropic', () => {
    expect(() => {
      createProvider('anthropic', { apiKey: 'sk-test' });
    }).toThrow();
  });
});
