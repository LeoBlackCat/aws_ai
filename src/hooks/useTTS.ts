'use client';

import { useState, useCallback } from 'react';

export interface TTSState {
  isGenerating: boolean;
  error: string | null;
  voices: VoiceOption[];
  selectedVoiceId: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
  previewUrl?: string;
}

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

export interface GenerateAudioOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isGenerating: false,
    error: null,
    voices: [],
    selectedVoiceId: '21m00Tcm4TlvDq8ikWAM', // Default voice
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setGenerating = useCallback((isGenerating: boolean) => {
    setState(prev => ({ ...prev, isGenerating }));
  }, []);

  const setVoices = useCallback((voices: VoiceOption[]) => {
    setState(prev => ({ ...prev, voices }));
  }, []);

  const setSelectedVoiceId = useCallback((voiceId: string) => {
    setState(prev => ({ ...prev, selectedVoiceId: voiceId }));
  }, []);

  /**
   * Fetch available voices
   */
  const fetchVoices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/audio?action=voices');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch voices');
      }

      setVoices(result.data);
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch voices';
      setError(errorMessage);
      throw error;
    }
  }, [setError, setVoices]);

  /**
   * Generate lesson summary audio
   */
  const generateLessonAudio = useCallback(async (
    lessonId: string,
    lessonTitle: string,
    lessonContent: string,
    options: GenerateAudioOptions = {}
  ): Promise<AudioContent> => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'lesson-summary',
          lessonId,
          lessonTitle,
          lessonContent,
          voiceId: options.voiceId || state.selectedVoiceId,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate lesson audio');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate lesson audio';
      setError(errorMessage);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, [state.selectedVoiceId, setGenerating, setError]);

  /**
   * Generate daily recap audio
   */
  const generateDailyRecap = useCallback(async (
    userId: string,
    learningProgress: {
      lessonsCompleted: string[];
      quizScores: { lesson: string; score: number }[];
      newConcepts: string[];
      reviewItems: string[];
    },
    options: GenerateAudioOptions = {}
  ): Promise<AudioContent> => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'daily-recap',
          userId,
          date: new Date().toISOString(),
          learningProgress,
          voiceId: options.voiceId || state.selectedVoiceId,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate daily recap');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate daily recap';
      setError(errorMessage);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, [state.selectedVoiceId, setGenerating, setError]);

  /**
   * Generate custom audio
   */
  const generateCustomAudio = useCallback(async (
    text: string,
    title: string,
    options: GenerateAudioOptions = {}
  ): Promise<AudioContent> => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'custom',
          text,
          title,
          options: {
            voiceId: options.voiceId || state.selectedVoiceId,
            ...options,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate custom audio');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate custom audio';
      setError(errorMessage);
      throw error;
    } finally {
      setGenerating(false);
    }
  }, [state.selectedVoiceId, setGenerating, setError]);

  /**
   * Queue audio generation for background processing
   */
  const queueAudioGeneration = useCallback(async (
    type: 'lesson-summary' | 'daily-recap',
    requestData: any,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> => {
    try {
      setError(null);

      const response = await fetch('/api/audio/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          priority,
          ...requestData,
          voiceId: requestData.voiceId || state.selectedVoiceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to queue audio generation');
      }

      return result.data.queueId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to queue audio generation';
      setError(errorMessage);
      throw error;
    }
  }, [state.selectedVoiceId, setError]);

  /**
   * Check queue status
   */
  const checkQueueStatus = useCallback(async (queueId: string) => {
    try {
      const response = await fetch(`/api/audio/queue?id=${queueId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check queue status');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check queue status';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(async () => {
    try {
      const response = await fetch('/api/audio/queue');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get queue stats');
      }

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get queue stats';
      setError(errorMessage);
      throw error;
    }
  }, [setError]);

  return {
    // State
    ...state,
    
    // Actions
    setSelectedVoiceId,
    fetchVoices,
    generateLessonAudio,
    generateDailyRecap,
    generateCustomAudio,
    queueAudioGeneration,
    checkQueueStatus,
    getQueueStats,
    
    // Utilities
    clearError: () => setError(null),
  };
}

export default useTTS;