import { StreamState } from '../../src/providers/utils';
import { GenerationUsage } from '../../src/types';

describe('Timing functionality', () => {
  describe('StreamState timing', () => {
    let mockDateNow: jest.SpyInstance;
    let currentTime: number;

    beforeEach(() => {
      currentTime = 1000000; // Start at a fixed time
      mockDateNow = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
    });

    afterEach(() => {
      mockDateNow.mockRestore();
    });

    it('should track total time from start to finish', () => {
      const state = new StreamState();

      // Simulate 50ms passing
      currentTime += 50;

      const chunk = state.createChunk('', 'stop');

      expect(chunk.usage?.totalTime).toBe(50);
    });

    it('should track time to first token', () => {
      const state = new StreamState();

      // Simulate 20ms passing before first token
      currentTime += 20;
      state.addContentDelta('Hello');

      // Simulate additional 30ms passing to finish
      currentTime += 30;

      const chunk = state.createChunk('', 'stop');

      expect(chunk.usage?.timeToFirstToken).toBe(20);
      expect(chunk.usage?.totalTime).toBe(50);
    });

    it('should track time to first token with reasoning', () => {
      const state = new StreamState();

      // Simulate 15ms passing before first reasoning token
      currentTime += 15;
      state.addReasoningDelta('Thinking...');

      // Simulate additional 35ms passing to finish
      currentTime += 35;

      const chunk = state.createChunk('', 'stop');

      expect(chunk.usage?.timeToFirstToken).toBe(15);
      expect(chunk.usage?.totalTime).toBe(50);
    });

    it('should preserve existing usage data while adding timing', () => {
      const state = new StreamState();

      // Simulate 25ms passing
      currentTime += 25;
      state.addContentDelta('Hello');

      // Simulate additional 25ms passing to finish
      currentTime += 25;

      const existingUsage: GenerationUsage = {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      };

      const chunk = state.createChunk('', 'stop', existingUsage);

      expect(chunk.usage).toMatchObject({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        timeToFirstToken: 25,
        totalTime: 50,
      });
    });

    it('should only add timing on finish reason chunks', () => {
      const state = new StreamState();

      // Simulate time passing
      currentTime += 30;
      state.addContentDelta('Hello');

      const intermediateChunk = state.createChunk('world'); // No finish reason

      // Should not have timing info in intermediate chunks
      expect(intermediateChunk.usage).toBeUndefined();
    });

    it('should handle case where no first token is received', () => {
      const state = new StreamState();

      // Simulate 40ms passing without any tokens
      currentTime += 40;

      const chunk = state.createChunk('', 'stop');

      expect(chunk.usage?.timeToFirstToken).toBeUndefined();
      expect(chunk.usage?.totalTime).toBe(40);
    });

    it('should not track first token time for empty or whitespace-only content', () => {
      const state = new StreamState();

      // Simulate 10ms passing before empty content
      currentTime += 10;
      state.addContentDelta(''); // Empty string should not trigger timing

      // Simulate 15ms more passing before whitespace-only content
      currentTime += 15;
      state.addContentDelta('   '); // Whitespace-only should not trigger timing

      // Simulate 10ms more passing before meaningful content
      currentTime += 10;
      state.addContentDelta('H'); // Single character should trigger timing

      // Simulate additional 30ms passing to finish
      currentTime += 30;

      const chunk = state.createChunk('', 'stop');

      // Should track from when 'H' was added (35ms from start)
      expect(chunk.usage?.timeToFirstToken).toBe(35);
      expect(chunk.usage?.totalTime).toBe(65);
    });

    it('should not track first token time for reasoning with empty or whitespace-only content', () => {
      const state = new StreamState();

      // Simulate 10ms passing before empty reasoning
      currentTime += 10;
      state.addReasoningDelta(''); // Empty string should not trigger timing

      // Simulate 15ms more passing before whitespace-only reasoning
      currentTime += 15;
      state.addReasoningDelta('   '); // Whitespace-only should not trigger timing

      // Simulate 10ms more passing before meaningful reasoning
      currentTime += 10;
      state.addReasoningDelta('T'); // Single character should trigger timing

      // Simulate additional 30ms passing to finish
      currentTime += 30;

      const chunk = state.createChunk('', 'stop');

      // Should track from when 'T' was added (35ms from start)
      expect(chunk.usage?.timeToFirstToken).toBe(35);
      expect(chunk.usage?.totalTime).toBe(65);
    });
  });
});
