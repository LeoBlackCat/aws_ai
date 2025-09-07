import TTSService from '@/services/TTSService';
import AudioGenerationPipeline from '@/services/AudioGenerationPipeline';

// Mock ElevenLabs API
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsApi: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue({
      getReader: () => ({
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
          .mockResolvedValueOnce({ done: false, value: new Uint8Array([4, 5, 6]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }),
    }),
    voices: {
      getAll: jest.fn().mockResolvedValue({
        voices: [
          {
            voice_id: 'test-voice-1',
            name: 'Test Voice 1',
            category: 'general',
            description: 'A test voice',
            preview_url: 'https://example.com/preview1.mp3',
          },
          {
            voice_id: 'test-voice-2',
            name: 'Test Voice 2',
            category: 'professional',
            description: 'Another test voice',
          },
        ],
      }),
    },
  })),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    ELEVENLABS_API_KEY: 'test-api-key',
    ELEVENLABS_VOICE_ID: 'test-voice-id',
    ELEVENLABS_MODEL_ID: 'test-model-id',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('TTSService', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    ttsService = new TTSService();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      delete process.env.ELEVENLABS_API_KEY;
      expect(() => new TTSService()).toThrow('ELEVENLABS_API_KEY environment variable is required');
    });

    it('should initialize with default values', () => {
      expect(ttsService).toBeInstanceOf(TTSService);
    });
  });

  describe('generateAudio', () => {
    it('should generate audio successfully', async () => {
      const text = 'Hello, this is a test message for AWS AI training.';
      const result = await ttsService.generateAudio(text);

      expect(result).toMatchObject({
        audioUrl: 'blob:test-url',
        voiceId: 'test-voice-id',
        text,
        generatedAt: expect.any(Date),
      });
      expect(result.duration).toBeGreaterThan(0);
      expect(result.audioBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should use custom options', async () => {
      const text = 'Test message';
      const options = {
        voiceId: 'custom-voice',
        stability: 0.8,
        similarityBoost: 0.9,
      };

      const result = await ttsService.generateAudio(text, options);
      expect(result.voiceId).toBe('custom-voice');
    });

    it('should handle generation errors', async () => {
      const mockTTSService = new TTSService();
      // Mock the client to throw an error
      (mockTTSService as any).client.generate = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(mockTTSService.generateAudio('test')).rejects.toThrow('Failed to generate audio: API Error');
    });
  });

  describe('getAvailableVoices', () => {
    it('should fetch available voices', async () => {
      const voices = await ttsService.getAvailableVoices();

      expect(voices).toHaveLength(2);
      expect(voices[0]).toMatchObject({
        id: 'test-voice-1',
        name: 'Test Voice 1',
        category: 'general',
        description: 'A test voice',
        previewUrl: 'https://example.com/preview1.mp3',
      });
    });

    it('should handle voice fetch errors', async () => {
      const mockTTSService = new TTSService();
      (mockTTSService as any).client.voices.getAll = jest.fn().mockRejectedValue(new Error('Network Error'));

      await expect(mockTTSService.getAvailableVoices()).rejects.toThrow('Failed to fetch available voices');
    });
  });

  describe('generateLessonSummary', () => {
    it('should generate lesson summary audio', async () => {
      const lessonContent = `
        # AWS AI Services Overview
        
        Amazon Web Services provides several AI and machine learning services:
        
        - **Amazon Bedrock**: Fully managed service for foundation models
        - **Amazon SageMaker**: Complete machine learning platform
        - **Amazon Comprehend**: Natural language processing service
        
        These services help developers build intelligent applications.
      `;
      const lessonTitle = 'AWS AI Services Introduction';

      const result = await ttsService.generateLessonSummary(lessonContent, lessonTitle);

      expect(result.text).toContain('Welcome to the lesson summary for AWS AI Services Introduction');
      expect(result.text).toContain('AWS');
      expect(result.audioUrl).toBe('blob:test-url');
    });
  });

  describe('generateDailyRecap', () => {
    it('should generate daily recap audio', async () => {
      const learningProgress = {
        lessonsCompleted: ['AWS Fundamentals', 'Machine Learning Basics'],
        quizScores: [
          { lesson: 'AWS Fundamentals', score: 85 },
          { lesson: 'Machine Learning Basics', score: 92 },
        ],
        newConcepts: ['Amazon Bedrock', 'SageMaker'],
        reviewItems: ['EC2 instances', 'S3 buckets'],
      };

      const result = await ttsService.generateDailyRecap(learningProgress);

      expect(result.text).toContain('daily learning recap');
      expect(result.text).toContain('2 lesson');
      expect(result.text).toContain('89%'); // Average score
      expect(result.audioUrl).toBe('blob:test-url');
    });
  });

  describe('cleanupAudioUrl', () => {
    it('should revoke blob URLs', () => {
      const blobUrl = 'blob:test-url';
      TTSService.cleanupAudioUrl(blobUrl);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
    });

    it('should not revoke non-blob URLs', () => {
      const httpUrl = 'https://example.com/audio.mp3';
      TTSService.cleanupAudioUrl(httpUrl);
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
    });
  });
});

describe('AudioGenerationPipeline', () => {
  let pipeline: AudioGenerationPipeline;

  beforeEach(() => {
    pipeline = new AudioGenerationPipeline();
  });

  describe('generateLessonAudio', () => {
    it('should generate lesson audio with metadata', async () => {
      const request = {
        lessonId: 'lesson-123',
        lessonTitle: 'AWS AI Fundamentals',
        lessonContent: 'This lesson covers AWS AI services and their use cases.',
      };

      const result = await pipeline.generateLessonAudio(request);

      expect(result).toMatchObject({
        type: 'lesson-summary',
        title: 'AWS AI Fundamentals - Audio Summary',
        metadata: {
          lessonId: 'lesson-123',
          originalLength: request.lessonContent.length,
        },
      });
    });
  });

  describe('generateDailyRecapAudio', () => {
    it('should generate daily recap with progress data', async () => {
      const request = {
        userId: 'user-123',
        date: new Date('2024-01-15'),
        learningProgress: {
          lessonsCompleted: ['lesson-1'],
          quizScores: [{ lesson: 'lesson-1', score: 90 }],
          newConcepts: ['Bedrock'],
          reviewItems: ['SageMaker'],
        },
      };

      const result = await pipeline.generateDailyRecapAudio(request);

      expect(result).toMatchObject({
        type: 'daily-recap',
        title: 'Daily Learning Recap - 1/15/2024',
        metadata: {
          userId: 'user-123',
          lessonsCount: 1,
          quizzesCount: 1,
        },
      });
    });
  });

  describe('queueAudioGeneration', () => {
    it('should queue lesson audio generation', async () => {
      const request = {
        lessonId: 'lesson-123',
        lessonTitle: 'Test Lesson',
        lessonContent: 'Test content',
      };

      const queueId = await pipeline.queueAudioGeneration('lesson-summary', request, 'high');

      expect(queueId).toMatch(/^queue-/);
      
      const status = pipeline.getQueueStatus(queueId);
      expect(status).toMatchObject({
        type: 'lesson-summary',
        priority: 'high',
        status: expect.stringMatching(/^(pending|processing|completed)$/),
      });
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', () => {
      const stats = pipeline.getQueueStats();
      
      expect(stats).toMatchObject({
        pending: expect.any(Number),
        processing: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        total: expect.any(Number),
      });
    });
  });
});