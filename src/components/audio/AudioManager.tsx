'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import AudioPlayer from '../ui/AudioPlayer';
import MiniAudioPlayer from '../ui/MiniAudioPlayer';
import useTTS from '@/hooks/useTTS';
import useBackgroundAudio from '@/hooks/useBackgroundAudio';
import { AudioTrack } from '@/services/BackgroundAudioService';
import { 
  Volume2, 
  Mic, 
  Download, 
  Settings, 
  Play,
  Pause,
  Loader2,
  AlertCircle,
  List,
  SkipForward,
  SkipBack,
  Maximize2,
  X
} from 'lucide-react';

export interface AudioManagerProps {
  lessonId?: string;
  lessonTitle?: string;
  lessonContent?: string;
  userId?: string;
  className?: string;
}

export function AudioManager({
  lessonId,
  lessonTitle,
  lessonContent,
  userId,
  className = '',
}: AudioManagerProps) {
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const {
    isGenerating,
    error,
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
    fetchVoices,
    generateLessonAudio,
    generateDailyRecap,
    generateCustomAudio,
    clearError,
  } = useTTS();

  const backgroundAudio = useBackgroundAudio({
    enableNotifications: true,
    enableMediaSession: true,
    autoPlayNext: true,
  });

  // Fetch voices on component mount
  useEffect(() => {
    fetchVoices().catch(console.error);
  }, [fetchVoices]);

  const handleGenerateLessonAudio = async () => {
    if (!lessonId || !lessonTitle || !lessonContent) {
      console.error('Missing lesson data for audio generation');
      return;
    }

    try {
      const audioContent = await generateLessonAudio(
        lessonId,
        lessonTitle,
        lessonContent
      );

      const track: AudioTrack = {
        id: audioContent.id,
        title: audioContent.title,
        url: audioContent.audioUrl || '',
        type: 'lesson-summary',
        duration: audioContent.duration,
        metadata: audioContent.metadata,
      };

      await backgroundAudio.playTrackImmediately(track);
      setShowMiniPlayer(true);
    } catch (error) {
      console.error('Failed to generate lesson audio:', error);
    }
  };

  const handleGenerateDailyRecap = async () => {
    if (!userId) {
      console.error('Missing user ID for daily recap');
      return;
    }

    try {
      // Mock learning progress data - in a real app, this would come from the database
      const learningProgress = {
        lessonsCompleted: ['lesson-1', 'lesson-2'],
        quizScores: [
          { lesson: 'lesson-1', score: 85 },
          { lesson: 'lesson-2', score: 92 },
        ],
        newConcepts: ['Amazon Bedrock', 'SageMaker', 'Comprehend'],
        reviewItems: ['EC2 instances', 'S3 buckets'],
      };

      const audioContent = await generateDailyRecap(userId, learningProgress);

      const track: AudioTrack = {
        id: audioContent.id,
        title: audioContent.title,
        url: audioContent.audioUrl || '',
        type: 'daily-recap',
        duration: audioContent.duration,
        metadata: audioContent.metadata,
      };

      await backgroundAudio.playTrackImmediately(track);
      setShowMiniPlayer(true);
    } catch (error) {
      console.error('Failed to generate daily recap:', error);
    }
  };

  const handleQueueLessonAudio = async () => {
    if (!lessonId || !lessonTitle || !lessonContent) return;

    try {
      const audioContent = await generateLessonAudio(
        lessonId,
        lessonTitle,
        lessonContent
      );

      const track: AudioTrack = {
        id: audioContent.id,
        title: audioContent.title,
        url: audioContent.audioUrl || '',
        type: 'lesson-summary',
        duration: audioContent.duration,
        metadata: audioContent.metadata,
      };

      backgroundAudio.addToQueue(track);
    } catch (error) {
      console.error('Failed to queue lesson audio:', error);
    }
  };

  const handleMinimizePlayer = () => {
    setShowFullPlayer(false);
    setShowMiniPlayer(true);
  };

  const handleExpandPlayer = () => {
    setShowMiniPlayer(false);
    setShowFullPlayer(true);
  };

  const handleClosePlayer = () => {
    backgroundAudio.pause();
    setShowMiniPlayer(false);
    setShowFullPlayer(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-auto text-red-700 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Audio Generation Controls */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Audio Content</h3>
        
        {/* Voice Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice Selection
          </label>
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          >
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} ({voice.category})
              </option>
            ))}
          </select>
        </div>

        {/* Generation Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lessonId && lessonTitle && lessonContent && (
              <>
                <Button
                  onClick={handleGenerateLessonAudio}
                  disabled={isGenerating}
                  className="flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  <span>Play Lesson Summary</span>
                </Button>
                
                <Button
                  onClick={handleQueueLessonAudio}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <List className="h-4 w-4" />
                  )}
                  <span>Add to Queue</span>
                </Button>
              </>
            )}

            {userId && (
              <Button
                onClick={handleGenerateDailyRecap}
                disabled={isGenerating}
                variant="outline"
                className="flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span>Generate Daily Recap</span>
              </Button>
            )}
          </div>

          {/* Playback Controls */}
          {backgroundAudio.currentTrack && (
            <div className="flex items-center justify-center space-x-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => backgroundAudio.skip(-15)}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={backgroundAudio.togglePlayPause}
                size="sm"
              >
                {backgroundAudio.isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => backgroundAudio.skip(15)}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQueue(!showQueue)}
              >
                <List className="h-4 w-4" />
                {backgroundAudio.queue.length > 0 && (
                  <span className="ml-1 text-xs">({backgroundAudio.queue.length})</span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Current Audio Info */}
        {backgroundAudio.currentTrack && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {backgroundAudio.currentTrack.title}
                </p>
                <p className="text-sm text-gray-600">
                  {backgroundAudio.formatTime(backgroundAudio.currentTime)} / {' '}
                  {backgroundAudio.currentTrack.duration 
                    ? backgroundAudio.formatTime(backgroundAudio.currentTrack.duration)
                    : '--:--'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowMiniPlayer(true)}
                  size="sm"
                  variant="outline"
                >
                  Show Player
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${backgroundAudio.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Queue Display */}
        {showQueue && backgroundAudio.queue.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Queue ({backgroundAudio.queue.length} items)
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {backgroundAudio.queue.map((track, index) => (
                <div key={track.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{index + 1}. {track.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => backgroundAudio.removeFromQueue(track.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={backgroundAudio.clearQueue}
              className="mt-2 text-xs"
            >
              Clear Queue
            </Button>
          </div>
        )}
      </Card>

      {/* Full Audio Player Modal */}
      {showFullPlayer && backgroundAudio.currentTrack && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <AudioPlayer
              audioUrl={backgroundAudio.currentTrack.url}
              title={backgroundAudio.currentTrack.title}
              duration={backgroundAudio.currentTrack.duration}
              onEnded={() => setShowFullPlayer(false)}
              className="border-0 shadow-none"
            />
            <div className="p-4 border-t flex justify-between">
              <Button
                variant="outline"
                onClick={handleMinimizePlayer}
              >
                Minimize
              </Button>
              <Button
                variant="ghost"
                onClick={handleClosePlayer}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Mini Audio Player */}
      {showMiniPlayer && backgroundAudio.currentTrack && (
        <div className="fixed bottom-4 left-4 right-4 bg-white border rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center space-x-3">
            {/* Play/Pause Button */}
            <Button
              onClick={backgroundAudio.togglePlayPause}
              size="sm"
              className="h-8 w-8 rounded-full flex-shrink-0"
            >
              {backgroundAudio.isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {backgroundAudio.currentTrack.title}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${backgroundAudio.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => backgroundAudio.skip(-15)}
                className="h-6 w-6 p-0"
              >
                <SkipBack className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => backgroundAudio.skip(15)}
                className="h-6 w-6 p-0"
              >
                <SkipForward className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandPlayer}
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClosePlayer}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioManager;