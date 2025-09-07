'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Target, 
  Clock, 
  Zap, 
  CheckCircle, 
  RefreshCw,
  Trophy,
  Star,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'quiz_accuracy' | 'lesson_completion' | 'card_reviews' | 'time_spent' | 'perfect_streak';
  target: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  expiresAt: Date;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DailyChallengeProps {
  userId?: string;
  compact?: boolean;
  onChallengeComplete?: (challenge: Challenge) => void;
}

export default function DailyChallenge({ 
  userId, 
  compact = false, 
  onChallengeComplete 
}: DailyChallengeProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    loadDailyChallenge();
    
    // Update time left every minute
    const timer = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [userId]);

  useEffect(() => {
    if (challenge) {
      updateTimeLeft();
    }
  }, [challenge]);

  const loadDailyChallenge = async () => {
    try {
      setLoading(true);
      
      // Mock challenge data - in real app this would come from API
      const mockChallenge: Challenge = {
        id: 'daily_' + new Date().toISOString().split('T')[0],
        title: 'Quiz Master',
        description: 'Score 80% or higher on 3 quizzes',
        type: 'quiz_accuracy',
        target: 3,
        progress: 1,
        xpReward: 150,
        completed: false,
        expiresAt: getEndOfDay(),
        difficulty: 'medium'
      };

      setChallenge(mockChallenge);
    } catch (error) {
      console.error('Error loading daily challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEndOfDay = () => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  };

  const updateTimeLeft = () => {
    if (!challenge) return;
    
    const now = new Date();
    const timeRemaining = challenge.expiresAt.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      setTimeLeft('Expired');
      return;
    }
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeLeft(`${hours}h ${minutes}m`);
  };

  const getChallengeIcon = (type: Challenge['type']) => {
    switch (type) {
      case 'quiz_accuracy':
        return <Target className="h-5 w-5" />;
      case 'lesson_completion':
        return <Star className="h-5 w-5" />;
      case 'card_reviews':
        return <RefreshCw className="h-5 w-5" />;
      case 'time_spent':
        return <Clock className="h-5 w-5" />;
      case 'perfect_streak':
        return <Trophy className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const handleRefreshChallenge = async () => {
    // In a real app, this might generate a new challenge or reset progress
    await loadDailyChallenge();
  };

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'p-6'}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No challenge available</p>
          <Button onClick={loadDailyChallenge} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Challenge
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getChallengeIcon(challenge.type)}
              <span className="font-semibold text-sm">Daily Challenge</span>
            </div>
            <Badge variant={challenge.completed ? "default" : "secondary"}>
              {challenge.completed ? "Complete" : timeLeft}
            </Badge>
          </div>
          
          <h4 className="font-medium mb-2">{challenge.title}</h4>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {challenge.progress} / {challenge.target}
            </span>
            <span className="text-sm font-medium text-blue-600">
              +{challenge.xpReward} XP
            </span>
          </div>
          
          <Progress 
            value={(challenge.progress / challenge.target) * 100} 
            className="h-2"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getChallengeIcon(challenge.type)}
            <span>Daily Challenge</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getDifficultyColor(challenge.difficulty)}>
              {challenge.difficulty}
            </Badge>
            {challenge.completed ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {timeLeft}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Challenge Details */}
          <div>
            <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
            <p className="text-gray-600">{challenge.description}</p>
          </div>

          {/* Progress Section */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {challenge.progress} / {challenge.target}
              </span>
            </div>
            
            <Progress 
              value={(challenge.progress / challenge.target) * 100} 
              className="h-3 mb-3"
            />
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {challenge.target - challenge.progress} remaining
              </span>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-blue-600">
                  +{challenge.xpReward} XP
                </span>
              </div>
            </div>
          </div>

          {/* Challenge Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((challenge.progress / challenge.target) * 100)}%
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {challenge.xpReward}
              </div>
              <div className="text-xs text-gray-600">XP Reward</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-2xl font-bold text-purple-600">
                {timeLeft === 'Expired' ? '0h' : timeLeft.split(' ')[0]}
              </div>
              <div className="text-xs text-gray-600">Time Left</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {challenge.completed ? (
              <Button className="flex-1" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Challenge Complete!
              </Button>
            ) : (
              <>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // Navigate to relevant activity based on challenge type
                    console.log('Navigate to challenge activity:', challenge.type);
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Continue Challenge
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshChallenge}
                  className="px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Challenge Tips */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Success</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {challenge.type === 'quiz_accuracy' && (
                <>
                  <p>• Review lesson content before taking quizzes</p>
                  <p>• Take your time to read questions carefully</p>
                  <p>• Use the AI tutor if you're unsure about concepts</p>
                </>
              )}
              {challenge.type === 'lesson_completion' && (
                <>
                  <p>• Focus on understanding, not just reading</p>
                  <p>• Take notes on key AWS services and concepts</p>
                  <p>• Use the cross-references to explore related topics</p>
                </>
              )}
              {challenge.type === 'card_reviews' && (
                <>
                  <p>• Review cards in short, frequent sessions</p>
                  <p>• Be honest with your difficulty ratings</p>
                  <p>• Focus on understanding, not memorization</p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}