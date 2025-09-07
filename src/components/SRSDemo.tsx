/**
 * SRS Demo Component - Demonstrates the spaced repetition system functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface SRSStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  suspendedCards: number;
  leechCards: number;
  retentionRate: number;
  averageInterval: number;
  dailyReviewLoad: number;
}

interface SRSSettings {
  algorithm: string;
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
  leechThreshold: number;
}

interface StudySession {
  id: string;
  userId: string;
  startTime: string;
  cardsReviewed: number;
  newCardsLearned: number;
  averageEase: number;
  averageConfidence: number;
  totalTimeSpent: number;
  xpEarned: number;
}

const SRSDemo: React.FC = () => {
  const [stats, setStats] = useState<SRSStats | null>(null);
  const [settings, setSettings] = useState<SRSSettings | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/srs?action=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load SRS stats');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/srs?action=settings');
      const result = await response.json();
      
      if (result.success) {
        setSettings(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load SRS settings');
      console.error('Error loading settings:', err);
    }
  };

  const startSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/srs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start-session' }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSession(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to start session');
      console.error('Error starting session:', err);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/srs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'end-session',
          sessionId: session.id 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSession(null);
        loadStats(); // Refresh stats
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to end session');
      console.error('Error ending session:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeAlgorithm = async (algorithm: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/srs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'change-algorithm',
          algorithm 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadSettings(); // Refresh settings
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to change algorithm');
      console.error('Error changing algorithm:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeechCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/srs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'handle-leech-cards' }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadStats(); // Refresh stats
        setError(null);
        alert(`Leech cards handled: ${result.data.suspended} suspended, ${result.data.reset} reset`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to handle leech cards');
      console.error('Error handling leech cards:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats && !settings) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading SRS system...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Spaced Repetition System Demo</h2>
        <p className="text-gray-600 mb-4">
          This demo shows the SRS system with multiple algorithms (SM-2, Leitner Box, FSRS), 
          flashcard generation, and confidence tracking.
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </Card>

      {/* SRS Statistics */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">SRS Statistics</h3>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCards}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.newCards}</div>
              <div className="text-sm text-gray-600">New Cards</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">{stats.learningCards}</div>
              <div className="text-sm text-gray-600">Learning Cards</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-2xl font-bold text-purple-600">{stats.reviewCards}</div>
              <div className="text-sm text-gray-600">Review Cards</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.leechCards}</div>
              <div className="text-sm text-gray-600">Leech Cards</div>
            </div>
            <div className="bg-indigo-50 p-3 rounded">
              <div className="text-2xl font-bold text-indigo-600">
                {(stats.retentionRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Retention Rate</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No statistics available</div>
        )}
        
        <Button 
          onClick={loadStats} 
          disabled={loading}
          className="mt-4"
        >
          Refresh Stats
        </Button>
      </Card>

      {/* SRS Settings */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">SRS Settings</h3>
        {settings ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Algorithm: <span className="font-bold">{settings.algorithm}</span>
              </label>
              <div className="flex gap-2">
                <Button 
                  onClick={() => changeAlgorithm('SM2')}
                  disabled={loading || settings.algorithm === 'SM2'}
                  variant={settings.algorithm === 'SM2' ? 'default' : 'outline'}
                  size="sm"
                >
                  SM-2
                </Button>
                <Button 
                  onClick={() => changeAlgorithm('LEITNER')}
                  disabled={loading || settings.algorithm === 'LEITNER'}
                  variant={settings.algorithm === 'LEITNER' ? 'default' : 'outline'}
                  size="sm"
                >
                  Leitner Box
                </Button>
                <Button 
                  onClick={() => changeAlgorithm('FSRS')}
                  disabled={loading || settings.algorithm === 'FSRS'}
                  variant={settings.algorithm === 'FSRS' ? 'default' : 'outline'}
                  size="sm"
                >
                  FSRS
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Max New Cards/Day:</span> {settings.maxNewCardsPerDay}
              </div>
              <div>
                <span className="font-medium">Max Reviews/Day:</span> {settings.maxReviewsPerDay}
              </div>
              <div>
                <span className="font-medium">Leech Threshold:</span> {settings.leechThreshold}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No settings available</div>
        )}
      </Card>

      {/* Study Session */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Study Session</h3>
        
        {session ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded">
              <h4 className="font-semibold text-green-800">Active Session</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                <div>
                  <span className="font-medium">Cards Reviewed:</span> {session.cardsReviewed}
                </div>
                <div>
                  <span className="font-medium">New Cards:</span> {session.newCardsLearned}
                </div>
                <div>
                  <span className="font-medium">Time Spent:</span> {session.totalTimeSpent}s
                </div>
                <div>
                  <span className="font-medium">XP Earned:</span> {session.xpEarned}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={endSession}
              disabled={loading}
              variant="destructive"
            >
              End Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">No active study session</p>
            <Button 
              onClick={startSession}
              disabled={loading}
            >
              Start Study Session
            </Button>
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Actions</h3>
        <div className="flex gap-4">
          <Button 
            onClick={handleLeechCards}
            disabled={loading}
            variant="outline"
          >
            Handle Leech Cards
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SRSDemo;