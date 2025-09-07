'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Download,
  Settings
} from 'lucide-react';

export interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  duration?: number;
  autoPlay?: boolean;
  showDownload?: boolean;
  onEnded?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  className?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const SKIP_SECONDS = 15;

export function AudioPlayer({
  audioUrl,
  title,
  duration: providedDuration,
  autoPlay = false,
  showDownload = true,
  onEnded,
  onProgress,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: providedDuration || 0,
    volume: 1,
    playbackRate: 1,
    isLoading: true,
    error: null,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }
  }, [audioUrl]);

  // Handle audio events
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState(prev => ({
        ...prev,
        duration: audioRef.current!.duration,
        isLoading: false,
      }));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      
      setState(prev => ({
        ...prev,
        currentTime,
        duration,
      }));

      onProgress?.(currentTime, duration);
    }
  }, [onProgress]);

  const handleEnded = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Failed to load audio',
    }));
  }, []);

  const handleCanPlay = useCallback(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [autoPlay]);

  // Playback controls
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (state.isPlaying) {
        audioRef.current.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
      } else {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (error) {
      console.error('Playback error:', error);
      setState(prev => ({ ...prev, error: 'Playback failed' }));
    }
  }, [state.isPlaying]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - SKIP_SECONDS);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration,
        audioRef.current.currentTime + SKIP_SECONDS
      );
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * state.duration;
      audioRef.current.currentTime = newTime;
    }
  }, [state.duration]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newVolume = state.volume > 0 ? 0 : 1;
      audioRef.current.volume = newVolume;
      setState(prev => ({ ...prev, volume: newVolume }));
    }
  }, [state.volume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (audioRef.current) {
      const newVolume = value[0] / 100;
      audioRef.current.volume = newVolume;
      setState(prev => ({ ...prev, volume: newVolume }));
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState(prev => ({ ...prev, playbackRate: rate }));
    }
    setShowSettings(false);
  }, []);

  const downloadAudio = useCallback(() => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [audioUrl, title]);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />

      {/* Title */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
        {state.error && (
          <p className="text-sm text-red-600 mt-1">{state.error}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress 
          value={progressPercentage} 
          className="h-2 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            handleSeek([percent]);
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={skipBackward}
          disabled={state.isLoading}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          onClick={togglePlayPause}
          disabled={state.isLoading}
          className="h-12 w-12 rounded-full"
        >
          {state.isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : state.isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={skipForward}
          disabled={state.isLoading}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
          >
            {state.volume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="100"
            value={state.volume * 100}
            onChange={(e) => handleVolumeChange([parseInt(e.target.value)])}
            className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Playback Rate & Settings */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
              <span className="ml-1 text-xs">{state.playbackRate}x</span>
            </Button>

            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-2 z-10">
                <div className="text-xs font-medium text-gray-700 mb-2">Playback Speed</div>
                <div className="grid grid-cols-3 gap-1">
                  {PLAYBACK_RATES.map((rate) => (
                    <Button
                      key={rate}
                      variant={state.playbackRate === rate ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handlePlaybackRateChange(rate)}
                      className="text-xs"
                    >
                      {rate}x
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadAudio}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;