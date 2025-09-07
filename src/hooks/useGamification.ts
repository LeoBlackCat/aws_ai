'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LearningAction, XPResult, StreakResult, DailyChallenge } from '../services/GamificationService';

interface GamificationState {
  user: {
    totalXP: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  } | null;
  dailyChallenge: DailyChallenge | null;
  recentXP: XPResult | null;
  loading: boolean;
  error: string | null;
}

interface UseGamificationReturn extends GamificationState {
  awardXP: (action: LearningAction) => Promise<XPResult | null>;
  updateStreak: (maintainStreak?: boolean) => Promise<StreakResult | null>;
  loadDailyChallenge: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  clearNotifications: () => void;
}

export function useGamification(): UseGamificationReturn {
  const [state, setState] = useState<GamificationState>({
    user: null,
    dailyChallenge: null,
    recentXP: null,
    loading: true,
    error: null
  });

  // Load initial user data
  useEffect(() => {
    refreshUserData();
    loadDailyChallenge();
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Mock user data - in real app this would come from user context or API
      const userData = {
        totalXP: 2450,
        level: 8,
        currentStreak: 12,
        longestStreak: 25
      };

      setState(prev => ({
        ...prev,
        user: userData,
        loading: false
      }));
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load user data',
        loading: false
      }));
    }
  }, []);

  const loadDailyChallenge = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification?action=daily-challenge');
      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          dailyChallenge: result.data
        }));
      }
    } catch (error) {
      console.error('Error loading daily challenge:', error);
    }
  }, []);

  const awardXP = useCallback(async (action: LearningAction): Promise<XPResult | null> => {
    try {
      const response = await fetch('/api/gamification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'award-xp',
          data: action
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const xpResult: XPResult = result.data;
        
        // Update user state
        setState(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            totalXP: xpResult.totalXP,
            level: xpResult.levelAfter
          } : null,
          recentXP: xpResult
        }));

        return xpResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }, []);

  const updateStreak = useCallback(async (maintainStreak: boolean = true): Promise<StreakResult | null> => {
    try {
      const response = await fetch('/api/gamification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-streak',
          data: { maintainStreak }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const streakResult: StreakResult = result.data;
        
        // Update user state
        setState(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            currentStreak: streakResult.currentStreak,
            longestStreak: streakResult.longestStreak
          } : null
        }));

        return streakResult;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      recentXP: null
    }));
  }, []);

  return {
    ...state,
    awardXP,
    updateStreak,
    loadDailyChallenge,
    refreshUserData,
    clearNotifications
  };
}

// Helper hook for triggering XP awards based on learning activities
export function useXPTriggers() {
  const { awardXP } = useGamification();

  const triggerLessonComplete = useCallback(async (lessonId: string, timeSpent: number, difficulty?: string) => {
    return await awardXP({
      type: 'lesson_completed',
      userId: 'current-user', // Would come from auth context
      metadata: {
        lessonId,
        timeSpent,
        difficulty
      }
    });
  }, [awardXP]);

  const triggerQuizComplete = useCallback(async (quizId: string, score: number, difficulty?: string) => {
    return await awardXP({
      type: 'quiz_passed',
      userId: 'current-user',
      metadata: {
        quizId,
        score,
        difficulty
      }
    });
  }, [awardXP]);

  const triggerCardReview = useCallback(async (cardId: string, ease: number) => {
    return await awardXP({
      type: 'card_reviewed',
      userId: 'current-user',
      metadata: {
        cardId,
        ease
      }
    });
  }, [awardXP]);

  const triggerPerfectScore = useCallback(async (quizId: string) => {
    return await awardXP({
      type: 'perfect_score',
      userId: 'current-user',
      metadata: {
        quizId
      }
    });
  }, [awardXP]);

  const triggerChallengeComplete = useCallback(async (challengeType: string) => {
    return await awardXP({
      type: 'challenge_completed',
      userId: 'current-user',
      metadata: {
        challengeType
      }
    });
  }, [awardXP]);

  const triggerSocialInteraction = useCallback(async (interactionType: string) => {
    return await awardXP({
      type: 'social_interaction',
      userId: 'current-user',
      metadata: {
        interactionType
      }
    });
  }, [awardXP]);

  return {
    triggerLessonComplete,
    triggerQuizComplete,
    triggerCardReview,
    triggerPerfectScore,
    triggerChallengeComplete,
    triggerSocialInteraction
  };
}