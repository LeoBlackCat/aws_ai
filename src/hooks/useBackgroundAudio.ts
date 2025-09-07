'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackgroundAudioService, BackgroundAudioState, AudioTrack, BackgroundAudioOptions } from '@/services/BackgroundAudioService';

export function useBackgroundAudio(options?: BackgroundAudioOptions) {
  const [state, setState] = useState<BackgroundAudioState>({
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    volume: 1,
    playbackRate: 1,
    queue: [],
  });

  const audioService = getBackgroundAudioService(options);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = audioService.subscribe(setState);
    
    // Get initial state
    setState(audioService.getState());

    return unsubscribe;
  }, [audioService]);

  const loadTrack = useCallback(async (track: AudioTrack) => {
    await audioService.loadTrack(track);
  }, [audioService]);

  const play = useCallback(async () => {
    await audioService.play();
  }, [audioService]);

  const pause = useCallback(() => {
    audioService.pause();
  }, [audioService]);

  const togglePlayPause = useCallback(async () => {
    await audioService.togglePlayPause();
  }, [audioService]);

  const seek = useCallback((time: number) => {
    audioService.seek(time);
  }, [audioService]);

  const setVolume = useCallback((volume: number) => {
    audioService.setVolume(volume);
  }, [audioService]);

  const setPlaybackRate = useCallback((rate: number) => {
    audioService.setPlaybackRate(rate);
  }, [audioService]);

  const addToQueue = useCallback((track: AudioTrack) => {
    audioService.addToQueue(track);
  }, [audioService]);

  const removeFromQueue = useCallback((trackId: string) => {
    audioService.removeFromQueue(trackId);
  }, [audioService]);

  const clearQueue = useCallback(() => {
    audioService.clearQueue();
  }, [audioService]);

  const playNext = useCallback(() => {
    audioService.playNext();
  }, [audioService]);

  const playPrevious = useCallback(() => {
    audioService.playPrevious();
  }, [audioService]);

  const playTrackImmediately = useCallback(async (track: AudioTrack) => {
    await audioService.playTrackImmediately(track);
  }, [audioService]);

  const skip = useCallback((seconds: number) => {
    audioService.skip(seconds);
  }, [audioService]);

  const formatTime = useCallback((seconds: number) => {
    return audioService.formatTime(seconds);
  }, [audioService]);

  return {
    // State
    ...state,
    
    // Actions
    loadTrack,
    play,
    pause,
    togglePlayPause,
    seek,
    setVolume,
    setPlaybackRate,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    playTrackImmediately,
    skip,
    
    // Utilities
    formatTime,
    progressPercentage: state.currentTrack?.duration 
      ? (state.currentTime / state.currentTrack.duration) * 100 
      : 0,
  };
}

export default useBackgroundAudio;