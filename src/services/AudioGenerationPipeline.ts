import TTSService, { TTSOptions, AudioGenerationResult, VoiceOption } from './TTSService';
import PodcastRecapGenerator, { LearningProgress, PodcastRecapOptions } from './PodcastRecapGenerator';

export interface AudioContent {
  id: string;
  type: 'lesson-summary' | 'daily-recap' | 'custom';
  title: string;
  text: string;
  audioUrl?: string;
  duration?: number;
  voiceId: string;
  generatedAt?: Date;
  metadata?: Record<string, any>;
}

export interface LessonAudioRequest {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  voiceId?: string;
  options?: TTSOptions;
}

export interface DailyRecapRequest {
  userId: string;
  date: Date;
  learningProgress: {
    lessonsCompleted: string[];
    quizScores: { lesson: string; score: number }[];
    newConcepts: string[];
    reviewItems: string[];
  };
  voiceId?: string;
  options?: TTSOptions;
}

export interface AudioGenerationQueue {
  id: string;
  type: 'lesson-summary' | 'daily-recap';
  priority: 'high' | 'normal' | 'low';
  request: LessonAudioRequest | DailyRecapRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export class AudioGenerationPipeline {
  private ttsService: TTSService;
  private podcastGenerator: PodcastRecapGenerator;
  private generationQueue: Map<string, AudioGenerationQueue> = new Map();
  private isProcessing = false;

  constructor() {
    this.ttsService = new TTSService();
    this.podcastGenerator = new PodcastRecapGenerator();
  }

  /**
   * Generate audio for a lesson summary
   */
  async generateLessonAudio(request: LessonAudioRequest): Promise<AudioContent> {
    try {
      const result = await this.ttsService.generateLessonSummary(
        request.lessonContent,
        request.lessonTitle,
        request.options
      );

      return {
        id: `lesson-${request.lessonId}-${Date.now()}`,
        type: 'lesson-summary',
        title: `${request.lessonTitle} - Audio Summary`,
        text: result.text,
        audioUrl: result.audioUrl,
        duration: result.duration,
        voiceId: result.voiceId,
        generatedAt: result.generatedAt,
        metadata: {
          lessonId: request.lessonId,
          originalLength: request.lessonContent.length,
          wordCount: request.lessonContent.split(/\s+/).length,
          estimatedReadingTime: Math.ceil(request.lessonContent.split(/\s+/).length / 200), // 200 WPM
        },
      };
    } catch (error) {
      console.error('Failed to generate lesson audio:', error);
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate enhanced podcast-style lesson summary
   */
  async generatePodcastLessonSummary(
    request: LessonAudioRequest & { 
      includeIntro?: boolean;
      includeKeyTakeaways?: boolean;
      tone?: 'professional' | 'friendly' | 'encouraging' | 'casual';
    }
  ): Promise<AudioContent> {
    try {
      // Create enhanced lesson summary with podcast-style formatting
      const enhancedSummary = this.createPodcastLessonScript(
        request.lessonContent,
        request.lessonTitle,
        {
          includeIntro: request.includeIntro ?? true,
          includeKeyTakeaways: request.includeKeyTakeaways ?? true,
          tone: request.tone ?? 'encouraging',
        }
      );

      const result = await this.ttsService.generateAudio(enhancedSummary, request.options);

      return {
        id: `podcast-lesson-${request.lessonId}-${Date.now()}`,
        type: 'lesson-summary',
        title: `${request.lessonTitle} - Podcast Summary`,
        text: enhancedSummary,
        audioUrl: result.audioUrl,
        duration: result.duration,
        voiceId: result.voiceId,
        generatedAt: result.generatedAt,
        metadata: {
          lessonId: request.lessonId,
          originalLength: request.lessonContent.length,
          podcastStyle: true,
          tone: request.tone,
        },
      };
    } catch (error) {
      console.error('Failed to generate podcast lesson audio:', error);
      throw new Error(`Podcast lesson generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create podcast-style lesson script
   */
  private createPodcastLessonScript(
    content: string,
    title: string,
    options: {
      includeIntro: boolean;
      includeKeyTakeaways: boolean;
      tone: string;
    }
  ): string {
    let script = '';

    if (options.includeIntro) {
      const intros = {
        professional: `Welcome to this lesson summary on ${title}. Let's explore the key concepts and practical applications.`,
        friendly: `Hey there! Ready to dive into ${title}? Let's break down the important stuff you need to know.`,
        encouraging: `Great choice studying ${title}! This is going to add some powerful tools to your AWS toolkit. Let's get started!`,
        casual: `Alright, let's talk about ${title}. Here's what you need to know to level up your AWS game.`,
      };
      
      script += (intros[options.tone as keyof typeof intros] || intros.encouraging) + '\n\n';
    }

    // Extract and format the main content
    const cleanContent = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
      .replace(/\n{2,}/g, '\n') // Normalize line breaks
      .trim();

    // Extract key sentences
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = sentences.slice(0, 8); // Limit for audio length

    script += keySentences.join('. ') + '.\n\n';

    if (options.includeKeyTakeaways) {
      script += 'The key takeaways from this lesson are: ';
      
      // Extract AWS services and key concepts
      const awsServices = content.match(/Amazon\s+\w+|AWS\s+\w+/g) || [];
      const uniqueServices = [...new Set(awsServices)].slice(0, 3);
      
      if (uniqueServices.length > 0) {
        script += `understanding ${uniqueServices.join(', ')}, `;
      }
      
      script += 'and how these services fit into your AWS AI architecture. ';
      
      const closings = {
        professional: 'This knowledge will serve as a foundation for more advanced topics.',
        friendly: 'Pretty cool stuff, right? You\'re building some solid AWS knowledge!',
        encouraging: 'You\'re making excellent progress on your AWS journey. Keep it up!',
        casual: 'And that\'s a wrap! You\'ve got some new AWS skills in your toolkit.',
      };
      
      script += (closings[options.tone as keyof typeof closings] || closings.encouraging);
    }

    return script;
  }

  /**
   * Generate daily recap audio
   */
  async generateDailyRecapAudio(request: DailyRecapRequest): Promise<AudioContent> {
    try {
      // Convert simple progress to detailed progress format
      const detailedProgress: LearningProgress = {
        userId: request.userId,
        date: request.date,
        lessonsCompleted: request.learningProgress.lessonsCompleted.map((title, index) => ({
          id: `lesson-${index}`,
          title,
          module: 'AWS AI Services',
          timeSpent: 300, // 5 minutes default
          completedAt: request.date,
        })),
        quizResults: request.learningProgress.quizScores.map((quiz, index) => ({
          lessonId: `lesson-${index}`,
          lessonTitle: quiz.lesson,
          score: quiz.score,
          totalQuestions: 10,
          timeSpent: 180, // 3 minutes default
          completedAt: request.date,
        })),
        flashcardReviews: [],
        newConcepts: request.learningProgress.newConcepts.map(concept => ({
          term: concept,
          definition: `AWS AI concept: ${concept}`,
          category: 'aws-service',
          source: 'lesson-content',
        })),
        streakData: {
          currentStreak: 1,
          longestStreak: 1,
          studyDays: 1,
        },
        weakAreas: [],
        achievements: [],
      };

      const podcastOptions: PodcastRecapOptions = {
        ...request.options,
        tone: 'encouraging',
        duration: 'medium',
        includeMotivation: true,
        includeWeakAreas: false,
        includeAchievements: true,
        includeNextSteps: true,
      };

      const result = await this.podcastGenerator.generateDailyPodcast(
        detailedProgress,
        podcastOptions
      );

      return {
        id: `recap-${request.userId}-${request.date.toISOString().split('T')[0]}`,
        type: 'daily-recap',
        title: `Daily Learning Recap - ${request.date.toLocaleDateString()}`,
        text: result.transcript,
        audioUrl: result.audioUrl,
        duration: result.duration,
        voiceId: request.voiceId || 'default',
        generatedAt: new Date(),
        metadata: {
          userId: request.userId,
          date: request.date.toISOString(),
          lessonsCount: request.learningProgress.lessonsCompleted.length,
          quizzesCount: request.learningProgress.quizScores.length,
          highlights: result.highlights,
          podcastStyle: true,
        },
      };
    } catch (error) {
      console.error('Failed to generate daily recap audio:', error);
      throw new Error(`Daily recap generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Queue audio generation for background processing
   */
  async queueAudioGeneration(
    type: 'lesson-summary' | 'daily-recap',
    request: LessonAudioRequest | DailyRecapRequest,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const queueItem: AudioGenerationQueue = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      request,
      status: 'pending',
      createdAt: new Date(),
    };

    this.generationQueue.set(queueItem.id, queueItem);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process the audio generation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      // Sort queue by priority and creation time
      const sortedQueue = Array.from(this.generationQueue.values())
        .filter(item => item.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      for (const queueItem of sortedQueue) {
        try {
          // Update status to processing
          queueItem.status = 'processing';
          this.generationQueue.set(queueItem.id, queueItem);

          let audioContent: AudioContent;

          if (queueItem.type === 'lesson-summary') {
            audioContent = await this.generateLessonAudio(queueItem.request as LessonAudioRequest);
          } else {
            audioContent = await this.generateDailyRecapAudio(queueItem.request as DailyRecapRequest);
          }

          // Mark as completed
          queueItem.status = 'completed';
          queueItem.completedAt = new Date();
          this.generationQueue.set(queueItem.id, queueItem);

          // Store the result (in a real app, this would go to a database)
          console.log('Audio generation completed:', audioContent.id);

        } catch (error) {
          // Mark as failed
          queueItem.status = 'failed';
          queueItem.error = error instanceof Error ? error.message : 'Unknown error';
          queueItem.completedAt = new Date();
          this.generationQueue.set(queueItem.id, queueItem);

          console.error('Audio generation failed for queue item:', queueItem.id, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(queueId: string): AudioGenerationQueue | null {
    return this.generationQueue.get(queueId) || null;
  }

  /**
   * Get all available voices
   */
  async getAvailableVoices(): Promise<VoiceOption[]> {
    return this.ttsService.getAvailableVoices();
  }

  /**
   * Generate custom audio content
   */
  async generateCustomAudio(
    text: string,
    title: string,
    options: TTSOptions = {}
  ): Promise<AudioContent> {
    try {
      const result = await this.ttsService.generateAudio(text, options);

      return {
        id: `custom-${Date.now()}`,
        type: 'custom',
        title,
        text,
        audioUrl: result.audioUrl,
        duration: result.duration,
        voiceId: result.voiceId,
        generatedAt: result.generatedAt,
      };
    } catch (error) {
      console.error('Failed to generate custom audio:', error);
      throw new Error(`Custom audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup old queue items and audio URLs
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    const itemsToRemove: string[] = [];

    for (const [id, item] of this.generationQueue.entries()) {
      const age = now.getTime() - item.createdAt.getTime();
      if (age > maxAge && (item.status === 'completed' || item.status === 'failed')) {
        itemsToRemove.push(id);
      }
    }

    itemsToRemove.forEach(id => {
      this.generationQueue.delete(id);
    });

    console.log(`Cleaned up ${itemsToRemove.length} old queue items`);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: this.generationQueue.size,
    };

    for (const item of this.generationQueue.values()) {
      stats[item.status]++;
    }

    return stats;
  }
}

export default AudioGenerationPipeline;