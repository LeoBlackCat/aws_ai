'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Trophy, 
  Target, 
  Flame, 
  Star, 
  Users, 
  Calendar,
  Award,
  TrendingUp,
  Zap
} from 'lucide-react';

interface GamificationData {
  user: {
    totalXP: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  };
  achievements: {
    unlocked: any[];
    available: any[];
    progress: Record<string, number>;
    stats: {
      totalUnlocked: number;
      totalAvailable: number;
      completionRate: number;
      totalXPFromAchievements: number;
    };
  };
  leaderboard: {
    entries: any[];
    userRank?: number;
    totalUsers: number;
  };
  dailyChallenge: {
    title: string;
    description: string;
    progress: number;
    target: number;
    xpReward: number;
    completed: boolean;
  };
}

export default function GamificationDashboard() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'leaderboard'>('overview');

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      setLoading(true);
      
      const [achievementsRes, leaderboardRes, challengeRes] = await Promise.all([
        fetch('/api/gamification?action=achievements'),
        fetch('/api/gamification?action=leaderboard&type=all_time&limit=10'),
        fetch('/api/gamification?action=daily-challenge')
      ]);

      const [achievements, leaderboard, dailyChallenge] = await Promise.all([
        achievementsRes.json(),
        leaderboardRes.json(),
        challengeRes.json()
      ]);

      // Mock user data - in real app this would come from user context
      const userData = {
        totalXP: 2450,
        level: 8,
        currentStreak: 12,
        longestStreak: 25
      };

      setData({
        user: userData,
        achievements: achievements.data,
        leaderboard: leaderboard.data,
        dailyChallenge: dailyChallenge.data
      });
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getXPForNextLevel = (level: number) => {
    return 100 * level; // XP needed for next level
  };

  const getCurrentLevelXP = (totalXP: number, level: number) => {
    const previousLevelXP = level > 1 ? 100 * (level - 1) * level / 2 : 0;
    return totalXP - previousLevelXP;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load gamification data</p>
        <Button onClick={loadGamificationData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const xpForNext = getXPForNextLevel(data.user.level);
  const currentLevelXP = getCurrentLevelXP(data.user.totalXP, data.user.level);
  const progressPercent = (currentLevelXP / xpForNext) * 100;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold">{data.user.level}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total XP</p>
                <p className="text-2xl font-bold">{data.user.totalXP.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold">{data.user.currentStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Achievements</p>
                <p className="text-2xl font-bold">
                  {data.achievements.stats.totalUnlocked}/{data.achievements.stats.totalAvailable}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Level {data.user.level} Progress</h3>
            <span className="text-sm text-gray-600">
              {currentLevelXP} / {xpForNext} XP
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-sm text-gray-600 mt-2">
            {xpForNext - currentLevelXP} XP until Level {data.user.level + 1}
          </p>
        </CardContent>
      </Card>

      {/* Daily Challenge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Daily Challenge</span>
            <Badge variant={data.dailyChallenge.completed ? "default" : "secondary"}>
              {data.dailyChallenge.completed ? "Completed" : "In Progress"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h4 className="font-semibold mb-2">{data.dailyChallenge.title}</h4>
          <p className="text-gray-600 mb-4">{data.dailyChallenge.description}</p>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Progress</span>
            <span className="text-sm font-medium">
              {data.dailyChallenge.progress} / {data.dailyChallenge.target}
            </span>
          </div>
          
          <Progress 
            value={(data.dailyChallenge.progress / data.dailyChallenge.target) * 100} 
            className="mb-4" 
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Reward: {data.dailyChallenge.xpReward} XP
            </span>
            {data.dailyChallenge.completed && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Award className="h-3 w-3 mr-1" />
                Completed!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className="flex-1"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={activeTab === 'achievements' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('achievements')}
          className="flex-1"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Achievements
        </Button>
        <Button
          variant={activeTab === 'leaderboard' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('leaderboard')}
          className="flex-1"
        >
          <Users className="h-4 w-4 mr-2" />
          Leaderboard
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.achievements.unlocked.slice(0, 3).map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center space-x-3">
                    <div className="text-2xl">{achievement.achievement.icon}</div>
                    <div className="flex-1">
                      <p className="font-medium">{achievement.achievement.title}</p>
                      <p className="text-sm text-gray-600">{achievement.achievement.description}</p>
                    </div>
                    <Badge variant="secondary">
                      +{achievement.achievement.xpReward} XP
                    </Badge>
                  </div>
                ))}
                {data.achievements.unlocked.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No achievements yet. Keep learning to unlock your first one!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Streak Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Streak Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current Streak</span>
                  <div className="flex items-center space-x-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-bold">{data.user.currentStreak} days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Longest Streak</span>
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold">{data.user.longestStreak} days</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Keep your streak alive by completing at least one learning activity each day!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {/* Achievement Stats */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {data.achievements.stats.totalUnlocked}
                  </p>
                  <p className="text-sm text-gray-600">Unlocked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(data.achievements.stats.completionRate)}%
                  </p>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.achievements.stats.totalXPFromAchievements}
                  </p>
                  <p className="text-sm text-gray-600">XP from Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unlocked Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Unlocked Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.achievements.unlocked.map((achievement: any) => (
                  <div key={achievement.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{achievement.achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.achievement.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {achievement.achievement.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Unlocked
                          </Badge>
                          <span className="text-sm font-medium">
                            +{achievement.achievement.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Available Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.achievements.available
                  .filter((achievement: any) => 
                    !data.achievements.unlocked.some((unlocked: any) => 
                      unlocked.achievement.title === achievement.title
                    )
                  )
                  .map((achievement: any) => {
                    const progress = data.achievements.progress[achievement.id] || 0;
                    return (
                      <div key={achievement.id} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl opacity-50">{achievement.icon}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {achievement.description}
                            </p>
                            <Progress value={progress * 100} className="mb-2" />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                {Math.round(progress * 100)}% complete
                              </span>
                              <span className="text-sm font-medium">
                                +{achievement.xpReward} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Leaderboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.leaderboard.entries.map((entry: any, index: number) => (
                <div 
                  key={entry.userId} 
                  className={`flex items-center space-x-4 p-3 rounded-lg ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200">
                    {index === 0 && <span className="text-yellow-500">🥇</span>}
                    {index === 1 && <span className="text-gray-400">🥈</span>}
                    {index === 2 && <span className="text-orange-600">🥉</span>}
                    {index > 2 && <span className="text-sm font-bold">{entry.rank}</span>}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-gray-600">Level {entry.level}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold">{entry.totalXP.toLocaleString()} XP</p>
                    <div className="flex items-center space-x-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-sm text-gray-600">{entry.currentStreak}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {data.leaderboard.userRank && data.leaderboard.userRank > 10 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-center text-sm text-gray-600">
                  Your rank: #{data.leaderboard.userRank} out of {data.leaderboard.totalUsers} users
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}