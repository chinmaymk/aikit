import { models } from '@chinmaymk/aikit/models';

describe('Models', () => {
  it('should export models array with correct structure', () => {
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should contain OpenAI provider models', () => {
    const openaiProvider = models.find(p => p.provider === 'openai');
    expect(openaiProvider).toBeDefined();
    expect(openaiProvider?.models).toBeDefined();
    expect(Array.isArray(openaiProvider?.models)).toBe(true);
    expect(openaiProvider?.models.length).toBeGreaterThan(0);
    expect(openaiProvider?.timestamp).toBeDefined();
  });

  it('should contain Anthropic provider models', () => {
    const anthropicProvider = models.find(p => p.provider === 'anthropic');
    expect(anthropicProvider).toBeDefined();
    expect(anthropicProvider?.models).toBeDefined();
    expect(Array.isArray(anthropicProvider?.models)).toBe(true);
    expect(anthropicProvider?.models.length).toBeGreaterThan(0);
    expect(anthropicProvider?.timestamp).toBeDefined();
  });

  it('should contain Google provider models', () => {
    const googleProvider = models.find(p => p.provider === 'google');
    expect(googleProvider).toBeDefined();
    expect(googleProvider?.models).toBeDefined();
    expect(Array.isArray(googleProvider?.models)).toBe(true);
    expect(googleProvider?.models.length).toBeGreaterThan(0);
    expect(googleProvider?.timestamp).toBeDefined();
  });

  it('should have expected provider types', () => {
    const providerTypes = models.map(p => p.provider);
    expect(providerTypes).toContain('openai');
    expect(providerTypes).toContain('anthropic');
    expect(providerTypes).toContain('google');
  });

  it('should have valid timestamp format', () => {
    models.forEach(provider => {
      expect(provider.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
