'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  GamificationDashboard,
  XPNotification,
  StreakTracker,
  DailyChallenge,
  Leaderboard
} from '../../components/gamification';
import { 
  Zap, 
  Trophy, 
  Target, 
  Users, 
  Flame,
  Play,
  RotateCcw
} from 'lucide-react';

export default function GamificationDemo() {
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [activeDemo, setActiveDemo] = useState<'dashboard' | 'streak' | 'challenge' | 'leaderboard'>('dashboard');

  const triggerXPNotification = () => {
    setShowXPNotification(true);
  };

  const mockXPData = {
    xpEarned: 75,
    totalXP: 2525,
    levelBefore: 8,
    levelAfter: 9,
    leveledUp: true,
    achievements: [
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Score 90% or higher on 10 quizzes',
        icon: '🏆',
        xpReward: 300
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gamification System Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience the comprehensive gamification engine designed to motivate and engage learners 
            in the AWS AI Practitioner training platform.
          </p>
        </div>

        {/* Demo Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Interactive Demo Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={triggerXPNotification}
                className="flex items-center space-x-2"
                variant="outline"
              >
                <Zap className="h-4 w-4" />
                <span>Trigger XP Notification</span>
              </Button>
              
              <Button
                onClick={() => setActiveDemo('dashboard')}
                variant={activeDemo === 'dashboard' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
              >
                <Trophy className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
              
              <Button
                onClick={() => setActiveDemo('streak')}
                variant={activeDemo === 'streak' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
              >
                <Flame className="h-4 w-4" />
                <span>Streak Tracker</span>
              </Button>
              
              <Button
                onClick={() => setActiveDemo('leaderboard')}
                variant={activeDemo === 'leaderboard' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Leaderboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">XP System</h3>
              <p className="text-sm text-gray-600">
                Earn experience points for learning activities with dynamic multipliers
              </p>
              <Badge variant="secondary" className="mt-2">
                Dynamic Rewards
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-100">
            <CardContent className="p-6 text-center">
              <Flame className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Streak Tracking</h3>
              <p className="text-sm text-gray-600">
                Maintain daily learning streaks with visual progress tracking
              </p>
              <Badge variant="secondary" className="mt-2">
                Daily Motivation
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-100">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Daily Challenges</h3>
              <p className="text-sm text-gray-600">
                Personalized daily challenges based on user progress and level
              </p>
              <Badge variant="secondary" className="mt-2">
                Adaptive Goals
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Achievements</h3>
              <p className="text-sm text-gray-600">
                Unlock badges and achievements for learning milestones
              </p>
              <Badge variant="secondary" className="mt-2">
                Progress Recognition
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Area */}
        <div className="space-y-6">
          {activeDemo === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                <Trophy className="h-6 w-6" />
                <span>Gamification Dashboard</span>
              </h2>
              <GamificationDashboard />
            </div>
          )}

          {activeDemo === 'streak' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                <Flame className="h-6 w-6" />
                <span>Streak Tracker</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StreakTracker compact={false} showHistory={true} />
                <div className="space-y-4">
                  <StreakTracker compact={true} showHistory={false} />
                  <DailyChallenge compact={true} />
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'leaderboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
                <Users className="h-6 w-6" />
                <span>Leaderboard System</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Leaderboard userId="current-user" compact={false} showUserRank={true} limit={10} />
                </div>
                <div className="space-y-4">
                  <Leaderboard userId="current-user" compact={true} showUserRank={true} limit={5} />
                  <DailyChallenge compact={false} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Technical Features */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Implementation Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-blue-600">🎯 Smart XP Calculation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Difficulty-based multipliers</li>
                  <li>• Performance-based bonuses</li>
                  <li>• Time efficiency rewards</li>
                  <li>• Progressive level requirements</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-orange-600">🔥 Advanced Streak Logic</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Consecutive day detection</li>
                  <li>• Grace period handling</li>
                  <li>• Streak recovery options</li>
                  <li>• Visual progress history</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-purple-600">🏆 Dynamic Achievements</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Criteria-based unlocking</li>
                  <li>• Progress tracking</li>
                  <li>• Hidden achievements</li>
                  <li>• XP bonus rewards</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-green-600">📊 Real-time Leaderboards</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Multiple time periods</li>
                  <li>• Rank change tracking</li>
                  <li>• User position finding</li>
                  <li>• Social comparison</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-indigo-600">🎮 Adaptive Challenges</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Level-based difficulty</li>
                  <li>• Progress-aware goals</li>
                  <li>• Daily reset mechanism</li>
                  <li>• Personalized rewards</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-pink-600">⚡ Performance Optimized</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Efficient database queries</li>
                  <li>• Caching strategies</li>
                  <li>• Background processing</li>
                  <li>• Real-time updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Integration Examples */}
        <Card>
          <CardHeader>
            <CardTitle>API Integration Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Award XP for Learning Action</h4>
                <div className="bg-gray-100 rounded-lg p-4 text-sm font-mono">
                  <pre>{`// Award XP for lesson completion
const xpResult = await fetch('/api/gamification', {
  method: 'POST',
  body: JSON.stringify({
    action: 'award-xp',
    data: {
      type: 'lesson_completed',
      userId: 'user-123',
      metadata: {
        lessonId: 'aws-fundamentals-1',
        difficulty: 'INTERMEDIATE',
        timeSpent: 300
      }
    }
  })
});`}</pre>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Get User Achievements</h4>
                <div className="bg-gray-100 rounded-lg p-4 text-sm font-mono">
                  <pre>{`// Get user achievements and progress
const achievements = await fetch(
  '/api/gamification?action=achievements'
);

const data = await achievements.json();
// Returns: unlocked, available, progress, stats`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* XP Notification Overlay */}
      <XPNotification
        show={showXPNotification}
        onClose={() => setShowXPNotification(false)}
        {...mockXPData}
      />
    </div>
  );
}