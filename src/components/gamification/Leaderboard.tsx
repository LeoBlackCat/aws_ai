'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Users, 
  TrendingUp,
  Calendar,
  Flame,
  Star,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  rank: number;
  weeklyXP?: number;
  monthlyXP?: number;
  rankChange?: number; // +1, -1, 0 for up, down, same
}

interface LeaderboardData {
  type: 'all_time' | 'weekly' | 'monthly';
  entries: LeaderboardEntry[];
  userRank?: number;
  totalUsers: number;
  userEntry?: LeaderboardEntry;
}

interface LeaderboardProps {
  userId?: string;
  compact?: boolean;
  showUserRank?: boolean;
  limit?: number;
}

export default function Leaderboard({ 
  userId, 
  compact = false, 
  showUserRank = true,
  limit = 10 
}: LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all_time' | 'weekly' | 'monthly'>('all_time');

  useEffect(() => {
    loadLeaderboard(activeTab);
  }, [activeTab, userId]);

  const loadLeaderboard = async (type: 'all_time' | 'weekly' | 'monthly') => {
    try {
      setLoading(true);
      
      // Mock leaderboard data - in real app this would come from API
      const mockData: LeaderboardData = {
        type,
        entries: generateMockEntries(type),
        userRank: 15,
        totalUsers: 1247,
        userEntry: {
          userId: userId || 'current-user',
          name: 'You',
          avatar: undefined,
          totalXP: 2450,
          level: 8,
          currentStreak: 12,
          rank: 15,
          weeklyXP: 350,
          monthlyXP: 1200,
          rankChange: 2
        }
      };

      setLeaderboardData(mockData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockEntries = (type: string): LeaderboardEntry[] => {
    const names = [
      'Alex Chen', 'Sarah Johnson', 'Mike Rodriguez', 'Emily Davis', 'James Wilson',
      'Lisa Zhang', 'David Kim', 'Anna Martinez', 'Chris Thompson', 'Maya Patel'
    ];

    return names.map((name, index) => ({
      userId: `user-${index + 1}`,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      totalXP: 5000 - (index * 400) + Math.floor(Math.random() * 200),
      level: Math.max(1, 15 - index - Math.floor(Math.random() * 3)),
      currentStreak: Math.max(0, 30 - (index * 2) + Math.floor(Math.random() * 10)),
      rank: index + 1,
      weeklyXP: Math.floor(Math.random() * 500) + 100,
      monthlyXP: Math.floor(Math.random() * 2000) + 500,
      rankChange: Math.floor(Math.random() * 5) - 2 // -2 to +2
    }));
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-sm font-bold w-5 text-center">{rank}</span>;
    }
  };

  const getRankChangeIcon = (change?: number) => {
    if (!change || change === 0) return <Minus className="h-3 w-3 text-gray-400" />;
    if (change > 0) return <ChevronUp className="h-3 w-3 text-green-500" />;
    return <ChevronDown className="h-3 w-3 text-red-500" />;
  };

  const getXPDisplay = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'weekly':
        return entry.weeklyXP?.toLocaleString() || '0';
      case 'monthly':
        return entry.monthlyXP?.toLocaleString() || '0';
      default:
        return entry.totalXP.toLocaleString();
    }
  };

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className={compact ? 'p-0' : 'p-6'}>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboardData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Unable to load leaderboard</p>
          <Button onClick={() => loadLeaderboard(activeTab)} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Trophy className="h-4 w-4" />
            <span>Top Learners</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {leaderboardData.entries.slice(0, 3).map((entry) => (
              <div key={entry.userId} className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6">
                  {getRankIcon(entry.rank)}
                </div>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={entry.avatar} />
                  <AvatarFallback className="text-xs">
                    {entry.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{getXPDisplay(entry)} XP</p>
                </div>
              </div>
            ))}
          </div>
          
          {showUserRank && leaderboardData.userRank && leaderboardData.userRank > 3 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center space-x-3 bg-blue-50 rounded-lg p-2">
                <span className="text-xs font-bold w-6 text-center">
                  #{leaderboardData.userRank}
                </span>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-blue-200">You</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">You</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">
                    {leaderboardData.userEntry ? getXPDisplay(leaderboardData.userEntry) : '0'} XP
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Leaderboard</span>
        </CardTitle>
        
        {/* Time Period Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'all_time' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all_time')}
            className="flex-1 text-xs"
          >
            All Time
          </Button>
          <Button
            variant={activeTab === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('weekly')}
            className="flex-1 text-xs"
          >
            This Week
          </Button>
          <Button
            variant={activeTab === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('monthly')}
            className="flex-1 text-xs"
          >
            This Month
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {leaderboardData.entries.slice(0, limit).map((entry, index) => (
            <div 
              key={entry.userId}
              className={`
                flex items-center space-x-4 p-3 rounded-lg transition-colors
                ${index < 3 
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                  : 'bg-gray-50 hover:bg-gray-100'
                }
              `}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar and Name */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.avatar} />
                <AvatarFallback>
                  {entry.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-medium truncate">{entry.name}</p>
                  {entry.rankChange !== undefined && (
                    <div className="flex items-center space-x-1">
                      {getRankChangeIcon(entry.rankChange)}
                      {entry.rankChange !== 0 && (
                        <span className={`text-xs ${
                          entry.rankChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(entry.rankChange)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Level {entry.level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span>{entry.currentStreak} day streak</span>
                  </div>
                </div>
              </div>

              {/* XP Display */}
              <div className="text-right">
                <p className="font-bold text-lg">{getXPDisplay(entry)}</p>
                <p className="text-xs text-gray-600">
                  {activeTab === 'all_time' ? 'Total XP' : 
                   activeTab === 'weekly' ? 'This Week' : 'This Month'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* User's Position (if not in top results) */}
        {showUserRank && leaderboardData.userRank && leaderboardData.userRank > limit && leaderboardData.userEntry && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center w-8 h-8">
                <span className="text-sm font-bold">#{leaderboardData.userRank}</span>
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-200">You</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-medium">You</p>
                  {leaderboardData.userEntry.rankChange !== undefined && (
                    <div className="flex items-center space-x-1">
                      {getRankChangeIcon(leaderboardData.userEntry.rankChange)}
                      {leaderboardData.userEntry.rankChange !== 0 && (
                        <span className={`text-xs ${
                          leaderboardData.userEntry.rankChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(leaderboardData.userEntry.rankChange)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Level {leaderboardData.userEntry.level}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span>{leaderboardData.userEntry.currentStreak} day streak</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-lg">{getXPDisplay(leaderboardData.userEntry)}</p>
                <p className="text-xs text-gray-600">
                  {activeTab === 'all_time' ? 'Total XP' : 
                   activeTab === 'weekly' ? 'This Week' : 'This Month'}
                </p>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-600 mt-3">
              You're ranked #{leaderboardData.userRank} out of {leaderboardData.totalUsers.toLocaleString()} learners
            </p>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-6 pt-4 border-t bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {leaderboardData.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Learners</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {leaderboardData.entries[0]?.totalXP.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-gray-600">Top Score</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}