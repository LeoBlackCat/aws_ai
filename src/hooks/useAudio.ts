'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseAudioOptions {
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  playbackRate?: number;
  onEnded?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onError?: (error: string) => void;
}

export function useAudio(audioUrl?: string, options: UseAudioOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: options.volume || 1,
    playbackRate: options.playbackRate || 1,
    isLoading: false,
    error: null,
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      const audio = audioRef.current;
      
      // Set initial properties
      audio.volume = state.volume;
      audio.playbackRate = state.playbackRate;
      audio.loop = options.loop || false;

      // Event listeners
      const handleLoadStart = () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      };

      const handleLoadedMetadata = () => {
        setState(prev => ({ 
          ...prev, 
          duration: audio.duration,
          isLoading: false 
        }));
      };

      const handleTimeUpdate = () => {
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        
        setState(prev => ({ ...prev, currentTime, duration }));
        options.onProgress?.(currentTime, duration);
      };

      const handleEnded = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        options.onEnded?.();
      };

      const handleError = () => {
        const errorMessage = 'Failed to load audio';
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: errorMessage,
          isPlaying: false 
        }));
        options.onError?.(errorMessage);
      };

      const handleCanPlay = () => {
        if (options.autoPlay) {
          audio.play().catch(console.error);
        }
      };

      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);

      return () => {
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [options.autoPlay, options.loop, options.onEnded, options.onProgress, options.onError, state.volume, state.playbackRate]);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }
  }, [audioUrl]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true, error: null }));
    } catch (error) {
      const errorMessage = 'Playback failed';
      setState(prev => ({ ...prev, error: errorMessage, isPlaying: false }));
      options.onError?.(errorMessage);
    }
  }, [options.onError]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration]);

  const seekToPercentage = useCallback((percentage: number) => {
    const time = (percentage / 100) * state.duration;
    seek(time);
  }, [seek, state.duration]);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    audioRef.current.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    
    const newTime = audioRef.current.currentTime + seconds;
    seek(newTime);
  }, [seek]);

  const mute = useCallback(() => {
    setVolume(0);
  }, [setVolume]);

  const unmute = useCallback(() => {
    setVolume(1);
  }, [setVolume]);

  const reset = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    pause();
  }, [pause]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Controls
    play,
    pause,
    togglePlayPause,
    seek,
    seekToPercentage,
    setVolume,
    setPlaybackRate,
    skip,
    mute,
    unmute,
    reset,
    
    // Utilities
    formatTime: (seconds: number) => {
      if (!isFinite(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    progressPercentage: state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0,
  };
}

export default useAudio;