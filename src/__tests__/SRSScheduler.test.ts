/**
 * Tests for SRSScheduler service
 */

import SRSScheduler, { EaseRating } from '../services/SRSScheduler';
import { prisma } from '../lib/prisma';
import { Card, CardReview } from '@prisma/client';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    card: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    cardReview: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('SRSScheduler', () => {
  let scheduler: SRSScheduler;
  const userId = 'test-user-id';
  const cardId = 'test-card-id';

  beforeEach(() => {
    scheduler = new SRSScheduler(userId);
    jest.clearAllMocks();
  });

  describe('SM-2 Algorithm', () => {
    it('should schedule new card correctly on first review', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      const result = await scheduler.scheduleCard(cardId, EaseRating.GOOD, 30, 4);

      expect(result.algorithm).toBe('SM2');
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: {
          interval: result.interval,
          easeFactor: result.easeFactor,
          repetitions: result.repetitions,
          nextReview: result.nextReview,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should reset card on AGAIN rating', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 10,
        easeFactor: 2.5,
        repetitions: 5,
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      const result = await scheduler.scheduleCard(cardId, EaseRating.AGAIN, 45, 1);

      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('should increase interval correctly for GOOD rating', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 6,
        easeFactor: 2.5,
        repetitions: 2,
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      const result = await scheduler.scheduleCard(cardId, EaseRating.GOOD, 25, 4);

      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(Math.round(6 * 2.5)); // 15
    });

    it('should adjust ease factor based on rating', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      // Test EASY rating (should increase ease factor)
      const easyResult = await scheduler.scheduleCard(cardId, EaseRating.EASY, 15, 5);
      expect(easyResult.easeFactor).toBeGreaterThanOrEqual(2.5);

      // Test HARD rating (should decrease ease factor)
      const hardResult = await scheduler.scheduleCard(cardId, EaseRating.HARD, 60, 2);
      expect(hardResult.easeFactor).toBeLessThan(2.5);
      expect(hardResult.easeFactor).toBeGreaterThanOrEqual(1.3); // Minimum ease factor
    });
  });

  describe('Leitner Box Algorithm', () => {
    beforeEach(() => {
      scheduler.updateAlgorithm('LEITNER');
    });

    it('should move card to next box on success', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0, // Box 0
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      const result = await scheduler.scheduleCard(cardId, EaseRating.GOOD, 30, 4);

      expect(result.algorithm).toBe('LEITNER');
      expect(result.repetitions).toBe(1); // Moved to box 1
      expect(result.interval).toBe(3); // Box 1 interval
    });

    it('should move card back to box 0 on failure', async () => {
      const mockCard: Card = {
        id: cardId,
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is AWS?',
        back: 'Amazon Web Services',
        hint: null,
        interval: 7,
        easeFactor: 2.5,
        repetitions: 2, // Box 2
        nextReview: new Date(),
        difficulty: 'BEGINNER',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        reviews: [],
      });

      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({} as CardReview);

      const result = await scheduler.scheduleCard(cardId, EaseRating.AGAIN, 45, 1);

      expect(result.repetitions).toBe(0); // Back to box 0
      expect(result.interval).toBe(1); // Box 0 interval
    });
  });

  describe('Daily Review Queue', () => {
    it('should return cards due for review', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockCards = [
        {
          id: 'card-1',
          termId: 'term-1',
          lessonId: 'lesson-1',
          type: 'BASIC',
          front: 'What is EC2?',
          back: 'Elastic Compute Cloud',
          hint: null,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          nextReview: yesterday,
          difficulty: 'BEGINNER',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          term: null,
          lesson: null,
          reviews: [{ userId, reviewedAt: yesterday }],
        },
      ];

      const mockNewCards = [
        {
          id: 'card-2',
          termId: 'term-2',
          lessonId: 'lesson-1',
          type: 'BASIC',
          front: 'What is S3?',
          back: 'Simple Storage Service',
          hint: null,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          nextReview: new Date(),
          difficulty: 'BEGINNER',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          term: null,
          lesson: null,
          reviews: [],
        },
      ];

      mockPrisma.card.findMany
        .mockResolvedValueOnce(mockCards as any)
        .mockResolvedValueOnce(mockNewCards as any);

      const session = await scheduler.getDailyReview();

      expect(session.reviewCards).toHaveLength(1);
      expect(session.newCards).toHaveLength(1);
      expect(session.totalCards).toBe(2);
      expect(session.estimatedTime).toBe(60); // 2 cards * 30 seconds
    });

    it('should identify leech cards', async () => {
      const mockLeechCard = {
        id: 'leech-card',
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'Difficult concept',
        back: 'Complex answer',
        hint: null,
        interval: 1,
        easeFactor: 1.3,
        repetitions: 10,
        nextReview: new Date(),
        difficulty: 'EXPERT',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        term: null,
        lesson: null,
        reviews: Array(8).fill(null).map(() => ({
          userId,
          ease: EaseRating.AGAIN,
          reviewedAt: new Date(),
        })),
      };

      mockPrisma.card.findMany
        .mockResolvedValueOnce([mockLeechCard] as any)
        .mockResolvedValueOnce([]);

      const session = await scheduler.getDailyReview();

      expect(session.leechCards).toHaveLength(1);
      expect(session.leechCards[0].id).toBe('leech-card');
    });
  });

  describe('Retention Metrics', () => {
    it('should calculate retention metrics correctly', async () => {
      const mockReviews = [
        { ease: EaseRating.GOOD, card: { difficulty: 'BEGINNER', interval: 5 } },
        { ease: EaseRating.EASY, card: { difficulty: 'BEGINNER', interval: 10 } },
        { ease: EaseRating.AGAIN, card: { difficulty: 'INTERMEDIATE', interval: 1 } },
        { ease: EaseRating.GOOD, card: { difficulty: 'INTERMEDIATE', interval: 7 } },
      ];

      mockPrisma.cardReview.findMany.mockResolvedValue(mockReviews as any);

      const metrics = await scheduler.calculateRetention();

      expect(metrics.overallRetention).toBe(75); // 3 out of 4 successful
      expect(metrics.retentionByDifficulty.BEGINNER).toBe(100); // 2 out of 2
      expect(metrics.retentionByDifficulty.INTERMEDIATE).toBe(50); // 1 out of 2
      expect(metrics.averageInterval).toBe(5.75); // (5+10+1+7)/4
      expect(metrics.totalReviews).toBe(4);
    });
  });

  describe('Card Management', () => {
    it('should reset leech card correctly', async () => {
      mockPrisma.card.update.mockResolvedValue({} as Card);

      await scheduler.resetLeechCard(cardId);

      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          nextReview: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should suspend card correctly', async () => {
      mockPrisma.card.update.mockResolvedValue({} as Card);

      await scheduler.suspendCard(cardId);

      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: {
          nextReview: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      // Check that the next review date is far in the future
      const updateCall = mockPrisma.card.update.mock.calls[0][0];
      const nextReview = updateCall.data.nextReview as Date;
      const tenYearsFromNow = new Date();
      tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
      
      expect(nextReview.getFullYear()).toBeGreaterThanOrEqual(tenYearsFromNow.getFullYear());
    });

    it('should unsuspend card correctly', async () => {
      mockPrisma.card.update.mockResolvedValue({} as Card);

      await scheduler.unsuspendCard(cardId);

      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: cardId },
        data: {
          nextReview: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      // Check that the next review date is now or in the past
      const updateCall = mockPrisma.card.update.mock.calls[0][0];
      const nextReview = updateCall.data.nextReview as Date;
      const now = new Date();
      
      expect(nextReview.getTime()).toBeLessThanOrEqual(now.getTime() + 1000); // Allow 1 second tolerance
    });
  });

  describe('Algorithm Settings', () => {
    it('should update algorithm correctly', () => {
      scheduler.updateAlgorithm('FSRS');
      const settings = scheduler.getSettings();
      expect(settings.algorithm).toBe('FSRS');
    });

    it('should update settings correctly', () => {
      const newSettings = {
        maxNewCardsPerDay: 15,
        maxReviewsPerDay: 150,
        leechThreshold: 6,
      };

      scheduler.updateSettings(newSettings);
      const settings = scheduler.getSettings();

      expect(settings.maxNewCardsPerDay).toBe(15);
      expect(settings.maxReviewsPerDay).toBe(150);
      expect(settings.leechThreshold).toBe(6);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent card', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);

      await expect(
        scheduler.scheduleCard('non-existent-card', EaseRating.GOOD, 30, 4)
      ).rejects.toThrow('Card with id non-existent-card not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.card.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        scheduler.scheduleCard(cardId, EaseRating.GOOD, 30, 4)
      ).rejects.toThrow('Database error');
    });
  });
});