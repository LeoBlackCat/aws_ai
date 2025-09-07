/**
 * Integration tests for the complete Spaced Repetition System
 */

import SpacedRepetitionService from '../services/SpacedRepetitionService';
import { EaseRating } from '../services/SRSScheduler';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    learningSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    cardReview: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    lesson: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    term: {
      upsert: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('SpacedRepetitionService Integration', () => {
  let srsService: SpacedRepetitionService;
  const userId = 'test-user-id';

  beforeEach(() => {
    srsService = new SpacedRepetitionService(userId);
    jest.clearAllMocks();
  });

  describe('Complete Study Session Flow', () => {
    it('should handle a complete study session from start to finish', async () => {
      // Mock session creation
      const mockSession = {
        id: 'session-1',
        userId,
        startTime: new Date(),
        endTime: null,
        xpEarned: 0,
        activities: [],
      };

      mockPrisma.learningSession.create.mockResolvedValue(mockSession);
      mockPrisma.learningSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.learningSession.update.mockResolvedValue({
        ...mockSession,
        endTime: new Date(),
        activities: [
          {
            type: 'card_review',
            ease: EaseRating.GOOD,
            confidence: 4,
            timeSpent: 30,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Mock card review
      const mockCard = {
        id: 'card-1',
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
        reviews: [],
      };

      mockPrisma.card.findUnique.mockResolvedValue(mockCard);
      mockPrisma.card.update.mockResolvedValue(mockCard);
      mockPrisma.cardReview.create.mockResolvedValue({
        id: 'review-1',
        userId,
        cardId: 'card-1',
        ease: EaseRating.GOOD,
        timeSpent: 30,
        confidence: 4,
        algorithm: 'SM2',
        reviewedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({} as any);

      // Start session
      const session = await srsService.startStudySession();
      expect(session.id).toBe('session-1');
      expect(session.cardsReviewed).toBe(0);

      // Review a card
      const reviewResult = await srsService.reviewCard(
        'card-1',
        EaseRating.GOOD,
        30,
        4,
        session.id
      );

      expect(reviewResult.cardId).toBe('card-1');
      expect(reviewResult.ease).toBe(EaseRating.GOOD);
      expect(reviewResult.wasCorrect).toBe(true);
      expect(mockPrisma.card.update).toHaveBeenCalled();
      expect(mockPrisma.cardReview.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled(); // XP awarded

      // End session
      const completedSession = await srsService.endStudySession(session.id);
      expect(completedSession.endTime).toBeDefined();
      expect(completedSession.cardsReviewed).toBe(1);
    });

    it('should calculate XP correctly for different review outcomes', async () => {
      const mockCard = {
        id: 'card-1',
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        reviews: [],
      };

      mockPrisma.card.findUnique.mockResolvedValue(mockCard as any);
      mockPrisma.card.update.mockResolvedValue(mockCard as any);
      mockPrisma.cardReview.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);

      // Test correct answer with high confidence
      await srsService.reviewCard('card-1', EaseRating.EASY, 25, 5);
      
      let xpCall = mockPrisma.user.update.mock.calls[0][0];
      expect(xpCall.data.totalXP.increment).toBeGreaterThan(10); // Base + bonuses

      jest.clearAllMocks();
      mockPrisma.card.findUnique.mockResolvedValue(mockCard as any);
      mockPrisma.card.update.mockResolvedValue(mockCard as any);
      mockPrisma.cardReview.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);

      // Test incorrect answer
      await srsService.reviewCard('card-1', EaseRating.AGAIN, 45, 2);
      
      xpCall = mockPrisma.user.update.mock.calls[0][0];
      expect(xpCall.data.totalXP.increment).toBeLessThan(15); // Lower XP for incorrect

      jest.clearAllMocks();
      mockPrisma.card.findUnique.mockResolvedValue(mockCard as any);
      mockPrisma.card.update.mockResolvedValue(mockCard as any);
      mockPrisma.cardReview.create.mockResolvedValue({} as any);
      mockPrisma.user.update.mockResolvedValue({} as any);

      // Test very fast answer (potential penalty)
      await srsService.reviewCard('card-1', EaseRating.GOOD, 2, 3);
      
      xpCall = mockPrisma.user.update.mock.calls[0][0];
      expect(xpCall.data.totalXP.increment).toBeLessThan(15); // Penalty for rushing
    });
  });

  describe('Daily Review Data Integration', () => {
    it('should provide comprehensive daily review data', async () => {
      // Mock scheduler data
      const mockReviewSession = {
        newCards: [],
        reviewCards: [
          {
            id: 'card-1',
            front: 'What is EC2?',
            back: 'Elastic Compute Cloud',
            averageConfidence: 3.5,
            reviewCount: 5,
          },
        ],
        leechCards: [],
        totalCards: 1,
        estimatedTime: 30,
      };

      // Mock confidence metrics
      const mockConfidenceMetrics = {
        overallConfidence: 3.8,
        confidenceByCategory: { AWS_SERVICE: 4.0, AI_CONCEPT: 3.5 },
        confidenceByDifficulty: { BEGINNER: 4.2, INTERMEDIATE: 3.4 },
        confidenceTrend: 0.2,
        lowConfidenceCards: [],
        highConfidenceCards: [],
      };

      // Mock learning pattern
      const mockLearningPattern = {
        userId,
        strongCategories: ['AWS_SERVICE'],
        weakCategories: ['AI_CONCEPT'],
        optimalReviewTime: 14,
        averageSessionLength: 25,
        retentionRate: 0.85,
        confidenceCalibration: 0.7,
      };

      // Mock the underlying service calls
      jest.spyOn(srsService as any, 'scheduler').mockReturnValue({
        getDailyReview: jest.fn().mockResolvedValue(mockReviewSession),
      });

      jest.spyOn(srsService as any, 'confidenceTracker').mockReturnValue({
        getConfidenceMetrics: jest.fn().mockResolvedValue(mockConfidenceMetrics),
        identifyLearningPatterns: jest.fn().mockResolvedValue(mockLearningPattern),
      });

      const dailyData = await srsService.getDailyReviewData();

      expect(dailyData.session).toEqual(mockReviewSession);
      expect(dailyData.confidenceMetrics).toEqual(mockConfidenceMetrics);
      expect(dailyData.learningPattern).toEqual(mockLearningPattern);
      expect(dailyData.recommendations).toBeInstanceOf(Array);
    });

    it('should generate appropriate recommendations based on data', async () => {
      // Mock data that should trigger recommendations
      const mockReviewSession = {
        newCards: [],
        reviewCards: [],
        leechCards: Array(6).fill({ id: 'leech' }), // Many leech cards
        totalCards: 150, // Heavy load
        estimatedTime: 4500,
      };

      const mockConfidenceMetrics = {
        overallConfidence: 2.5,
        confidenceByCategory: {},
        confidenceByDifficulty: {},
        confidenceTrend: -0.8, // Declining confidence
        lowConfidenceCards: [],
        highConfidenceCards: [],
      };

      const mockLearningPattern = {
        userId,
        strongCategories: [],
        weakCategories: ['AI_CONCEPT', 'TECHNICAL_TERM'], // Multiple weak areas
        optimalReviewTime: 14,
        averageSessionLength: 25,
        retentionRate: 0.65, // Low retention
        confidenceCalibration: 0.3,
      };

      jest.spyOn(srsService as any, 'scheduler').mockReturnValue({
        getDailyReview: jest.fn().mockResolvedValue(mockReviewSession),
      });

      jest.spyOn(srsService as any, 'confidenceTracker').mockReturnValue({
        getConfidenceMetrics: jest.fn().mockResolvedValue(mockConfidenceMetrics),
        identifyLearningPatterns: jest.fn().mockResolvedValue(mockLearningPattern),
      });

      const dailyData = await srsService.getDailyReviewData();

      expect(dailyData.recommendations.length).toBeGreaterThan(0);
      
      // Should recommend handling heavy load
      const heavyLoadRec = dailyData.recommendations.find(r => r.type === 'adjust_schedule');
      expect(heavyLoadRec).toBeDefined();
      expect(heavyLoadRec?.priority).toBe('high');

      // Should recommend focusing on weak areas
      const weakAreasRec = dailyData.recommendations.find(r => r.type === 'focus_category');
      expect(weakAreasRec).toBeDefined();

      // Should recommend handling leech cards
      const leechRec = dailyData.recommendations.find(r => r.type === 'review_leech_cards');
      expect(leechRec).toBeDefined();
      expect(leechRec?.priority).toBe('high');

      // Should recommend taking a break due to declining confidence
      const breakRec = dailyData.recommendations.find(r => r.type === 'take_break');
      expect(breakRec).toBeDefined();

      // Should recommend algorithm change due to low retention
      const algorithmRec = dailyData.recommendations.find(r => r.type === 'change_algorithm');
      expect(algorithmRec).toBeDefined();
    });
  });

  describe('Flashcard Generation Integration', () => {
    it('should generate flashcards and integrate with SRS system', async () => {
      const mockLesson = {
        id: 'lesson-1',
        moduleId: 'module-1',
        title: 'AWS Services',
        slug: 'aws-services',
        content: 'Amazon S3 is a storage service...',
        htmlContent: '<p>Amazon S3 is a storage service...</p>',
        frontmatter: {},
        order: 1,
        estimatedReadTime: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        module: {
          id: 'module-1',
          slug: 'storage',
          title: 'Storage Services',
        },
        terms: [
          {
            id: 'term-1',
            term: 'Amazon S3',
            definition: 'Simple Storage Service for object storage',
            category: 'AWS_SERVICE',
            difficulty: 'BEGINNER',
          },
        ],
      };

      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.card.findFirst.mockResolvedValue(null); // No existing cards
      mockPrisma.card.create.mockResolvedValue({
        id: 'new-card-1',
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is Amazon S3?',
        back: 'Simple Storage Service for object storage',
        hint: 'This is an AWS service in the storage category',
        difficulty: 'BEGINNER',
        tags: ['storage', 'AWS_SERVICE', 'BEGINNER'],
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await srsService.generateFlashcards('lesson-1');

      expect(result.generated).toBeGreaterThan(0);
      expect(result.cards).toHaveLength(result.generated);
      expect(mockPrisma.card.create).toHaveBeenCalled();

      // Verify the created card can be used in SRS system
      const createdCard = mockPrisma.card.create.mock.calls[0][0].data;
      expect(createdCard.interval).toBe(1);
      expect(createdCard.easeFactor).toBe(2.5);
      expect(createdCard.repetitions).toBe(0);
      expect(createdCard.nextReview).toBeInstanceOf(Date);
    });
  });

  describe('Algorithm Switching Integration', () => {
    it('should handle algorithm changes and log them', async () => {
      mockPrisma.learningSession.create.mockResolvedValue({
        id: 'log-session',
        userId,
        startTime: new Date(),
        endTime: new Date(),
        xpEarned: 0,
        activities: [{
          type: 'algorithm_change',
          algorithm: 'FSRS',
          timestamp: new Date().toISOString(),
        }],
      });

      await srsService.changeAlgorithm('FSRS');

      expect(mockPrisma.learningSession.create).toHaveBeenCalledWith({
        data: {
          userId,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          xpEarned: 0,
          activities: [{
            type: 'algorithm_change',
            algorithm: 'FSRS',
            timestamp: expect.any(String),
          }],
        },
      });

      const settings = srsService.getSettings();
      expect(settings.algorithm).toBe('FSRS');
    });
  });

  describe('Leech Card Handling Integration', () => {
    it('should identify and handle leech cards appropriately', async () => {
      const mockLeechCards = [
        {
          id: 'leech-1',
          front: 'Difficult concept 1',
          reviewCount: 20,
          averageConfidence: 4.5,
        },
        {
          id: 'leech-2',
          front: 'Difficult concept 2',
          reviewCount: 10,
          averageConfidence: 4.0,
        },
      ];

      jest.spyOn(srsService as any, 'confidenceTracker').mockReturnValue({
        getCardsNeedingIntervention: jest.fn().mockResolvedValue({
          leechCards: mockLeechCards,
          overconfidentCards: [],
          underconfidentCards: [],
        }),
      });

      jest.spyOn(srsService as any, 'scheduler').mockReturnValue({
        suspendCard: jest.fn().mockResolvedValue(undefined),
        resetLeechCard: jest.fn().mockResolvedValue(undefined),
      });

      const result = await srsService.handleLeechCards();

      expect(result.suspended).toBe(1); // Card with 20 reviews should be suspended
      expect(result.reset).toBe(1); // Card with 10 reviews should be reset
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]).toContain('Suspended');
      expect(result.recommendations[1]).toContain('Reset');
    });
  });

  describe('SRS Statistics Integration', () => {
    it('should provide comprehensive SRS statistics', async () => {
      const mockCards = [
        {
          id: 'card-1',
          interval: 1,
          nextReview: new Date(),
          reviews: [{ userId, ease: 3 }],
        },
        {
          id: 'card-2',
          interval: 25,
          nextReview: new Date(Date.now() + 86400000), // Tomorrow
          reviews: [{ userId, ease: 3 }, { userId, ease: 4 }],
        },
        {
          id: 'card-3',
          interval: 1,
          nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2), // 2 years (suspended)
          reviews: [{ userId, ease: 1 }, { userId, ease: 1 }],
        },
      ];

      const mockReviews = [
        { ease: 3, card: { difficulty: 'BEGINNER', interval: 5 } },
        { ease: 4, card: { difficulty: 'INTERMEDIATE', interval: 10 } },
        { ease: 1, card: { difficulty: 'ADVANCED', interval: 1 } },
      ];

      const mockRetentionMetrics = {
        overallRetention: 75,
        retentionByDifficulty: {},
        averageInterval: 7.5,
        totalReviews: 3,
        leechCardCount: 0,
      };

      mockPrisma.card.findMany.mockResolvedValue(mockCards as any);
      mockPrisma.cardReview.findMany.mockResolvedValue(mockReviews as any);

      jest.spyOn(srsService as any, 'scheduler').mockReturnValue({
        calculateRetention: jest.fn().mockResolvedValue(mockRetentionMetrics),
      });

      const stats = await srsService.getSRSStats();

      expect(stats.totalCards).toBe(3);
      expect(stats.newCards).toBe(0); // All cards have reviews
      expect(stats.learningCards).toBe(1); // Card with interval < 21
      expect(stats.reviewCards).toBe(1); // Card with interval >= 21
      expect(stats.suspendedCards).toBe(1); // Card with far future review date
      expect(stats.retentionRate).toBe(75);
      expect(stats.averageInterval).toBe(7.5);
      expect(stats.dailyReviewLoad).toBe(2); // Cards due today/tomorrow
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors appropriately', async () => {
      await expect(
        srsService.reviewCard('card-1', EaseRating.GOOD, 30, 6) // Invalid confidence
      ).rejects.toThrow('Confidence must be between 1 and 5');

      await expect(
        srsService.reviewCard('card-1', 5 as EaseRating, 30, 3) // Invalid ease
      ).rejects.toThrow('Ease must be between 1 and 4');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.card.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        srsService.reviewCard('card-1', EaseRating.GOOD, 30, 3)
      ).rejects.toThrow('Database connection failed');
    });
  });
});