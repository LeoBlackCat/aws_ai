'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Flame, 
  Calendar, 
  Target, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date | null;
  todayCompleted: boolean;
  weeklyGoal: number;
  weeklyProgress: number;
  streakHistory: Array<{
    date: string;
    completed: boolean;
    activities: number;
  }>;
}

interface StreakTrackerProps {
  userId?: string;
  compact?: boolean;
  showHistory?: boolean;
}

export default function StreakTracker({ 
  userId, 
  compact = false, 
  showHistory = true 
}: StreakTrackerProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreakData();
  }, [userId]);

  const loadStreakData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real app this would come from API
      const mockData: StreakData = {
        currentStreak: 12,
        longestStreak: 25,
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        todayCompleted: true,
        weeklyGoal: 5,
        weeklyProgress: 4,
        streakHistory: generateStreakHistory()
      };

      setStreakData(mockData);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStreakHistory = () => {
    const history = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      history.push({
        date: date.toISOString().split('T')[0],
        completed: i < 12, // Last 12 days completed
        activities: i < 12 ? Math.floor(Math.random() * 5) + 1 : 0
      });
    }
    
    return history;
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-600';
    if (streak >= 14) return 'text-blue-600';
    if (streak >= 7) return 'text-green-600';
    if (streak >= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🌟';
    if (streak >= 3) return '✨';
    return '💫';
  };

  const isStreakAtRisk = () => {
    if (!streakData?.lastActivity) return true;
    
    const now = new Date();
    const lastActivity = new Date(streakData.lastActivity);
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceActivity > 20 && !streakData.todayCompleted;
  };

  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursUntilReset}h ${minutesUntilReset}m`;
  };

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'p-6'}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streakData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Unable to load streak data</p>
          <Button onClick={loadStreakData} variant="outline" className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-orange-50 to-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className={`h-5 w-5 ${getStreakColor(streakData.currentStreak)}`} />
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-xl font-bold">{streakData.currentStreak} days</p>
              </div>
            </div>
            
            <div className="text-right">
              {streakData.todayCompleted ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Today ✓
                </Badge>
              ) : isStreakAtRisk() ? (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  At Risk!
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeUntilReset()}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Streak Card */}
      <Card className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Flame className={`h-6 w-6 ${getStreakColor(streakData.currentStreak)}`} />
            <span>Learning Streak</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Streak */}
            <div className="text-center">
              <div className="text-4xl mb-2">{getStreakEmoji(streakData.currentStreak)}</div>
              <p className="text-3xl font-bold mb-1">{streakData.currentStreak}</p>
              <p className="text-sm text-gray-600">Current Streak</p>
              
              {streakData.todayCompleted ? (
                <Badge variant="default" className="mt-2 bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Today Complete
                </Badge>
              ) : (
                <Badge variant={isStreakAtRisk() ? "destructive" : "secondary"} className="mt-2">
                  {isStreakAtRisk() ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Streak at Risk!
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeUntilReset()} left
                    </>
                  )}
                </Badge>
              )}
            </div>

            {/* Longest Streak */}
            <div className="text-center">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-3xl font-bold mb-1">{streakData.longestStreak}</p>
              <p className="text-sm text-gray-600">Longest Streak</p>
              
              {streakData.currentStreak === streakData.longestStreak && (
                <Badge variant="default" className="mt-2 bg-yellow-100 text-yellow-800">
                  Personal Best!
                </Badge>
              )}
            </div>

            {/* Weekly Progress */}
            <div className="text-center">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-3xl font-bold mb-1">
                {streakData.weeklyProgress}/{streakData.weeklyGoal}
              </p>
              <p className="text-sm text-gray-600">This Week</p>
              
              <div className="mt-2">
                <Progress 
                  value={(streakData.weeklyProgress / streakData.weeklyGoal) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Streak Tips */}
          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold mb-2 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Streak Tips
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Complete at least one lesson daily</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Review flashcards for 5 minutes</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Take a practice quiz</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Chat with the AI tutor</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>14-Day History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-gray-500 font-medium">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {streakData.streakHistory.map((day, index) => {
                const date = new Date(day.date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={day.date}
                    className={`
                      aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium
                      ${day.completed 
                        ? 'bg-green-100 border-green-300 text-green-800' 
                        : isToday 
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-800 border-dashed'
                          : 'bg-gray-50 border-gray-200 text-gray-400'
                      }
                      ${isToday ? 'ring-2 ring-blue-300' : ''}
                    `}
                    title={`${date.toLocaleDateString()}: ${day.completed ? `${day.activities} activities` : 'No activity'}`}
                  >
                    {day.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isToday ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      date.getDate()
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-gray-600">Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-50 border border-yellow-300 border-dashed rounded"></div>
                <span className="text-gray-600">Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                <span className="text-gray-600">Missed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}