// Mock ElevenLabs for build - replace with actual implementation
interface ElevenLabsClient {
  generate: (options: any) => Promise<ReadableStream>;
  voices: {
    getAll: () => Promise<{ voices: any[] }>;
  };
}

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface AudioGenerationResult {
  audioBuffer: ArrayBuffer;
  audioUrl: string;
  duration: number;
  voiceId: string;
  text: string;
  generatedAt: Date;
}

export interface VoiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
  previewUrl?: string;
}

export class TTSService {
  private client: ElevenLabsClient;
  private defaultVoiceId: string;
  private defaultModelId: string;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    // Mock client for build - replace with actual ElevenLabs client
    this.client = {
      generate: async (options: any) => {
        if (!apiKey) {
          throw new Error('ElevenLabs API not configured - missing API key');
        }
        throw new Error('ElevenLabs API not configured');
      },
      voices: {
        getAll: async () => ({ voices: [] }),
      },
    };
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    this.defaultModelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  }

  /**
   * Generate audio from text using ElevenLabs TTS
   */
  async generateAudio(
    text: string,
    options: TTSOptions = {}
  ): Promise<AudioGenerationResult> {
    try {
      const {
        voiceId = this.defaultVoiceId,
        modelId = this.defaultModelId,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.0,
        useSpeakerBoost = true,
      } = options;

      const audioStream = await this.client.generate({
        voice: voiceId,
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      });

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const audioBuffer = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        audioBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Create blob URL for playback
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      // Estimate duration (rough calculation based on text length and average speaking rate)
      const wordsPerMinute = 150;
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = (wordCount / wordsPerMinute) * 60;

      return {
        audioBuffer: audioBuffer.buffer,
        audioUrl,
        duration: estimatedDuration,
        voiceId,
        text,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('TTS generation failed:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<VoiceOption[]> {
    try {
      const voices = await this.client.voices.getAll();
      
      return voices.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'general',
        description: voice.description || '',
        previewUrl: voice.preview_url,
      }));
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      throw new Error('Failed to fetch available voices');
    }
  }

  /**
   * Generate lesson summary audio
   */
  async generateLessonSummary(
    lessonContent: string,
    lessonTitle: string,
    options: TTSOptions = {}
  ): Promise<AudioGenerationResult> {
    // Extract key points and create a concise summary
    const summary = this.createLessonSummary(lessonContent, lessonTitle);
    return this.generateAudio(summary, options);
  }

  /**
   * Generate daily podcast recap
   */
  async generateDailyRecap(
    learningProgress: {
      lessonsCompleted: string[];
      quizScores: { lesson: string; score: number }[];
      newConcepts: string[];
      reviewItems: string[];
    },
    options: TTSOptions = {}
  ): Promise<AudioGenerationResult> {
    const recap = this.createDailyRecap(learningProgress);
    return this.generateAudio(recap, options);
  }

  /**
   * Create a concise lesson summary for TTS
   */
  private createLessonSummary(content: string, title: string): string {
    // Remove markdown formatting and extract key points
    const cleanContent = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
      .replace(/\n{2,}/g, '\n') // Normalize line breaks
      .trim();

    // Extract sentences and prioritize important ones
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Take first few sentences and key AWS service mentions
    const keySentences = sentences.slice(0, 5).filter(sentence => {
      const s = sentence.toLowerCase();
      return s.includes('aws') || s.includes('amazon') || s.includes('service') || 
             s.includes('feature') || s.includes('benefit') || s.includes('use case');
    });

    const summary = `
      Welcome to the lesson summary for ${title}.
      
      ${keySentences.slice(0, 3).join('. ')}.
      
      This covers the key concepts you need to understand for AWS AI services.
      Take your time to review and practice with the interactive elements.
    `.trim();

    return summary;
  }

  /**
   * Create daily recap content
   */
  private createDailyRecap(learningProgress: {
    lessonsCompleted: string[];
    quizScores: { lesson: string; score: number }[];
    newConcepts: string[];
    reviewItems: string[];
  }): string {
    const { lessonsCompleted, quizScores, newConcepts, reviewItems } = learningProgress;
    
    let recap = "Here's your daily learning recap. ";

    if (lessonsCompleted.length > 0) {
      recap += `You completed ${lessonsCompleted.length} lesson${lessonsCompleted.length > 1 ? 's' : ''} today: ${lessonsCompleted.slice(0, 3).join(', ')}. `;
    }

    if (quizScores.length > 0) {
      const avgScore = quizScores.reduce((sum, quiz) => sum + quiz.score, 0) / quizScores.length;
      recap += `Your average quiz score was ${Math.round(avgScore)}%. `;
      
      if (avgScore >= 80) {
        recap += "Excellent work! ";
      } else if (avgScore >= 60) {
        recap += "Good progress, keep it up! ";
      } else {
        recap += "Consider reviewing the material for better understanding. ";
      }
    }

    if (newConcepts.length > 0) {
      recap += `You learned about ${newConcepts.slice(0, 3).join(', ')}. `;
    }

    if (reviewItems.length > 0) {
      recap += `You have ${reviewItems.length} items due for review tomorrow. `;
    }

    recap += "Keep up the great work on your AWS AI certification journey!";

    return recap;
  }

  /**
   * Cleanup blob URLs to prevent memory leaks
   */
  static cleanupAudioUrl(audioUrl: string): void {
    if (audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
  }
}

export default TTSService;