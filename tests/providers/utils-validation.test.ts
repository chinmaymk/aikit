// Additional tests for ValidationUtils, RequestBuilder, and ResponseProcessor
import { ValidationUtils, RequestBuilder, ResponseProcessor } from '../../src/providers/utils';

describe('Provider Utils - ValidationUtils', () => {
  it('should validate correct data URLs', () => {
    expect(ValidationUtils.isValidDataUrl('data:image/png;base64,abc')).toBe(true);
    expect(ValidationUtils.isValidDataUrl('data:image/jpeg;base64,abc')).toBe(true);
    expect(ValidationUtils.isValidDataUrl('not-a-data-url')).toBe(false);
  });

  it('should validate tool call objects', () => {
    expect(ValidationUtils.isValidToolCall({ id: '1', name: 'test' })).toBe(true);
    expect(ValidationUtils.isValidToolCall({ id: 1, name: 'test' })).toBe(false);
    expect(ValidationUtils.isValidToolCall({})).toBe(false);
    expect(ValidationUtils.isValidToolCall(null)).toBe(false);
  });
});

describe('Provider Utils - RequestBuilder', () => {
  it('should add optional params if they exist', () => {
    const params = { a: 1, b: undefined, c: undefined };
    const options = { b: 2, c: undefined };
    const mappings = { b: 'b', c: 'c' } as Record<'b' | 'c', 'b' | 'c'>;
    RequestBuilder.addOptionalParams(params, options, mappings);
    expect(params).toEqual({ a: 1, b: 2, c: undefined });
  });

  it('should format tools for openai', () => {
    const tools = [{ name: 't', description: 'desc', parameters: {} }];
    const formatted = RequestBuilder.formatTools(tools, 'openai');
    expect(formatted[0]).toHaveProperty('function');
  });

  it('should format tools for responses', () => {
    const tools = [{ name: 't', description: 'desc', parameters: {} }];
    const formatted = RequestBuilder.formatTools(tools, 'responses');
    expect(formatted[0]).toHaveProperty('name');
  });

  it('should handle empty tools array', () => {
    const formatted = RequestBuilder.formatTools([], 'openai');
    expect(formatted).toEqual([]);
  });
});

describe('Provider Utils - ResponseProcessor', () => {
  it('should process stream lines correctly', async () => {
    const lines = ['line1', 'line2', 'line3'];
    const extractFn = (line: string) => (line === 'bad' ? null : Number(line));
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual([NaN, NaN, NaN]);
  });

  it('should handle null extraction results', async () => {
    const lines = ['good', 'bad', 'good'];
    const extractFn = (line: string) => (line === 'bad' ? null : line);
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual(['good', 'good']);
  });

  it('should handle empty stream', async () => {
    const extractFn = (line: string) => line;
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {})(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual([]);
  });

  it('should handle stream errors gracefully', async () => {
    const extractFn = (line: string) => {
      if (line === 'error') throw new Error('Test error');
      return line;
    };
    const results: string[] = [];
    await expect(async () => {
      for await (const result of ResponseProcessor.processStreamLines(
        (async function* () {
          yield 'good';
          yield 'error';
          yield 'after-error';
        })(),
        extractFn
      )) {
        results.push(result);
      }
    }).rejects.toThrow('Test error');
    expect(results).toEqual(['good']);
  });

  it('should handle async extraction functions', async () => {
    const lines = ['1', '2', '3'];
    const extractFn = async (line: string) => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return Number(line);
    };
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle mixed sync and async extraction', async () => {
    const lines = ['sync', 'async'];
    const extractFn = (line: string) => {
      if (line === 'async') {
        return Promise.resolve(line.toUpperCase());
      }
      return line.toUpperCase();
    };
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual(['SYNC', 'ASYNC']);
  });

  it('should handle extraction function returning undefined', async () => {
    const lines = ['keep', 'skip', 'keep'];
    const extractFn = (line: string) => (line === 'skip' ? undefined : line);
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual(['keep', undefined, 'keep']);
  });

  it('should handle complex extraction logic', async () => {
    const lines = ['data:{"value":1}', 'data:{"value":2}', 'invalid', 'data:{"value":3}'];
    const extractFn = (line: string) => {
      if (!line.startsWith('data:')) return null;
      try {
        return JSON.parse(line.slice(5));
      } catch {
        return null;
      }
    };
    const results = [];
    for await (const result of ResponseProcessor.processStreamLines(
      (async function* () {
        for (const line of lines) {
          yield line;
        }
      })(),
      extractFn
    )) {
      results.push(result);
    }
    expect(results).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
  });
});
