import { APIClient } from '@chinmaymk/aikit/providers/api';
import nock from 'nock';
import { Readable } from 'node:stream';

describe('API Client - Advanced Functionality', () => {
  const baseUrl = 'https://api.example.com';
  const headers = { 'Content-Type': 'application/json' };

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Reset any client-related state if needed
  });

  describe('mutateHeaders', () => {
    it('should call mutateHeaders function before making request', async () => {
      const mutateHeaders = jest.fn((headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
        headers['X-Another-Header'] = 'another-value';
      });

      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        headers,
        undefined,
        undefined,
        mutateHeaders
      );

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('X-Custom-Header', 'test-value')
        .matchHeader('X-Another-Header', 'another-value')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithMutateHeaders.stream('/test', { key: 'value' });

      expect(mutateHeaders).toHaveBeenCalledTimes(1);
      expect(mutateHeaders).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value',
          'X-Another-Header': 'another-value',
        })
      );
      expect(scope.isDone()).toBe(true);
    });

    it('should not modify original headers object', async () => {
      const originalHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer token' };
      const mutateHeaders = (headers: Record<string, string>) => {
        headers['X-Custom-Header'] = 'test-value';
        delete headers['Authorization'];
      };

      const clientWithMutateHeaders = new APIClient(
        baseUrl,
        originalHeaders,
        undefined,
        undefined,
        mutateHeaders
      );

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('X-Custom-Header', 'test-value')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithMutateHeaders.stream('/test', { key: 'value' });

      // Original headers should remain unchanged
      expect(originalHeaders).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });
      expect(scope.isDone()).toBe(true);
    });

    it('should work without mutateHeaders function', async () => {
      const clientWithoutMutateHeaders = new APIClient(baseUrl, headers);

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('Content-Type', 'application/json')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      const resultStream = await clientWithoutMutateHeaders.stream('/test', { key: 'value' });

      expect(resultStream).toBeInstanceOf(ReadableStream);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle mutateHeaders that adds authentication', async () => {
      const mutateHeaders = (headers: Record<string, string>) => {
        headers['Authorization'] = 'Bearer dynamic-token';
        headers['X-Request-ID'] = 'req-123';
      };

      const clientWithAuth = new APIClient(baseUrl, headers, undefined, undefined, mutateHeaders);

      const mockData = 'test response data';
      const stream = new Readable({ read() {} });
      stream.push(mockData);
      stream.push(null);

      const scope = nock(baseUrl)
        .post('/test', { key: 'value' })
        .matchHeader('Authorization', 'Bearer dynamic-token')
        .matchHeader('X-Request-ID', 'req-123')
        .reply(200, () => stream, { 'Content-Type': 'text/event-stream' });

      await clientWithAuth.stream('/test', { key: 'value' });

      expect(scope.isDone()).toBe(true);
    });
  });
});
