/**
 * SRSScheduler - Spaced Repetition System with multiple algorithms
 * Supports SM-2, Leitner Box, and FSRS algorithms for optimal learning retention
 */

import { Card, CardReview, Term, Lesson } from '@prisma/client';
import { prisma } from '../lib/prisma';

// SRS Algorithm types
export type SRSAlgorithm = 'SM2' | 'LEITNER' | 'FSRS';

// Ease ratings (standard SRS scale)
export enum EaseRating {
  AGAIN = 1,    // Complete blackout, incorrect response
  HARD = 2,     // Incorrect response, but remembered upon seeing answer
  GOOD = 3,     // Correct response with some hesitation
  EASY = 4      // Perfect response
}

// Card scheduling interfaces
export interface ScheduleResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: Date;
  algorithm: string;
}

export interface ReviewSession {
  newCards: CardWithDetails[];
  reviewCards: CardWithDetails[];
  leechCards: CardWithDetails[];
  totalCards: number;
  estimatedTime: number;
}

export interface CardWithDetails extends Card {
  term?: Term | null;
  lesson?: Lesson | null;
  reviews: CardReview[];
  isLeech?: boolean;
  daysSinceLastReview?: number;
}

export interface RetentionMetrics {
  overallRetention: number;
  retentionByDifficulty: Record<string, number>;
  averageInterval: number;
  totalReviews: number;
  leechCardCount: number;
}

export interface SRSSettings {
  algorithm: SRSAlgorithm;
  maxNewCardsPerDay: number;
  maxReviewsPerDay: number;
  leechThreshold: number;
  graduatingInterval: number;
  easyInterval: number;
  intervalModifier: number;
}

// FSRS algorithm parameters
interface FSRSParameters {
  w: number[]; // 17 parameters for FSRS algorithm
}

// Leitner Box configuration
interface LeitnerBoxConfig {
  boxes: number[];
  intervals: number[]; // days for each box
}

class SRSScheduler {
  private defaultSettings: SRSSettings = {
    algorithm: 'SM2',
    maxNewCardsPerDay: 20,
    maxReviewsPerDay: 200,
    leechThreshold: 8,
    graduatingInterval: 1,
    easyInterval: 4,
    intervalModifier: 1.0
  };

  private fsrsParameters: FSRSParameters = {
    // Default FSRS parameters (can be personalized later)
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
  };

  private leitnerConfig: LeitnerBoxConfig = {
    boxes: [1, 2, 3, 4, 5],
    intervals: [1, 3, 7, 14, 30] // days
  };

  constructor(private userId: string, private settings?: Partial<SRSSettings>) {
    if (settings) {
      this.defaultSettings = { ...this.defaultSettings, ...settings };
    }
  }

  /**
   * Schedule a card after review using the specified algorithm
   */
  async scheduleCard(
    cardId: string, 
    ease: EaseRating, 
    timeSpent: number,
    confidence?: number
  ): Promise<ScheduleResult> {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { reviews: { orderBy: { reviewedAt: 'desc' } } }
    });

    if (!card) {
      throw new Error(`Card with id ${cardId} not found`);
    }

    let result: ScheduleResult;

    switch (this.defaultSettings.algorithm) {
      case 'SM2':
        result = this.scheduleSM2(card, ease);
        break;
      case 'LEITNER':
        result = this.scheduleLeitner(card, ease);
        break;
      case 'FSRS':
        result = this.scheduleFSRS(card, ease, timeSpent);
        break;
      default:
        result = this.scheduleSM2(card, ease);
    }

    // Update card in database
    await prisma.card.update({
      where: { id: cardId },
      data: {
        interval: result.interval,
        easeFactor: result.easeFactor,
        repetitions: result.repetitions,
        nextReview: result.nextReview,
        updatedAt: new Date()
      }
    });

    // Record the review
    await prisma.cardReview.create({
      data: {
        userId: this.userId,
        cardId,
        ease,
        timeSpent,
        confidence,
        algorithm: result.algorithm,
        reviewedAt: new Date()
      }
    });

    return result;
  }

  /**
   * SM-2 Algorithm implementation
   */
  private scheduleSM2(card: Card, ease: EaseRating): ScheduleResult {
    let { interval, easeFactor, repetitions } = card;
    
    if (ease === EaseRating.AGAIN) {
      // Reset card
      repetitions = 0;
      interval = 1;
    } else {
      repetitions += 1;
      
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      
      // Update ease factor based on SM-2 algorithm
      easeFactor = easeFactor + (0.1 - (5 - ease) * (0.08 + (5 - ease) * 0.02));
      easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor
    }

    // Apply interval modifier
    interval = Math.round(interval * this.defaultSettings.intervalModifier);
    interval = Math.max(1, interval); // Minimum 1 day

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      interval,
      easeFactor,
      repetitions,
      nextReview,
      algorithm: 'SM2'
    };
  }

  /**
   * Leitner Box Algorithm implementation
   */
  private scheduleLeitner(card: Card, ease: EaseRating): ScheduleResult {
    let currentBox = Math.min(card.repetitions, this.leitnerConfig.boxes.length - 1);
    
    if (ease === EaseRating.AGAIN || ease === EaseRating.HARD) {
      // Move back to box 1
      currentBox = 0;
    } else if (ease === EaseRating.GOOD || ease === EaseRating.EASY) {
      // Move to next box
      currentBox = Math.min(currentBox + 1, this.leitnerConfig.boxes.length - 1);
    }

    const interval = this.leitnerConfig.intervals[currentBox];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      interval,
      easeFactor: card.easeFactor, // Leitner doesn't use ease factor
      repetitions: currentBox,
      nextReview,
      algorithm: 'LEITNER'
    };
  }

  /**
   * FSRS Algorithm implementation (simplified version)
   */
  private scheduleFSRS(card: Card, ease: EaseRating, timeSpent: number): ScheduleResult {
    const { w } = this.fsrsParameters;
    
    // Calculate stability and difficulty (simplified FSRS)
    let stability = card.interval;
    let difficulty = 5 - card.easeFactor; // Convert ease factor to difficulty
    
    // Update difficulty based on rating
    const difficultyChange = w[6] * (ease - 3);
    difficulty = Math.max(1, Math.min(10, difficulty + difficultyChange));
    
    // Calculate new stability based on rating and previous stability
    if (ease === EaseRating.AGAIN) {
      stability = w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, w[13]) - 1) * Math.exp(w[14] * (1 - ease));
    } else {
      stability = stability * (1 + Math.exp(w[8]) * (11 - difficulty) * Math.pow(stability, -w[9]) * (Math.exp((1 - ease) * w[10]) - 1));
    }
    
    // Calculate interval from stability
    const interval = Math.max(1, Math.round(stability));
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      interval,
      easeFactor: 5 - difficulty, // Convert back to ease factor
      repetitions: card.repetitions + 1,
      nextReview,
      algorithm: 'FSRS'
    };
  }

  /**
   * Get daily review queue for user
   */
  async getDailyReview(): Promise<ReviewSession> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get cards due for review
    const reviewCards = await prisma.card.findMany({
      where: {
        reviews: {
          some: {
            userId: this.userId
          }
        },
        nextReview: {
          lte: tomorrow
        }
      },
      include: {
        term: true,
        lesson: true,
        reviews: {
          where: { userId: this.userId },
          orderBy: { reviewedAt: 'desc' }
        }
      },
      take: this.defaultSettings.maxReviewsPerDay
    });

    // Get new cards (never reviewed by this user)
    const newCards = await prisma.card.findMany({
      where: {
        NOT: {
          reviews: {
            some: {
              userId: this.userId
            }
          }
        }
      },
      include: {
        term: true,
        lesson: true,
        reviews: true
      },
      take: this.defaultSettings.maxNewCardsPerDay
    });

    // Identify leech cards
    const leechCards = reviewCards.filter(card => this.isLeechCard(card as any));

    // Calculate estimated time (average 30 seconds per card)
    const totalCards = reviewCards.length + newCards.length;
    const estimatedTime = totalCards * 30; // seconds

    return {
      newCards: newCards as CardWithDetails[],
      reviewCards: reviewCards.filter(card => card.term && !this.isLeechCard(card)) as CardWithDetails[],
      leechCards: leechCards as CardWithDetails[],
      totalCards,
      estimatedTime
    };
  }

  /**
   * Check if a card is a leech (failed too many times)
   */
  private isLeechCard(card: CardWithDetails): boolean {
    const recentReviews = card.reviews.slice(0, this.defaultSettings.leechThreshold);
    const failedReviews = recentReviews.filter(review => review.ease === EaseRating.AGAIN);
    
    return failedReviews.length >= this.defaultSettings.leechThreshold / 2;
  }

  /**
   * Calculate retention metrics for the user
   */
  async calculateRetention(): Promise<RetentionMetrics> {
    const reviews = await prisma.cardReview.findMany({
      where: { userId: this.userId },
      include: { card: true },
      orderBy: { reviewedAt: 'desc' }
    });

    if (reviews.length === 0) {
      return {
        overallRetention: 0,
        retentionByDifficulty: {},
        averageInterval: 0,
        totalReviews: 0,
        leechCardCount: 0
      };
    }

    // Calculate overall retention (percentage of non-AGAIN reviews)
    const successfulReviews = reviews.filter(review => review.ease !== EaseRating.AGAIN);
    const overallRetention = (successfulReviews.length / reviews.length) * 100;

    // Calculate retention by difficulty
    const retentionByDifficulty: Record<string, number> = {};
    const difficultyGroups = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    
    difficultyGroups.forEach(difficulty => {
      const difficultyReviews = reviews.filter(review => review.card.difficulty === difficulty);
      if (difficultyReviews.length > 0) {
        const successfulDifficultyReviews = difficultyReviews.filter(review => review.ease !== EaseRating.AGAIN);
        retentionByDifficulty[difficulty] = (successfulDifficultyReviews.length / difficultyReviews.length) * 100;
      }
    });

    // Calculate average interval
    const intervals = reviews.map(review => review.card.interval);
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    // Count leech cards
    const uniqueCards = Array.from(new Set(reviews.map(review => review.cardId)));
    let leechCardCount = 0;
    
    for (const cardId of uniqueCards) {
      const cardReviews = reviews.filter(review => review.cardId === cardId);
      const card = { ...cardReviews[0].card, reviews: cardReviews } as CardWithDetails;
      if (this.isLeechCard(card)) {
        leechCardCount++;
      }
    }

    return {
      overallRetention,
      retentionByDifficulty,
      averageInterval,
      totalReviews: reviews.length,
      leechCardCount
    };
  }

  /**
   * Update SRS algorithm for user
   */
  updateAlgorithm(algorithm: SRSAlgorithm): void {
    this.defaultSettings.algorithm = algorithm;
  }

  /**
   * Get algorithm-specific settings
   */
  getSettings(): SRSSettings {
    return { ...this.defaultSettings };
  }

  /**
   * Update SRS settings
   */
  updateSettings(settings: Partial<SRSSettings>): void {
    this.defaultSettings = { ...this.defaultSettings, ...settings };
  }

  /**
   * Reset a leech card (move back to beginning)
   */
  async resetLeechCard(cardId: string): Promise<void> {
    await prisma.card.update({
      where: { id: cardId },
      data: {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Suspend a card (remove from review queue)
   */
  async suspendCard(cardId: string): Promise<void> {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);
    
    await prisma.card.update({
      where: { id: cardId },
      data: {
        nextReview: farFuture,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Unsuspend a card (add back to review queue)
   */
  async unsuspendCard(cardId: string): Promise<void> {
    await prisma.card.update({
      where: { id: cardId },
      data: {
        nextReview: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

export default SRSScheduler;