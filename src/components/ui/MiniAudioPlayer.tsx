'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { Play, Pause, X, Maximize2 } from 'lucide-react';

export interface MiniAudioPlayerProps {
  audioUrl: string;
  title: string;
  isVisible: boolean;
  onClose: () => void;
  onExpand: () => void;
  className?: string;
}

export function MiniAudioPlayer({
  audioUrl,
  title,
  isVisible,
  onClose,
  onExpand,
  className = '',
}: MiniAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
    }
  }, [audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 bg-white border rounded-lg shadow-lg p-3 z-50 ${className}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      <div className="flex items-center space-x-3">
        {/* Play/Pause Button */}
        <Button
          onClick={togglePlayPause}
          size="sm"
          className="h-8 w-8 rounded-full flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {title}
          </div>
          <Progress value={progressPercentage} className="h-1 mt-1" />
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpand}
            className="h-6 w-6 p-0"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MiniAudioPlayer;