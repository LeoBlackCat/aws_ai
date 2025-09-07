/**
 * GamificationService - Comprehensive gamification engine for AWS AI Practitioner Trainer
 * Handles XP, levels, achievements, streaks, daily challenges, and leaderboards
 */

import { prisma } from '../lib/prisma';
import type { 
  User, 
  Achievement, 
  UserAchievement, 
  LearningSession,
  AchievementCategory 
} from '@prisma/client';

export interface LearningAction {
  type: 'lesson_completed' | 'quiz_passed' | 'card_reviewed' | 'streak_maintained' | 'challenge_completed' | 'perfect_score' | 'first_login' | 'social_interaction';
  userId: string;
  metadata?: {
    lessonId?: string;
    quizId?: string;
    score?: number;
    difficulty?: string;
    timeSpent?: number;
    streakDays?: number;
    challengeType?: string;
    [key: string]: any;
  };
}

export interface XPResult {
  xpEarned: number;
  totalXP: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  achievements?: Achievement[];
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  streakMaintained: boolean;
  streakBroken: boolean;
  achievements?: Achievement[];
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'quiz_accuracy' | 'lesson_completion' | 'card_reviews' | 'time_spent' | 'perfect_streak';
  target: number;
  progress: number;
  xpReward: number;
  completed: boolean;
  expiresAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  rank: number;
  weeklyXP?: number;
  monthlyXP?: number;
}

export interface Leaderboard {
  type: 'all_time' | 'weekly' | 'monthly';
  entries: LeaderboardEntry[];
  userRank?: number;
  totalUsers: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  criteria: {
    type: string;
    target: number;
    timeframe?: string;
    conditions?: Record<string, any>;
  };
  xpReward: number;
  hidden?: boolean;
}

class GamificationService {
  private static instance: GamificationService;
  private achievementDefinitions: Map<string, AchievementDefinition> = new Map();

  constructor() {
    this.initializeAchievements();
  }

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  /**
   * Award XP for learning actions and check for level ups
   */
  async awardXP(userId: string, action: LearningAction): Promise<XPResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const xpEarned = this.calculateXP(action);
      const levelBefore = user.level;
      const newTotalXP = user.totalXP + xpEarned;
      const levelAfter = this.calculateLevel(newTotalXP);

      // Update user XP and level
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          totalXP: newTotalXP,
          level: levelAfter
        }
      });

      // Record learning session
      await this.recordLearningSession(userId, action, xpEarned);

      // Check for achievements
      const newAchievements = await this.checkAchievements(userId, action);

      return {
        xpEarned,
        totalXP: newTotalXP,
        levelBefore,
        levelAfter,
        leveledUp: levelAfter > levelBefore,
        achievements: newAchievements
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  /**
   * Update user streak and check for streak-based achievements
   */
  async updateStreak(userId: string, maintainStreak: boolean = true): Promise<StreakResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const lastLogin = user.lastLoginAt;
      const isConsecutiveDay = lastLogin && this.isConsecutiveDay(lastLogin, today);

      let newStreak: number;
      let streakMaintained = false;
      let streakBroken = false;

      if (maintainStreak && (isConsecutiveDay || !lastLogin)) {
        newStreak = user.currentStreak + 1;
        streakMaintained = true;
      } else if (!maintainStreak || (lastLogin && !isConsecutiveDay)) {
        newStreak = 0;
        streakBroken = user.currentStreak > 0;
      } else {
        newStreak = user.currentStreak;
      }

      const longestStreak = Math.max(user.longestStreak, newStreak);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          longestStreak,
          lastLoginAt: today
        }
      });

      // Check for streak achievements
      const achievements = await this.checkStreakAchievements(userId, newStreak, longestStreak);

      return {
        currentStreak: newStreak,
        longestStreak,
        streakMaintained,
        streakBroken,
        achievements
      };
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  /**
   * Generate daily challenge for user
   */
  async generateDailyChallenge(userId: string): Promise<DailyChallenge> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          progress: true,
          quizAttempts: {
            where: {
              completedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          },
          cardReviews: {
            where: {
              reviewedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's current progress to tailor challenges
      const completedLessons = user.progress.filter(p => p.status === 'COMPLETED').length;
      const todayQuizzes = user.quizAttempts.length;
      const todayCardReviews = user.cardReviews.length;

      // Generate challenge based on user's activity and level
      const challengeTypes = this.getChallengeTypes(user.level, completedLessons);
      const selectedType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];

      const challenge = this.createChallenge(selectedType, user, {
        todayQuizzes,
        todayCardReviews,
        completedLessons
      });

      return challenge;
    } catch (error) {
      console.error('Error generating daily challenge:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard with different time periods
   */
  async getLeaderboard(type: 'all_time' | 'weekly' | 'monthly', limit: number = 50, userId?: string): Promise<Leaderboard> {
    try {
      let whereClause = {};
      let orderBy = {};

      switch (type) {
        case 'all_time':
          orderBy = { totalXP: 'desc' };
          break;
        case 'weekly':
          // For weekly/monthly, we'd need to calculate XP from learning sessions
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          // This would require a more complex query with learning sessions
          orderBy = { totalXP: 'desc' }; // Fallback to all-time for now
          break;
        case 'monthly':
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          orderBy = { totalXP: 'desc' }; // Fallback to all-time for now
          break;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        orderBy,
        take: limit,
        select: {
          id: true,
          name: true,
          avatar: true,
          totalXP: true,
          level: true,
          currentStreak: true
        }
      });

      const entries: LeaderboardEntry[] = users.map((user, index) => ({
        userId: user.id,
        name: user.name || 'Anonymous',
        avatar: user.avatar ?? undefined,
        totalXP: user.totalXP,
        level: user.level,
        currentStreak: user.currentStreak,
        rank: index + 1
      }));

      let userRank: number | undefined;
      if (userId) {
        const userIndex = entries.findIndex(entry => entry.userId === userId);
        userRank = userIndex >= 0 ? userIndex + 1 : undefined;

        // If user not in top results, get their rank
        if (userRank === undefined) {
          const userRankResult = await prisma.user.count({
            where: {
              totalXP: {
                gt: (await prisma.user.findUnique({ where: { id: userId } }))?.totalXP || 0
              }
            }
          });
          userRank = userRankResult + 1;
        }
      }

      const totalUsers = await prisma.user.count();

      return {
        type,
        entries,
        userRank,
        totalUsers
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Check for new achievements based on user action
   */
  async checkAchievements(userId: string, action: LearningAction): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];

      // Get user's current achievements
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
      });

      const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));

      // Check each achievement definition
      for (const [achievementId, definition] of this.achievementDefinitions) {
        if (unlockedAchievementIds.has(achievementId)) {
          continue; // Already unlocked
        }

        const meetsRequirements = await this.checkAchievementRequirements(userId, definition, action);
        
        if (meetsRequirements) {
          // Create achievement if it doesn't exist
          let achievement = await prisma.achievement.findUnique({
            where: { title: definition.title }
          });

          if (!achievement) {
            achievement = await prisma.achievement.create({
              data: {
                title: definition.title,
                description: definition.description,
                icon: definition.icon,
                category: definition.category,
                criteria: definition.criteria,
                xpReward: definition.xpReward
              }
            });
          }

          // Award achievement to user
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id
            }
          });

          // Award XP bonus
          if (definition.xpReward > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                totalXP: {
                  increment: definition.xpReward
                }
              }
            });
          }

          newAchievements.push(achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Get user's achievement progress and statistics
   */
  async getUserAchievements(userId: string): Promise<{
    unlocked: UserAchievement[];
    available: AchievementDefinition[];
    progress: Record<string, number>;
    stats: {
      totalUnlocked: number;
      totalAvailable: number;
      completionRate: number;
      totalXPFromAchievements: number;
    };
  }> {
    try {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' }
      });

      const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
      const availableAchievements = Array.from(this.achievementDefinitions.values())
        .filter(def => !def.hidden);

      // Calculate progress for locked achievements
      const progress: Record<string, number> = {};
      for (const definition of availableAchievements) {
        if (!unlockedIds.has(definition.id)) {
          progress[definition.id] = await this.calculateAchievementProgress(userId, definition);
        }
      }

      const totalXPFromAchievements = userAchievements.reduce(
        (sum, ua) => sum + ua.achievement.xpReward, 
        0
      );

      return {
        unlocked: userAchievements,
        available: availableAchievements,
        progress,
        stats: {
          totalUnlocked: userAchievements.length,
          totalAvailable: availableAchievements.length,
          completionRate: (userAchievements.length / availableAchievements.length) * 100,
          totalXPFromAchievements
        }
      };
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private calculateXP(action: LearningAction): number {
    const baseXP = {
      lesson_completed: 50,
      quiz_passed: 30,
      card_reviewed: 5,
      streak_maintained: 10,
      challenge_completed: 100,
      perfect_score: 50,
      first_login: 25,
      social_interaction: 15
    };

    let xp = baseXP[action.type] || 10;

    // Apply multipliers based on metadata
    if (action.metadata) {
      // Difficulty multiplier
      if (action.metadata.difficulty) {
        const difficultyMultiplier = {
          'BEGINNER': 1.0,
          'INTERMEDIATE': 1.2,
          'ADVANCED': 1.5,
          'EXPERT': 2.0
        };
        xp *= (difficultyMultiplier as any)[action.metadata.difficulty] || 1.0;
      }

      // Score multiplier for quizzes
      if (action.metadata.score && action.type === 'quiz_passed') {
        xp *= Math.max(0.5, action.metadata.score); // Minimum 50% XP
      }

      // Time bonus for efficient completion
      if (action.metadata.timeSpent && action.type === 'lesson_completed') {
        const timeBonus = action.metadata.timeSpent < 300 ? 1.2 : 1.0; // Bonus for < 5 min
        xp *= timeBonus;
      }
    }

    return Math.round(xp);
  }

  private calculateLevel(totalXP: number): number {
    // Progressive XP requirements: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, etc.
    // Formula: XP needed for level n = 100 * (n-1) * n / 2
    let level = 1;
    let xpNeeded = 0;
    
    while (totalXP >= xpNeeded) {
      level++;
      xpNeeded += 100 * (level - 1);
    }
    
    return level - 1;
  }

  private async recordLearningSession(userId: string, action: LearningAction, xpEarned: number): Promise<void> {
    const now = new Date();
    
    // Try to find an active session (within last hour)
    const activeSession = await prisma.learningSession.findFirst({
      where: {
        userId,
        endTime: null,
        startTime: {
          gte: new Date(now.getTime() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    if (activeSession) {
      // Update existing session
      const currentActivities = Array.isArray(activeSession.activities) 
        ? activeSession.activities as any[]
        : [];

      await prisma.learningSession.update({
        where: { id: activeSession.id },
        data: {
          xpEarned: activeSession.xpEarned + xpEarned,
          activities: [
            ...currentActivities,
            {
              type: action.type,
              timestamp: now,
              xp: xpEarned,
              metadata: action.metadata
            }
          ]
        }
      });
    } else {
      // Create new session
      await prisma.learningSession.create({
        data: {
          userId,
          startTime: now,
          xpEarned,
          activities: [{
            type: action.type,
            timestamp: now,
            xp: xpEarned,
            metadata: action.metadata
          }]
        }
      });
    }
  }

  private isConsecutiveDay(lastLogin: Date, today: Date): boolean {
    const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = todayDate.getTime() - lastLoginDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  private async checkStreakAchievements(userId: string, currentStreak: number, longestStreak: number): Promise<Achievement[]> {
    const streakAchievements = [
      { streak: 3, title: 'Getting Started', description: 'Maintain a 3-day learning streak' },
      { streak: 7, title: 'Week Warrior', description: 'Maintain a 7-day learning streak' },
      { streak: 14, title: 'Two Week Champion', description: 'Maintain a 14-day learning streak' },
      { streak: 30, title: 'Monthly Master', description: 'Maintain a 30-day learning streak' },
      { streak: 100, title: 'Centurion', description: 'Maintain a 100-day learning streak' }
    ];

    const newAchievements: Achievement[] = [];

    for (const streakAchievement of streakAchievements) {
      if (currentStreak >= streakAchievement.streak) {
        const existingAchievement = await prisma.userAchievement.findFirst({
          where: {
            userId,
            achievement: {
              title: streakAchievement.title
            }
          }
        });

        if (!existingAchievement) {
          // Create and award achievement
          let achievement = await prisma.achievement.findUnique({
            where: { title: streakAchievement.title }
          });

          if (!achievement) {
            achievement = await prisma.achievement.create({
              data: {
                title: streakAchievement.title,
                description: streakAchievement.description,
                icon: '🔥',
                category: 'CONSISTENCY',
                criteria: { type: 'streak', target: streakAchievement.streak },
                xpReward: streakAchievement.streak * 10
              }
            });
          }

          await prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id }
          });

          newAchievements.push(achievement);
        }
      }
    }

    return newAchievements;
  }

  private getChallengeTypes(userLevel: number, completedLessons: number): DailyChallenge['type'][] {
    const baseTypes: DailyChallenge['type'][] = ['lesson_completion', 'card_reviews'];
    
    if (userLevel >= 2) baseTypes.push('quiz_accuracy');
    if (userLevel >= 3) baseTypes.push('time_spent');
    if (completedLessons >= 5) baseTypes.push('perfect_streak');
    
    return baseTypes;
  }

  private createChallenge(
    type: DailyChallenge['type'], 
    user: User, 
    context: { todayQuizzes: number; todayCardReviews: number; completedLessons: number }
  ): DailyChallenge {
    const challenges = {
      quiz_accuracy: {
        title: 'Quiz Master',
        description: 'Score 80% or higher on 3 quizzes',
        target: 3,
        progress: Math.min(context.todayQuizzes, 3),
        xpReward: 150
      },
      lesson_completion: {
        title: 'Knowledge Seeker',
        description: 'Complete 2 lessons today',
        target: 2,
        progress: 0, // Would need to check today's completions
        xpReward: 100
      },
      card_reviews: {
        title: 'Memory Champion',
        description: 'Review 20 flashcards',
        target: 20,
        progress: context.todayCardReviews,
        xpReward: 75
      },
      time_spent: {
        title: 'Dedicated Learner',
        description: 'Spend 30 minutes learning',
        target: 30,
        progress: 0, // Would need to calculate from today's sessions
        xpReward: 100
      },
      perfect_streak: {
        title: 'Perfectionist',
        description: 'Get 5 cards correct in a row',
        target: 5,
        progress: 0, // Would need to check recent card performance
        xpReward: 125
      }
    };

    const challenge = challenges[type];
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999); // End of day

    return {
      id: `${type}_${Date.now()}`,
      title: challenge.title,
      description: challenge.description,
      type,
      target: challenge.target,
      progress: challenge.progress,
      xpReward: challenge.xpReward,
      completed: challenge.progress >= challenge.target,
      expiresAt
    };
  }

  private async checkAchievementRequirements(
    userId: string, 
    definition: AchievementDefinition, 
    action: LearningAction
  ): Promise<boolean> {
    const { criteria } = definition;

    try {
      switch (criteria.type) {
        case 'lessons_completed':
          const completedLessons = await prisma.userProgress.count({
            where: { userId, status: 'COMPLETED' }
          });
          return completedLessons >= criteria.target;

        case 'quiz_score':
          const quizAttempts = await prisma.quizAttempt.findMany({
            where: { userId },
            orderBy: { completedAt: 'desc' },
            take: criteria.conditions?.consecutive || 1
          });
          return quizAttempts && quizAttempts.length >= (criteria.conditions?.consecutive || 1) &&
                 quizAttempts.every(attempt => attempt.score >= criteria.target);

        case 'total_xp':
          const user = await prisma.user.findUnique({ where: { id: userId } });
          return (user?.totalXP || 0) >= criteria.target;

        case 'cards_reviewed':
          const cardReviews = await prisma.cardReview.count({
            where: { userId }
          });
          return cardReviews >= criteria.target;

        case 'first_action':
          return action.type === criteria.conditions?.actionType;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking achievement requirements:', error);
      return false;
    }
  }

  private async calculateAchievementProgress(userId: string, definition: AchievementDefinition): Promise<number> {
    const { criteria } = definition;

    switch (criteria.type) {
      case 'lessons_completed':
        const completedLessons = await prisma.userProgress.count({
          where: { userId, status: 'COMPLETED' }
        });
        return Math.min(completedLessons / criteria.target, 1.0);

      case 'total_xp':
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return Math.min((user?.totalXP || 0) / criteria.target, 1.0);

      case 'cards_reviewed':
        const cardReviews = await prisma.cardReview.count({
          where: { userId }
        });
        return Math.min(cardReviews / criteria.target, 1.0);

      default:
        return 0;
    }
  }

  private initializeAchievements(): void {
    const achievements: AchievementDefinition[] = [
      // Learning Achievements
      {
        id: 'first_lesson',
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: '🎯',
        category: 'LEARNING',
        criteria: { type: 'lessons_completed', target: 1 },
        xpReward: 50
      },
      {
        id: 'aws_fundamentals',
        title: 'AWS Fundamentals Master',
        description: 'Complete all fundamentals lessons',
        icon: '🏗️',
        category: 'LEARNING',
        criteria: { type: 'lessons_completed', target: 10 },
        xpReward: 200
      },
      {
        id: 'ai_expert',
        title: 'AI Expert',
        description: 'Complete all AI concept lessons',
        icon: '🤖',
        category: 'MASTERY',
        criteria: { type: 'lessons_completed', target: 25 },
        xpReward: 500
      },

      // Quiz Achievements
      {
        id: 'first_quiz',
        title: 'Quiz Rookie',
        description: 'Complete your first quiz',
        icon: '📝',
        category: 'LEARNING',
        criteria: { type: 'first_action', target: 1, conditions: { actionType: 'quiz_passed' } },
        xpReward: 25
      },
      {
        id: 'perfect_score',
        title: 'Perfect Score',
        description: 'Get 100% on a quiz',
        icon: '💯',
        category: 'MASTERY',
        criteria: { type: 'quiz_score', target: 1.0 },
        xpReward: 100
      },
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Score 90% or higher on 10 quizzes',
        icon: '🏆',
        category: 'MASTERY',
        criteria: { type: 'quiz_score', target: 0.9, conditions: { consecutive: 10 } },
        xpReward: 300
      },

      // Flashcard Achievements
      {
        id: 'card_novice',
        title: 'Card Novice',
        description: 'Review 50 flashcards',
        icon: '🃏',
        category: 'LEARNING',
        criteria: { type: 'cards_reviewed', target: 50 },
        xpReward: 75
      },
      {
        id: 'memory_master',
        title: 'Memory Master',
        description: 'Review 500 flashcards',
        icon: '🧠',
        category: 'MASTERY',
        criteria: { type: 'cards_reviewed', target: 500 },
        xpReward: 250
      },

      // XP Achievements
      {
        id: 'xp_1000',
        title: 'Rising Star',
        description: 'Earn 1,000 XP',
        icon: '⭐',
        category: 'MILESTONE',
        criteria: { type: 'total_xp', target: 1000 },
        xpReward: 100
      },
      {
        id: 'xp_5000',
        title: 'Learning Legend',
        description: 'Earn 5,000 XP',
        icon: '🌟',
        category: 'MILESTONE',
        criteria: { type: 'total_xp', target: 5000 },
        xpReward: 250
      },
      {
        id: 'xp_10000',
        title: 'AWS Champion',
        description: 'Earn 10,000 XP',
        icon: '👑',
        category: 'MILESTONE',
        criteria: { type: 'total_xp', target: 10000 },
        xpReward: 500
      }
    ];

    achievements.forEach(achievement => {
      this.achievementDefinitions.set(achievement.id, achievement);
    });
  }
}

export default GamificationService;