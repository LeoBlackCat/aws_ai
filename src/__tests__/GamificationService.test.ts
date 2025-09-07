import GamificationService from '../services/GamificationService';
import type { LearningAction } from '../services/GamificationService';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    achievement: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    learningSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProgress: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    cardReview: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

const { prisma } = require('../lib/prisma');

describe('GamificationService', () => {
  let gamificationService: GamificationService;
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    gamificationService = GamificationService.getInstance();
    jest.clearAllMocks();
  });

  describe('awardXP', () => {
    const mockUser = {
      id: mockUserId,
      totalXP: 1000,
      level: 5,
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockImplementation(({ data }) => Promise.resolve({
        ...mockUser,
        totalXP: data.totalXP,
        level: data.level,
      }));
      prisma.learningSession.findFirst.mockResolvedValue(null);
      prisma.learningSession.create.mockResolvedValue({});
      prisma.userAchievement.findMany.mockResolvedValue([]);
    });

    it('should award XP for lesson completion', async () => {
      const action: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
        metadata: {
          lessonId: 'lesson-1',
          difficulty: 'INTERMEDIATE',
          timeSpent: 300,
        },
      };

      const result = await gamificationService.awardXP(mockUserId, action);

      expect(result.xpEarned).toBeGreaterThan(0);
      expect(result.totalXP).toBeGreaterThan(1000); // Should be more than starting XP
      expect(result.levelBefore).toBe(5);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          totalXP: expect.any(Number),
          level: expect.any(Number),
        },
      });
    });

    it('should apply difficulty multipliers correctly', async () => {
      const beginnerAction: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
        metadata: { difficulty: 'BEGINNER' },
      };

      const expertAction: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
        metadata: { difficulty: 'EXPERT' },
      };

      const beginnerResult = await gamificationService.awardXP(mockUserId, beginnerAction);
      const expertResult = await gamificationService.awardXP(mockUserId, expertAction);

      expect(expertResult.xpEarned).toBeGreaterThan(beginnerResult.xpEarned);
    });

    it('should detect level ups', async () => {
      // Mock user close to level up
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        totalXP: 1450, // Close to level 6 threshold
        level: 5,
      });

      prisma.user.update.mockResolvedValue({
        ...mockUser,
        totalXP: 1500,
        level: 6,
      });

      const action: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
      };

      const result = await gamificationService.awardXP(mockUserId, action);

      expect(result.leveledUp).toBe(true);
      expect(result.levelAfter).toBeGreaterThan(result.levelBefore);
    });

    it('should handle user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const action: LearningAction = {
        type: 'lesson_completed',
        userId: 'non-existent-user',
      };

      await expect(
        gamificationService.awardXP('non-existent-user', action)
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateStreak', () => {
    const mockUser = {
      id: mockUserId,
      currentStreak: 5,
      longestStreak: 10,
      lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        currentStreak: 6,
        longestStreak: 10,
      });
      prisma.userAchievement.findFirst.mockResolvedValue(null);
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({
        id: 'achievement-1',
        title: 'Test Achievement',
        xpReward: 100,
      });
      prisma.userAchievement.create.mockResolvedValue({});
    });

    it('should maintain streak for consecutive days', async () => {
      const result = await gamificationService.updateStreak(mockUserId, true);

      expect(result.currentStreak).toBe(6);
      expect(result.streakMaintained).toBe(true);
      expect(result.streakBroken).toBe(false);
    });

    it('should break streak when not maintaining', async () => {
      const result = await gamificationService.updateStreak(mockUserId, false);

      expect(result.currentStreak).toBe(0);
      expect(result.streakMaintained).toBe(false);
      expect(result.streakBroken).toBe(true);
    });

    it('should update longest streak when current exceeds it', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        currentStreak: 10,
        longestStreak: 10,
      });

      prisma.user.update.mockResolvedValue({
        ...mockUser,
        currentStreak: 11,
        longestStreak: 11,
      });

      const result = await gamificationService.updateStreak(mockUserId, true);

      expect(result.longestStreak).toBe(11);
    });
  });

  describe('generateDailyChallenge', () => {
    const mockUser = {
      id: mockUserId,
      level: 5,
      progress: [],
      quizAttempts: [],
      cardReviews: [],
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should generate a daily challenge', async () => {
      const challenge = await gamificationService.generateDailyChallenge(mockUserId);

      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('title');
      expect(challenge).toHaveProperty('description');
      expect(challenge).toHaveProperty('target');
      expect(challenge).toHaveProperty('xpReward');
      expect(challenge.expiresAt).toBeInstanceOf(Date);
    });

    it('should tailor challenge to user level', async () => {
      const beginnerUser = { ...mockUser, level: 1 };
      const expertUser = { ...mockUser, level: 10 };

      prisma.user.findUnique.mockResolvedValueOnce(beginnerUser);
      const beginnerChallenge = await gamificationService.generateDailyChallenge(mockUserId);

      prisma.user.findUnique.mockResolvedValueOnce(expertUser);
      const expertChallenge = await gamificationService.generateDailyChallenge(mockUserId);

      // Expert challenges should generally have higher rewards
      expect(expertChallenge.xpReward).toBeGreaterThanOrEqual(beginnerChallenge.xpReward);
    });
  });

  describe('getLeaderboard', () => {
    const mockUsers = [
      {
        id: 'user-1',
        name: 'Top User',
        avatar: null,
        totalXP: 5000,
        level: 15,
        currentStreak: 30,
      },
      {
        id: 'user-2',
        name: 'Second User',
        avatar: null,
        totalXP: 4000,
        level: 12,
        currentStreak: 20,
      },
    ];

    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(100);
    });

    it('should return leaderboard with correct structure', async () => {
      const leaderboard = await gamificationService.getLeaderboard('all_time', 10);

      expect(leaderboard).toHaveProperty('type', 'all_time');
      expect(leaderboard).toHaveProperty('entries');
      expect(leaderboard).toHaveProperty('totalUsers', 100);
      expect(leaderboard.entries).toHaveLength(2);
      expect(leaderboard.entries[0]).toHaveProperty('rank', 1);
      expect(leaderboard.entries[1]).toHaveProperty('rank', 2);
    });

    it('should find user rank when provided', async () => {
      const leaderboard = await gamificationService.getLeaderboard('all_time', 10, 'user-2');

      expect(leaderboard.userRank).toBe(2);
    });

    it('should calculate user rank when not in top results', async () => {
      prisma.user.findUnique.mockResolvedValue({ totalXP: 1000 });
      prisma.user.count.mockResolvedValueOnce(5); // 5 users with higher XP

      const leaderboard = await gamificationService.getLeaderboard('all_time', 2, 'user-3');

      expect(leaderboard.userRank).toBe(6); // 5 users ahead + 1
    });
  });

  describe('checkAchievements', () => {
    beforeEach(() => {
      prisma.userAchievement.findMany.mockResolvedValue([]);
      prisma.userProgress.count.mockResolvedValue(5);
      prisma.user.findUnique.mockResolvedValue({ totalXP: 1000 });
      prisma.achievement.findUnique.mockResolvedValue(null);
      prisma.achievement.create.mockResolvedValue({
        id: 'achievement-1',
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: '🎯',
        xpReward: 50,
      });
      prisma.userAchievement.create.mockResolvedValue({});
    });

    it('should unlock achievements when requirements are met', async () => {
      const action: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
      };

      const achievements = await gamificationService.checkAchievements(mockUserId, action);

      expect(achievements).toHaveLength(1);
      expect(achievements[0]).toHaveProperty('title', 'First Steps');
    });

    it('should not unlock already unlocked achievements', async () => {
      // Mock user already has the achievement
      prisma.userAchievement.findMany.mockResolvedValue([
        {
          achievementId: 'first_lesson',
          achievement: { title: 'First Steps' },
        },
      ]);

      const action: LearningAction = {
        type: 'lesson_completed',
        userId: mockUserId,
      };

      const achievements = await gamificationService.checkAchievements(mockUserId, action);

      expect(achievements).toHaveLength(0);
    });
  });

  describe('getUserAchievements', () => {
    beforeEach(() => {
      prisma.userAchievement.findMany.mockResolvedValue([
        {
          id: 'ua-1',
          achievementId: 'first_lesson',
          achievement: {
            id: 'first_lesson',
            title: 'First Steps',
            description: 'Complete your first lesson',
            icon: '🎯',
            xpReward: 50,
          },
        },
      ]);
      prisma.userProgress.count.mockResolvedValue(1);
    });

    it('should return user achievements with progress', async () => {
      const result = await gamificationService.getUserAchievements(mockUserId);

      expect(result).toHaveProperty('unlocked');
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('stats');
      expect(result.unlocked).toHaveLength(1);
      expect(result.stats.totalUnlocked).toBe(1);
    });

    it('should calculate completion rate correctly', async () => {
      const result = await gamificationService.getUserAchievements(mockUserId);

      // With 1 unlocked out of total available achievements
      expect(result.stats.completionRate).toBeGreaterThan(0);
      expect(result.stats.completionRate).toBeLessThanOrEqual(100);
    });
  });
});