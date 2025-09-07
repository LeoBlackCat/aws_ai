/**
 * SpacedRepetitionService - Main service integrating SRS scheduling, flashcard generation, and confidence tracking
 * Provides a unified interface for the complete spaced repetition system
 */

import SRSScheduler, { SRSAlgorithm, EaseRating, ReviewSession, RetentionMetrics } from './SRSScheduler';
import FlashcardGenerator, { GenerationOptions, GenerationResult } from './FlashcardGenerator';
import ConfidenceTracker, { ConfidenceMetrics, LearningPattern } from './ConfidenceTracker';
import { Card, CardReview, Term, Lesson, User } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface DailyReviewData {
  session: ReviewSession;
  confidenceMetrics: ConfidenceMetrics;
  learningPattern: LearningPattern;
  recommendations: StudyRecommendation[];
}

export interface StudyRecommendation {
  type: 'focus_category' | 'change_algorithm' | 'adjust_schedule' | 'review_leech_cards' | 'take_break';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  data?: any;
}

export interface ReviewResult {
  cardId: string;
  ease: EaseRating;
  timeSpent: number;
  confidence: number;
  nextReview: Date;
  interval: number;
  wasCorrect: boolean;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  cardsReviewed: number;
  newCardsLearned: number;
  averageEase: number;
  averageConfidence: number;
  totalTimeSpent: number;
  xpEarned: number;
}

export interface SRSStats {
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

class SpacedRepetitionService {
  private scheduler: SRSScheduler;
  private generator: FlashcardGenerator;
  private confidenceTracker: ConfidenceTracker;

  constructor(private userId: string) {
    this.scheduler = new SRSScheduler(userId);
    this.generator = new FlashcardGenerator();
    this.confidenceTracker = new ConfidenceTracker(userId);
  }

  /**
   * Get comprehensive daily review data
   */
  async getDailyReviewData(): Promise<DailyReviewData> {
    const [session, confidenceMetrics, learningPattern] = await Promise.all([
      this.scheduler.getDailyReview(),
      this.confidenceTracker.getConfidenceMetrics(),
      this.confidenceTracker.identifyLearningPatterns()
    ]);

    const recommendations = await this.generateRecommendations(
      session, 
      confidenceMetrics, 
      learningPattern
    );

    return {
      session,
      confidenceMetrics,
      learningPattern,
      recommendations
    };
  }

  /**
   * Start a new study session
   */
  async startStudySession(): Promise<StudySession> {
    const session = await prisma.learningSession.create({
      data: {
        userId: this.userId,
        startTime: new Date(),
        xpEarned: 0,
        activities: []
      }
    });

    return {
      id: session.id,
      userId: this.userId,
      startTime: session.startTime,
      cardsReviewed: 0,
      newCardsLearned: 0,
      averageEase: 0,
      averageConfidence: 0,
      totalTimeSpent: 0,
      xpEarned: 0
    };
  }

  /**
   * Review a card and update SRS data
   */
  async reviewCard(
    cardId: string,
    ease: EaseRating,
    timeSpent: number,
    confidence: number,
    sessionId?: string
  ): Promise<ReviewResult> {
    // Validate inputs
    if (confidence < 1 || confidence > 5) {
      throw new Error('Confidence must be between 1 and 5');
    }

    if (ease < 1 || ease > 4) {
      throw new Error('Ease must be between 1 and 4');
    }

    // Schedule the card using SRS algorithm
    const scheduleResult = await this.scheduler.scheduleCard(cardId, ease, timeSpent, confidence);

    // Update confidence tracking
    await this.confidenceTracker.updateConfidenceTracking(cardId, confidence, ease);

    // Update session if provided
    if (sessionId) {
      await this.updateStudySession(sessionId, ease, confidence, timeSpent);
    }

    // Award XP for the review
    const xpEarned = this.calculateReviewXP(ease, confidence, timeSpent);
    await this.awardXP(xpEarned);

    return {
      cardId,
      ease,
      timeSpent,
      confidence,
      nextReview: scheduleResult.nextReview,
      interval: scheduleResult.interval,
      wasCorrect: ease >= 3
    };
  }

  /**
   * Generate flashcards for a lesson
   */
  async generateFlashcards(
    lessonId: string,
    options?: Partial<GenerationOptions>
  ): Promise<GenerationResult> {
    const defaultOptions: GenerationOptions = {
      includeBasicCards: true,
      includeClozeCards: true,
      includeReverseCards: true,
      maxCardsPerLesson: 30
    };

    const finalOptions = { ...defaultOptions, ...options };
    return await this.generator.generateFromLesson(lessonId, finalOptions);
  }

  /**
   * Generate flashcards for an entire course
   */
  async generateCourseFlashcards(
    courseId: string,
    options?: Partial<GenerationOptions>
  ): Promise<GenerationResult> {
    return await this.generator.generateForCourse(courseId, options as any);
  }

  /**
   * Get SRS statistics for the user
   */
  async getSRSStats(): Promise<SRSStats> {
    const [cards, reviews, retentionMetrics] = await Promise.all([
      prisma.card.findMany({
        where: {
          reviews: {
            some: {
              userId: this.userId
            }
          }
        },
        include: {
          reviews: {
            where: { userId: this.userId },
            orderBy: { reviewedAt: 'desc' }
          }
        }
      }),
      prisma.cardReview.findMany({
        where: { userId: this.userId },
        orderBy: { reviewedAt: 'desc' },
        take: 100
      }),
      this.scheduler.calculateRetention()
    ]);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Categorize cards
    const newCards = cards.filter(card => card.reviews.length === 0).length;
    const learningCards = cards.filter(card => 
      card.reviews.length > 0 && card.interval < 21
    ).length;
    const reviewCards = cards.filter(card => 
      card.reviews.length > 0 && card.interval >= 21
    ).length;
    const suspendedCards = cards.filter(card => {
      const nextReview = new Date(card.nextReview);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return nextReview > oneYearFromNow;
    }).length;

    // Count leech cards
    const leechCards = cards.filter(card => {
      const recentReviews = card.reviews.slice(0, 8);
      const failedReviews = recentReviews.filter(review => review.ease === 1);
      return failedReviews.length >= 4;
    }).length;

    // Calculate daily review load
    const dailyReviewLoad = cards.filter(card => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= tomorrow;
    }).length;

    return {
      totalCards: cards.length,
      newCards,
      learningCards,
      reviewCards,
      suspendedCards,
      leechCards,
      retentionRate: retentionMetrics.overallRetention,
      averageInterval: retentionMetrics.averageInterval,
      dailyReviewLoad
    };
  }

  /**
   * Change SRS algorithm
   */
  async changeAlgorithm(algorithm: SRSAlgorithm): Promise<void> {
    this.scheduler.updateAlgorithm(algorithm);
    
    // Log the algorithm change
    await prisma.learningSession.create({
      data: {
        userId: this.userId,
        startTime: new Date(),
        endTime: new Date(),
        xpEarned: 0,
        activities: [{
          type: 'algorithm_change',
          algorithm: algorithm,
          timestamp: new Date().toISOString()
        }]
      }
    });
  }

  /**
   * Handle leech cards
   */
  async handleLeechCards(): Promise<{
    suspended: number;
    reset: number;
    recommendations: string[];
  }> {
    const interventionCards = await this.confidenceTracker.getCardsNeedingIntervention();
    
    let suspended = 0;
    let reset = 0;
    const recommendations: string[] = [];

    // Handle leech cards
    for (const card of interventionCards.leechCards) {
      if (card.reviewCount > 15) {
        await this.scheduler.suspendCard(card.id);
        suspended++;
        recommendations.push(`Suspended "${card.front}" - reviewed ${card.reviewCount} times with poor retention`);
      } else {
        await this.scheduler.resetLeechCard(card.id);
        reset++;
        recommendations.push(`Reset "${card.front}" - giving it a fresh start`);
      }
    }

    // Handle overconfident cards
    for (const card of interventionCards.overconfidentCards.slice(0, 5)) {
      recommendations.push(`Review "${card.front}" more carefully - you may be overconfident`);
    }

    // Handle underconfident cards
    for (const card of interventionCards.underconfidentCards.slice(0, 5)) {
      recommendations.push(`You're doing better than you think with "${card.front}" - trust yourself more`);
    }

    return {
      suspended,
      reset,
      recommendations
    };
  }

  /**
   * Get personalized study recommendations
   */
  private async generateRecommendations(
    session: ReviewSession,
    confidence: ConfidenceMetrics,
    pattern: LearningPattern
  ): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    // Check if user has too many reviews
    if (session.totalCards > 100) {
      recommendations.push({
        type: 'adjust_schedule',
        title: 'Heavy Review Load',
        description: `You have ${session.totalCards} cards due. Consider reducing daily new cards or using a different algorithm.`,
        priority: 'high',
        actionable: true,
        data: { totalCards: session.totalCards }
      });
    }

    // Check for weak categories
    if (pattern.weakCategories.length > 0) {
      recommendations.push({
        type: 'focus_category',
        title: 'Focus on Weak Areas',
        description: `You're struggling with ${pattern.weakCategories.join(', ')}. Consider spending extra time on these topics.`,
        priority: 'medium',
        actionable: true,
        data: { categories: pattern.weakCategories }
      });
    }

    // Check confidence trend
    if (confidence.confidenceTrend < -0.5) {
      recommendations.push({
        type: 'take_break',
        title: 'Declining Confidence',
        description: 'Your confidence has been declining. Consider taking a short break or reviewing fundamentals.',
        priority: 'medium',
        actionable: true
      });
    }

    // Check for leech cards
    if (session.leechCards.length > 5) {
      recommendations.push({
        type: 'review_leech_cards',
        title: 'Handle Problem Cards',
        description: `You have ${session.leechCards.length} cards that need special attention. Consider suspending or resetting them.`,
        priority: 'high',
        actionable: true,
        data: { leechCount: session.leechCards.length }
      });
    }

    // Check retention rate
    if (pattern.retentionRate < 0.7) {
      recommendations.push({
        type: 'change_algorithm',
        title: 'Consider Algorithm Change',
        description: `Your retention rate is ${(pattern.retentionRate * 100).toFixed(1)}%. You might benefit from a different SRS algorithm.`,
        priority: 'medium',
        actionable: true,
        data: { retentionRate: pattern.retentionRate }
      });
    }

    return recommendations;
  }

  /**
   * Update study session with review data
   */
  private async updateStudySession(
    sessionId: string,
    ease: EaseRating,
    confidence: number,
    timeSpent: number
  ): Promise<void> {
    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) return;

    const activities = Array.isArray(session.activities) ? session.activities : [];
    activities.push({
      type: 'card_review',
      ease,
      confidence,
      timeSpent,
      timestamp: new Date().toISOString()
    });

    await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        activities,
        xpEarned: session.xpEarned + this.calculateReviewXP(ease, confidence, timeSpent)
      }
    });
  }

  /**
   * Calculate XP earned for a review
   */
  private calculateReviewXP(ease: EaseRating, confidence: number, timeSpent: number): number {
    let baseXP = 10;

    // Bonus for correct answers
    if (ease >= 3) {
      baseXP += 5;
    }

    // Bonus for high confidence when correct
    if (ease >= 3 && confidence >= 4) {
      baseXP += 5;
    }

    // Bonus for spending appropriate time (not too fast, not too slow)
    if (timeSpent >= 5 && timeSpent <= 60) {
      baseXP += 2;
    }

    // Penalty for very fast answers (might be guessing)
    if (timeSpent < 3) {
      baseXP -= 3;
    }

    return Math.max(1, baseXP);
  }

  /**
   * Award XP to user
   */
  private async awardXP(xp: number): Promise<void> {
    await prisma.user.update({
      where: { id: this.userId },
      data: {
        totalXP: {
          increment: xp
        }
      }
    });
  }

  /**
   * End study session
   */
  async endStudySession(sessionId: string): Promise<StudySession> {
    const session = await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date()
      }
    });

    const activities = Array.isArray(session.activities) ? session.activities : [];
    const cardReviews = activities.filter(a => a && (a as any).type === 'card_review');
    
    const cardsReviewed = cardReviews.length;
    const newCardsLearned = cardReviews.filter(a => a && (a as any).ease === 1).length;
    const averageEase = cardsReviewed > 0 
      ? cardReviews.reduce((sum: number, a) => sum + ((a as any)?.ease || 0), 0) / cardsReviewed 
      : 0;
    const averageConfidence = cardsReviewed > 0 
      ? cardReviews.reduce((sum: number, a) => sum + ((a as any)?.confidence || 0), 0) / cardsReviewed 
      : 0;
    const totalTimeSpent = cardReviews.reduce((sum: number, a) => sum + ((a as any)?.timeSpent || 0), 0);

    return {
      id: session.id,
      userId: this.userId,
      startTime: session.startTime,
      endTime: session.endTime || undefined,
      cardsReviewed,
      newCardsLearned,
      averageEase,
      averageConfidence,
      totalTimeSpent,
      xpEarned: session.xpEarned
    };
  }

  /**
   * Get user's SRS settings
   */
  getSettings() {
    return this.scheduler.getSettings();
  }

  /**
   * Update user's SRS settings
   */
  updateSettings(settings: any) {
    this.scheduler.updateSettings(settings);
  }
}

export default SpacedRepetitionService;