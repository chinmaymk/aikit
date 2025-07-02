import { userAudio, userMultipleAudio, audioContent } from '../src/message-helpers';
import { MessageTransformer } from '../src/providers/utils';

// Mock console.warn for testing
const mockWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('Audio Coverage Tests', () => {
  afterEach(() => {
    mockWarn.mockClear();
  });

  afterAll(() => {
    mockWarn.mockRestore();
  });

  describe('Audio Helper Functions Coverage', () => {
    it('should create userAudio message', () => {
      const message = userAudio('Test audio', 'data:audio/wav;base64,UklGRigAAA==', 'wav');
      expect(message.role).toBe('user');
      expect(message.content).toHaveLength(2);
      expect(message.content[0].type).toBe('text');
      expect(message.content[1].type).toBe('audio');
    });

    it('should create userAudio message without format', () => {
      const message = userAudio('Test audio', 'data:audio/wav;base64,UklGRigAAA==');
      expect(message.content[1]).toEqual({
        type: 'audio',
        audio: 'data:audio/wav;base64,UklGRigAAA==',
      });
    });

    it('should create userMultipleAudio message', () => {
      const audioFiles = [
        { audio: 'data:audio/wav;base64,UklGRigAAA==', format: 'wav' },
        { audio: 'data:audio/mp3;base64,SUQzBA==' },
      ];
      const message = userMultipleAudio('Test multiple audio', audioFiles);
      expect(message.content).toHaveLength(3);
      expect(message.content[0].type).toBe('text');
      expect(message.content[1].type).toBe('audio');
      expect(message.content[2].type).toBe('audio');
    });

    it('should create audioContent', () => {
      const audio = audioContent('data:audio/wav;base64,UklGRigAAA==', 'wav');
      expect(audio).toEqual({
        type: 'audio',
        audio: 'data:audio/wav;base64,UklGRigAAA==',
        format: 'wav',
      });
    });

    it('should create audioContent without format', () => {
      const audio = audioContent('data:audio/wav;base64,UklGRigAAA==');
      expect(audio).toEqual({
        type: 'audio',
        audio: 'data:audio/wav;base64,UklGRigAAA==',
      });
    });
  });

  describe('Audio Utility Functions Coverage', () => {
    it('should extract audio base64 data', () => {
      const data = MessageTransformer.extractAudioBase64Data('data:audio/wav;base64,UklGRigAAA==');
      expect(data).toBe('UklGRigAAA==');
    });

    it('should detect audio MIME types', () => {
      expect(MessageTransformer.detectAudioMimeType('data:audio/wav;base64,test')).toBe(
        'audio/wav'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/mp3;base64,test')).toBe(
        'audio/mp3'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/mpeg;base64,test')).toBe(
        'audio/mp3'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/webm;base64,test')).toBe(
        'audio/webm'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/ogg;base64,test')).toBe(
        'audio/ogg'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/m4a;base64,test')).toBe(
        'audio/mp4'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/mp4;base64,test')).toBe(
        'audio/mp4'
      );
      expect(MessageTransformer.detectAudioMimeType('data:audio/unknown;base64,test')).toBe(
        'audio/wav'
      );
      expect(MessageTransformer.detectAudioMimeType('invalid-url')).toBe('audio/wav');
    });

    it('should group content including audio', () => {
      const content = [
        { type: 'text' as const, text: 'Hello' },
        { type: 'audio' as const, audio: 'data:audio/wav;base64,UklGRigAAA==', format: 'wav' },
      ];
      const grouped = MessageTransformer.groupContentByType(content);
      expect(grouped.audio).toHaveLength(1);
      expect(grouped.audio[0].audio).toBe('data:audio/wav;base64,UklGRigAAA==');
    });
  });
});
