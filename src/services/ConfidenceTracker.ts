/**
 * ConfidenceTracker - Track user confidence levels and identify learning patterns
 * Provides insights for adaptive scheduling and leech card identification
 */

import { Card, CardReview, Term, Lesson, Difficulty } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface ConfidenceMetrics {
  overallConfidence: number;
  confidenceByCategory: Record<string, number>;
  confidenceByDifficulty: Record<string, number>;
  confidenceTrend: number; // positive = improving, negative = declining
  lowConfidenceCards: CardWithConfidence[];
  highConfidenceCards: CardWithConfidence[];
}

export interface CardWithConfidence extends Card {
  term?: Term;
  lesson?: Lesson;
  averageConfidence: number;
  confidenceTrend: number;
  reviewCount: number;
  lastReview?: Date;
}

export interface ConfidenceAnalysis {
  cardId: string;
  currentConfidence: number;
  confidenceHistory: number[];
  trend: 'improving' | 'declining' | 'stable';
  volatility: number; // how much confidence varies
  recommendedAction: 'continue' | 'review_more' | 'suspend' | 'reset';
}

export interface LearningPattern {
  userId: string;
  strongCategories: string[];
  weakCategories: string[];
  optimalReviewTime: number; // hours since last review
  averageSessionLength: number; // minutes
  retentionRate: number;
  confidenceCalibration: number; // how well confidence predicts performance
}

class ConfidenceTracker {
  constructor(private userId: string) {}

  /**
   * Calculate comprehensive confidence metrics for the user
   */
  async getConfidenceMetrics(): Promise<ConfidenceMetrics> {
    const reviews = await prisma.cardReview.findMany({
      where: { userId: this.userId },
      include: {
        card: {
          include: {
            term: true,
            lesson: true
          }
        }
      },
      orderBy: { reviewedAt: 'desc' }
    });

    if (reviews.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate overall confidence
    const confidenceScores = reviews
      .filter(review => review.confidence !== null)
      .map(review => review.confidence!);
    
    const overallConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    // Calculate confidence by category
    const confidenceByCategory = this.calculateConfidenceByCategory(reviews);
    
    // Calculate confidence by difficulty
    const confidenceByDifficulty = this.calculateConfidenceByDifficulty(reviews);

    // Calculate confidence trend (last 30 days vs previous 30 days)
    const confidenceTrend = this.calculateConfidenceTrend(reviews);

    // Get low and high confidence cards
    const cardConfidenceMap = this.calculateCardConfidences(reviews);
    const lowConfidenceCards = Array.from(cardConfidenceMap.values())
      .filter(card => card.averageConfidence < 3)
      .sort((a, b) => a.averageConfidence - b.averageConfidence)
      .slice(0, 10);

    const highConfidenceCards = Array.from(cardConfidenceMap.values())
      .filter(card => card.averageConfidence >= 4)
      .sort((a, b) => b.averageConfidence - a.averageConfidence)
      .slice(0, 10);

    return {
      overallConfidence,
      confidenceByCategory,
      confidenceByDifficulty,
      confidenceTrend,
      lowConfidenceCards,
      highConfidenceCards
    };
  }

  /**
   * Analyze confidence for a specific card
   */
  async analyzeCardConfidence(cardId: string): Promise<ConfidenceAnalysis> {
    const reviews = await prisma.cardReview.findMany({
      where: {
        userId: this.userId,
        cardId: cardId
      },
      orderBy: { reviewedAt: 'asc' }
    });

    if (reviews.length === 0) {
      return {
        cardId,
        currentConfidence: 3,
        confidenceHistory: [],
        trend: 'stable',
        volatility: 0,
        recommendedAction: 'continue'
      };
    }

    const confidenceHistory = reviews
      .filter(review => review.confidence !== null)
      .map(review => review.confidence!);

    const currentConfidence = confidenceHistory.length > 0 
      ? confidenceHistory[confidenceHistory.length - 1] 
      : 3;

    const trend = this.calculateTrend(confidenceHistory);
    const volatility = this.calculateVolatility(confidenceHistory);
    const recommendedAction = this.getRecommendedAction(
      currentConfidence, 
      trend, 
      volatility, 
      reviews.length
    );

    return {
      cardId,
      currentConfidence,
      confidenceHistory,
      trend,
      volatility,
      recommendedAction
    };
  }

  /**
   * Identify learning patterns for the user
   */
  async identifyLearningPatterns(): Promise<LearningPattern> {
    const reviews = await prisma.cardReview.findMany({
      where: { userId: this.userId },
      include: {
        card: {
          include: {
            term: true,
            lesson: true
          }
        }
      },
      orderBy: { reviewedAt: 'desc' }
    });

    if (reviews.length === 0) {
      return this.getEmptyLearningPattern();
    }

    // Analyze category performance
    const categoryPerformance = this.analyzeCategoryPerformance(reviews);
    const strongCategories = Object.entries(categoryPerformance)
      .filter(([, performance]) => performance.accuracy > 0.8)
      .map(([category]) => category);
    
    const weakCategories = Object.entries(categoryPerformance)
      .filter(([, performance]) => performance.accuracy < 0.6)
      .map(([category]) => category);

    // Calculate optimal review timing
    const optimalReviewTime = this.calculateOptimalReviewTime(reviews);

    // Calculate average session length
    const averageSessionLength = this.calculateAverageSessionLength(reviews);

    // Calculate retention rate
    const retentionRate = this.calculateRetentionRate(reviews);

    // Calculate confidence calibration
    const confidenceCalibration = this.calculateConfidenceCalibration(reviews);

    return {
      userId: this.userId,
      strongCategories,
      weakCategories,
      optimalReviewTime,
      averageSessionLength,
      retentionRate,
      confidenceCalibration
    };
  }

  /**
   * Get cards that need confidence-based intervention
   */
  async getCardsNeedingIntervention(): Promise<{
    leechCards: CardWithConfidence[];
    overconfidentCards: CardWithConfidence[];
    underconfidentCards: CardWithConfidence[];
  }> {
    const reviews = await prisma.cardReview.findMany({
      where: { userId: this.userId },
      include: {
        card: {
          include: {
            term: true,
            lesson: true
          }
        }
      }
    });

    const cardConfidences = this.calculateCardConfidences(reviews);
    const cards = Array.from(cardConfidences.values());

    // Leech cards: low performance despite high confidence
    const leechCards = cards.filter(card => {
      const recentReviews = reviews
        .filter(r => r.cardId === card.id)
        .slice(-5);
      const avgEase = recentReviews.reduce((sum, r) => sum + r.ease, 0) / recentReviews.length;
      return card.averageConfidence >= 4 && avgEase < 2.5;
    });

    // Overconfident cards: high confidence but poor performance
    const overconfidentCards = cards.filter(card => {
      const recentReviews = reviews
        .filter(r => r.cardId === card.id)
        .slice(-3);
      const failureRate = recentReviews.filter(r => r.ease === 1).length / recentReviews.length;
      return card.averageConfidence >= 4 && failureRate > 0.3;
    });

    // Underconfident cards: low confidence but good performance
    const underconfidentCards = cards.filter(card => {
      const recentReviews = reviews
        .filter(r => r.cardId === card.id)
        .slice(-3);
      const successRate = recentReviews.filter(r => r.ease >= 3).length / recentReviews.length;
      return card.averageConfidence <= 2 && successRate > 0.7;
    });

    return {
      leechCards: leechCards.slice(0, 10),
      overconfidentCards: overconfidentCards.slice(0, 10),
      underconfidentCards: underconfidentCards.slice(0, 10)
    };
  }

  /**
   * Update confidence tracking after a review
   */
  async updateConfidenceTracking(
    cardId: string, 
    confidence: number, 
    ease: number
  ): Promise<void> {
    // This method can be used to trigger additional analysis
    // or update cached confidence metrics if needed
    
    // For now, we'll just ensure the confidence is within valid range
    if (confidence < 1 || confidence > 5) {
      throw new Error('Confidence must be between 1 and 5');
    }

    // Could add logic here to:
    // - Update cached metrics
    // - Trigger notifications for significant confidence changes
    // - Update adaptive scheduling parameters
  }

  // Private helper methods

  private getEmptyMetrics(): ConfidenceMetrics {
    return {
      overallConfidence: 0,
      confidenceByCategory: {},
      confidenceByDifficulty: {},
      confidenceTrend: 0,
      lowConfidenceCards: [],
      highConfidenceCards: []
    };
  }

  private calculateConfidenceByCategory(reviews: any[]): Record<string, number> {
    const categoryConfidence: Record<string, number[]> = {};

    reviews.forEach(review => {
      if (review.confidence && review.card.term) {
        const category = review.card.term.category;
        if (!categoryConfidence[category]) {
          categoryConfidence[category] = [];
        }
        categoryConfidence[category].push(review.confidence);
      }
    });

    const result: Record<string, number> = {};
    Object.entries(categoryConfidence).forEach(([category, scores]) => {
      result[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return result;
  }

  private calculateConfidenceByDifficulty(reviews: any[]): Record<string, number> {
    const difficultyConfidence: Record<string, number[]> = {};

    reviews.forEach(review => {
      if (review.confidence && review.card.difficulty) {
        const difficulty = review.card.difficulty;
        if (!difficultyConfidence[difficulty]) {
          difficultyConfidence[difficulty] = [];
        }
        difficultyConfidence[difficulty].push(review.confidence);
      }
    });

    const result: Record<string, number> = {};
    Object.entries(difficultyConfidence).forEach(([difficulty, scores]) => {
      result[difficulty] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return result;
  }

  private calculateConfidenceTrend(reviews: any[]): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentReviews = reviews.filter(r => 
      r.confidence && new Date(r.reviewedAt) >= thirtyDaysAgo
    );
    
    const olderReviews = reviews.filter(r => 
      r.confidence && 
      new Date(r.reviewedAt) >= sixtyDaysAgo && 
      new Date(r.reviewedAt) < thirtyDaysAgo
    );

    if (recentReviews.length === 0 || olderReviews.length === 0) {
      return 0;
    }

    const recentAvg = recentReviews.reduce((sum, r) => sum + r.confidence, 0) / recentReviews.length;
    const olderAvg = olderReviews.reduce((sum, r) => sum + r.confidence, 0) / olderReviews.length;

    return recentAvg - olderAvg;
  }

  private calculateCardConfidences(reviews: any[]): Map<string, CardWithConfidence> {
    const cardMap = new Map<string, CardWithConfidence>();

    reviews.forEach(review => {
      const cardId = review.cardId;
      
      if (!cardMap.has(cardId)) {
        cardMap.set(cardId, {
          ...review.card,
          averageConfidence: 0,
          confidenceTrend: 0,
          reviewCount: 0,
          lastReview: undefined
        });
      }

      const card = cardMap.get(cardId)!;
      card.reviewCount++;
      
      if (review.confidence) {
        const confidences = reviews
          .filter(r => r.cardId === cardId && r.confidence)
          .map(r => r.confidence);
        
        card.averageConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
        card.confidenceTrend = this.calculateTrendValue(confidences);
      }

      if (!card.lastReview || new Date(review.reviewedAt) > card.lastReview) {
        card.lastReview = new Date(review.reviewedAt);
      }
    });

    return cardMap;
  }

  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-3);
    const older = values.slice(-6, -3);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;

    const diff = recentAvg - olderAvg;

    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  private calculateTrendValue(values: number[]): number {
    if (values.length < 2) return 0;

    const recent = values.slice(-Math.min(3, values.length));
    const older = values.slice(0, Math.min(3, values.length));

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;

    return recentAvg - olderAvg;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private getRecommendedAction(
    confidence: number, 
    trend: string, 
    volatility: number, 
    reviewCount: number
  ): 'continue' | 'review_more' | 'suspend' | 'reset' {
    // Low confidence cards need more review
    if (confidence <= 2) {
      return 'review_more';
    }

    // High volatility suggests confusion
    if (volatility > 1.5) {
      return 'review_more';
    }

    // Declining trend with many reviews might need reset
    if (trend === 'declining' && reviewCount > 10) {
      return 'reset';
    }

    // Very high confidence cards can be suspended
    if (confidence >= 4.5 && trend !== 'declining') {
      return 'suspend';
    }

    return 'continue';
  }

  private getEmptyLearningPattern(): LearningPattern {
    return {
      userId: this.userId,
      strongCategories: [],
      weakCategories: [],
      optimalReviewTime: 24,
      averageSessionLength: 15,
      retentionRate: 0,
      confidenceCalibration: 0
    };
  }

  private analyzeCategoryPerformance(reviews: any[]): Record<string, { accuracy: number; confidence: number }> {
    const categoryStats: Record<string, { correct: number; total: number; confidenceSum: number }> = {};

    reviews.forEach(review => {
      if (review.card.term) {
        const category = review.card.term.category;
        if (!categoryStats[category]) {
          categoryStats[category] = { correct: 0, total: 0, confidenceSum: 0 };
        }

        categoryStats[category].total++;
        if (review.ease >= 3) {
          categoryStats[category].correct++;
        }
        if (review.confidence) {
          categoryStats[category].confidenceSum += review.confidence;
        }
      }
    });

    const result: Record<string, { accuracy: number; confidence: number }> = {};
    Object.entries(categoryStats).forEach(([category, stats]) => {
      result[category] = {
        accuracy: stats.correct / stats.total,
        confidence: stats.confidenceSum / stats.total
      };
    });

    return result;
  }

  private calculateOptimalReviewTime(reviews: any[]): number {
    // Analyze when reviews are most successful
    const hourlySuccess: Record<number, { success: number; total: number }> = {};

    reviews.forEach(review => {
      const hour = new Date(review.reviewedAt).getHours();
      if (!hourlySuccess[hour]) {
        hourlySuccess[hour] = { success: 0, total: 0 };
      }

      hourlySuccess[hour].total++;
      if (review.ease >= 3) {
        hourlySuccess[hour].success++;
      }
    });

    let bestHour = 12; // default to noon
    let bestSuccessRate = 0;

    Object.entries(hourlySuccess).forEach(([hour, stats]) => {
      const successRate = stats.success / stats.total;
      if (successRate > bestSuccessRate && stats.total >= 5) {
        bestSuccessRate = successRate;
        bestHour = parseInt(hour);
      }
    });

    return bestHour;
  }

  private calculateAverageSessionLength(reviews: any[]): number {
    // Group reviews by session (within 1 hour of each other)
    const sessions: Date[][] = [];
    let currentSession: Date[] = [];

    reviews.forEach(review => {
      const reviewTime = new Date(review.reviewedAt);
      
      if (currentSession.length === 0) {
        currentSession.push(reviewTime);
      } else {
        const lastReview = currentSession[currentSession.length - 1];
        const timeDiff = reviewTime.getTime() - lastReview.getTime();
        
        if (timeDiff <= 60 * 60 * 1000) { // 1 hour
          currentSession.push(reviewTime);
        } else {
          sessions.push([...currentSession]);
          currentSession = [reviewTime];
        }
      }
    });

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    if (sessions.length === 0) return 15; // default

    const sessionLengths = sessions.map(session => {
      if (session.length <= 1) return 5; // minimum session length
      const start = session[0];
      const end = session[session.length - 1];
      return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    });

    return sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length;
  }

  private calculateRetentionRate(reviews: any[]): number {
    const successfulReviews = reviews.filter(review => review.ease >= 3);
    return reviews.length > 0 ? successfulReviews.length / reviews.length : 0;
  }

  private calculateConfidenceCalibration(reviews: any[]): number {
    // How well does confidence predict performance?
    const confidencePerformance: Array<{ confidence: number; success: boolean }> = [];

    reviews.forEach(review => {
      if (review.confidence) {
        confidencePerformance.push({
          confidence: review.confidence,
          success: review.ease >= 3
        });
      }
    });

    if (confidencePerformance.length === 0) return 0;

    // Calculate correlation between confidence and success
    const n = confidencePerformance.length;
    const sumX = confidencePerformance.reduce((sum, item) => sum + item.confidence, 0);
    const sumY = confidencePerformance.reduce((sum, item) => sum + (item.success ? 1 : 0), 0);
    const sumXY = confidencePerformance.reduce((sum, item) => sum + item.confidence * (item.success ? 1 : 0), 0);
    const sumX2 = confidencePerformance.reduce((sum, item) => sum + item.confidence * item.confidence, 0);
    const sumY2 = confidencePerformance.reduce((sum, item) => sum + (item.success ? 1 : 0), 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return isNaN(correlation) ? 0 : correlation;
  }
}

export default ConfidenceTracker;