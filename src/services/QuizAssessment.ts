/**
 * QuizAssessment - Comprehensive quiz grading and performance analysis service
 * Provides detailed feedback, performance tracking, and adaptive recommendations
 */

import { QuizQuestion, QuizAttempt, UserAnswer, QuizFeedback } from './QuizGenerator';

export interface PerformanceMetrics {
  overallAccuracy: number;
  categoryAccuracy: Record<string, number>;
  difficultyAccuracy: Record<string, number>;
  timeEfficiency: number;
  confidenceCalibration: number;
  improvementTrend: number;
  consistencyScore: number;
}

export interface DetailedFeedback {
  strengths: StrengthArea[];
  weaknesses: WeaknessArea[];
  recommendations: Recommendation[];
  nextSteps: NextStep[];
  studyPlan: StudyPlan;
}

export interface StrengthArea {
  category: string;
  accuracy: number;
  description: string;
  examples: string[];
}

export interface WeaknessArea {
  category: string;
  accuracy: number;
  description: string;
  commonMistakes: string[];
  improvementActions: string[];
}

export interface Recommendation {
  type: 'study' | 'practice' | 'review' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedTime: number;
  resources: string[];
}

export interface NextStep {
  action: string;
  description: string;
  timeframe: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyPlan {
  totalEstimatedHours: number;
  weeklyGoals: WeeklyGoal[];
  focusAreas: string[];
  milestones: Milestone[];
}

export interface WeeklyGoal {
  week: number;
  topics: string[];
  practiceQuestions: number;
  estimatedHours: number;
  objectives: string[];
}

export interface Milestone {
  title: string;
  description: string;
  targetDate: Date;
  criteria: string[];
}

export interface PerformanceHistory {
  attempts: QuizAttempt[];
  trends: PerformanceTrend[];
  achievements: Achievement[];
  streaks: StreakData;
}

export interface PerformanceTrend {
  category: string;
  dataPoints: { date: Date; score: number }[];
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: Date;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakType: 'daily' | 'weekly' | 'perfect_scores';
  lastActivity: Date;
}

export interface CertificationReadiness {
  overallReadiness: number;
  domainReadiness: Record<string, number>;
  estimatedPassProbability: number;
  recommendedStudyTime: number;
  weakestDomains: string[];
  readinessLevel: 'not-ready' | 'needs-work' | 'almost-ready' | 'ready';
}

class QuizAssessment {
  private performanceHistory: Map<string, PerformanceHistory> = new Map();
  private certificationDomains: Record<string, string[]> = {};
  private passingThresholds: Record<string, number> = {};

  constructor() {
    this.initializeCertificationDomains();
    this.initializePassingThresholds();
  }

  /**
   * Grade a quiz attempt with comprehensive analysis
   */
  gradeQuizAttempt(attempt: Omit<QuizAttempt, 'score' | 'feedback'>): QuizAttempt {
    const { questions, answers, userId } = attempt;
    
    // Calculate basic scores
    const basicGrading = this.calculateBasicScores(questions, answers);
    
    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(questions, answers, attempt.timeSpent);
    
    // Generate detailed feedback
    const detailedFeedback = this.generateDetailedFeedback(
      questions,
      answers,
      metrics,
      this.getUserHistory(userId)
    );
    
    // Update performance history
    this.updatePerformanceHistory(userId, {
      ...attempt,
      score: basicGrading.overallScore,
      feedback: this.convertToQuizFeedback(detailedFeedback, basicGrading)
    });

    return {
      ...attempt,
      score: basicGrading.overallScore,
      feedback: this.convertToQuizFeedback(detailedFeedback, basicGrading)
    };
  }

  /**
   * Calculate basic scoring metrics
   */
  private calculateBasicScores(questions: QuizQuestion[], answers: UserAnswer[]) {
    let correctAnswers = 0;
    const categoryScores: Record<string, { correct: number; total: number }> = {};
    const difficultyScores: Record<string, { correct: number; total: number }> = {};
    const incorrectQuestions: QuizQuestion[] = [];

    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      // Initialize tracking
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = { correct: 0, total: 0 };
      }
      if (!difficultyScores[question.difficulty]) {
        difficultyScores[question.difficulty] = { correct: 0, total: 0 };
      }

      categoryScores[question.category].total++;
      difficultyScores[question.difficulty].total++;

      // Check correctness
      const isCorrect = this.isAnswerCorrect(question, answer.answer);
      answer.isCorrect = isCorrect;

      if (isCorrect) {
        correctAnswers++;
        categoryScores[question.category].correct++;
        difficultyScores[question.difficulty].correct++;
      } else {
        incorrectQuestions.push(question);
      }
    });

    const overallScore = (correctAnswers / questions.length) * 100;

    return {
      overallScore,
      categoryScores,
      difficultyScores,
      incorrectQuestions,
      correctAnswers,
      totalQuestions: questions.length
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics(
    questions: QuizQuestion[],
    answers: UserAnswer[],
    totalTime: number
  ): PerformanceMetrics {
    const basicScores = this.calculateBasicScores(questions, answers);
    
    // Calculate category accuracy
    const categoryAccuracy: Record<string, number> = {};
    Object.entries(basicScores.categoryScores).forEach(([category, scores]) => {
      categoryAccuracy[category] = (scores.correct / scores.total) * 100;
    });

    // Calculate difficulty accuracy
    const difficultyAccuracy: Record<string, number> = {};
    Object.entries(basicScores.difficultyScores).forEach(([difficulty, scores]) => {
      difficultyAccuracy[difficulty] = (scores.correct / scores.total) * 100;
    });

    // Calculate time efficiency (questions per minute vs expected)
    const expectedTimePerQuestion = 60; // seconds
    const expectedTotalTime = questions.length * expectedTimePerQuestion;
    const timeEfficiency = Math.max(0, Math.min(100, (expectedTotalTime / totalTime) * 100));

    // Calculate confidence calibration
    const confidenceCalibration = this.calculateConfidenceCalibration(answers);

    return {
      overallAccuracy: basicScores.overallScore,
      categoryAccuracy,
      difficultyAccuracy,
      timeEfficiency,
      confidenceCalibration,
      improvementTrend: 0, // Will be calculated with historical data
      consistencyScore: 0   // Will be calculated with historical data
    };
  }

  /**
   * Calculate confidence calibration (how well confidence matches performance)
   */
  private calculateConfidenceCalibration(answers: UserAnswer[]): number {
    if (answers.length === 0) return 0;

    let totalCalibrationError = 0;
    
    answers.forEach(answer => {
      const confidence = answer.confidence / 5; // Normalize to 0-1
      const accuracy = answer.isCorrect ? 1 : 0;
      const calibrationError = Math.abs(confidence - accuracy);
      totalCalibrationError += calibrationError;
    });

    const averageCalibrationError = totalCalibrationError / answers.length;
    return Math.max(0, (1 - averageCalibrationError) * 100);
  }

  /**
   * Generate detailed feedback with actionable insights
   */
  private generateDetailedFeedback(
    questions: QuizQuestion[],
    answers: UserAnswer[],
    metrics: PerformanceMetrics,
    history?: PerformanceHistory
  ): DetailedFeedback {
    const strengths = this.identifyStrengths(metrics, questions, answers);
    const weaknesses = this.identifyWeaknesses(metrics, questions, answers);
    const recommendations = this.generateRecommendations(metrics, weaknesses, history);
    const nextSteps = this.generateNextSteps(metrics, weaknesses);
    const studyPlan = this.generateStudyPlan(weaknesses, metrics.overallAccuracy);

    return {
      strengths,
      weaknesses,
      recommendations,
      nextSteps,
      studyPlan
    };
  }

  /**
   * Identify strength areas
   */
  private identifyStrengths(
    metrics: PerformanceMetrics,
    questions: QuizQuestion[],
    answers: UserAnswer[]
  ): StrengthArea[] {
    const strengths: StrengthArea[] = [];

    Object.entries(metrics.categoryAccuracy).forEach(([category, accuracy]) => {
      if (accuracy >= 80) {
        const categoryQuestions = questions.filter(q => q.category === category);
        const examples = categoryQuestions
          .filter(q => answers.find(a => a.questionId === q.id)?.isCorrect)
          .slice(0, 3)
          .map(q => q.awsServices.join(', '))
          .filter(service => service.length > 0);

        strengths.push({
          category,
          accuracy,
          description: this.getCategoryDescription(category),
          examples
        });
      }
    });

    // Add time efficiency as strength if good
    if (metrics.timeEfficiency >= 80) {
      strengths.push({
        category: 'time-management',
        accuracy: metrics.timeEfficiency,
        description: 'Excellent time management and question-answering speed',
        examples: ['Completed quiz efficiently', 'Good pacing throughout']
      });
    }

    // Add confidence calibration as strength if good
    if (metrics.confidenceCalibration >= 75) {
      strengths.push({
        category: 'self-assessment',
        accuracy: metrics.confidenceCalibration,
        description: 'Good self-assessment and confidence calibration',
        examples: ['Accurate confidence ratings', 'Good metacognitive awareness']
      });
    }

    return strengths;
  }

  /**
   * Identify weakness areas
   */
  private identifyWeaknesses(
    metrics: PerformanceMetrics,
    questions: QuizQuestion[],
    answers: UserAnswer[]
  ): WeaknessArea[] {
    const weaknesses: WeaknessArea[] = [];

    Object.entries(metrics.categoryAccuracy).forEach(([category, accuracy]) => {
      if (accuracy < 70) {
        const categoryQuestions = questions.filter(q => q.category === category);
        const incorrectAnswers = answers.filter(a => 
          !a.isCorrect && categoryQuestions.some(q => q.id === a.questionId)
        );
        
        const commonMistakes = this.identifyCommonMistakes(categoryQuestions, incorrectAnswers);
        const improvementActions = this.generateImprovementActions(category, accuracy);

        weaknesses.push({
          category,
          accuracy,
          description: this.getCategoryDescription(category),
          commonMistakes,
          improvementActions
        });
      }
    });

    // Add time management as weakness if poor
    if (metrics.timeEfficiency < 60) {
      weaknesses.push({
        category: 'time-management',
        accuracy: metrics.timeEfficiency,
        description: 'Time management needs improvement',
        commonMistakes: ['Taking too long per question', 'Poor pacing'],
        improvementActions: [
          'Practice timed quizzes',
          'Learn to eliminate obviously wrong answers quickly',
          'Set time limits for each question type'
        ]
      });
    }

    return weaknesses;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    weaknesses: WeaknessArea[],
    history?: PerformanceHistory
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // High priority recommendations for major weaknesses
    weaknesses.forEach(weakness => {
      if (weakness.accuracy < 50) {
        recommendations.push({
          type: 'study',
          priority: 'high',
          title: `Focus on ${weakness.category}`,
          description: `Your ${weakness.category} score is ${weakness.accuracy.toFixed(0)}%. This needs immediate attention.`,
          estimatedTime: 120, // 2 hours
          resources: this.getStudyResources(weakness.category)
        });
      }
    });

    // Medium priority for moderate weaknesses
    weaknesses.forEach(weakness => {
      if (weakness.accuracy >= 50 && weakness.accuracy < 70) {
        recommendations.push({
          type: 'practice',
          priority: 'medium',
          title: `Practice ${weakness.category} questions`,
          description: `Improve your ${weakness.category} understanding with targeted practice.`,
          estimatedTime: 60,
          resources: this.getPracticeResources(weakness.category)
        });
      }
    });

    // Strategy recommendations based on performance patterns
    if (metrics.timeEfficiency < 70) {
      recommendations.push({
        type: 'strategy',
        priority: 'medium',
        title: 'Improve time management',
        description: 'Work on answering questions more efficiently without sacrificing accuracy.',
        estimatedTime: 30,
        resources: ['Time management techniques', 'Practice with timer', 'Question elimination strategies']
      });
    }

    if (metrics.confidenceCalibration < 60) {
      recommendations.push({
        type: 'strategy',
        priority: 'low',
        title: 'Calibrate confidence levels',
        description: 'Work on better self-assessment of your knowledge.',
        estimatedTime: 15,
        resources: ['Metacognitive strategies', 'Self-assessment techniques']
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(metrics: PerformanceMetrics, weaknesses: WeaknessArea[]): NextStep[] {
    const nextSteps: NextStep[] = [];

    if (metrics.overallAccuracy >= 90) {
      nextSteps.push({
        action: 'Take a practice certification exam',
        description: 'You\'re performing well. Test your readiness with a full practice exam.',
        timeframe: 'This week',
        difficulty: 'medium'
      });
    } else if (metrics.overallAccuracy >= 70) {
      nextSteps.push({
        action: 'Focus on weak areas',
        description: 'Review the topics where you scored below 70% before taking more comprehensive tests.',
        timeframe: 'Next 1-2 weeks',
        difficulty: 'medium'
      });
    } else {
      nextSteps.push({
        action: 'Review fundamental concepts',
        description: 'Start with basic concepts before moving to advanced topics.',
        timeframe: 'Next 2-3 weeks',
        difficulty: 'easy'
      });
    }

    // Add specific next steps for each major weakness
    weaknesses.slice(0, 2).forEach(weakness => {
      nextSteps.push({
        action: `Study ${weakness.category} materials`,
        description: `Focus on improving your understanding of ${weakness.category} concepts.`,
        timeframe: 'Next week',
        difficulty: weakness.accuracy < 50 ? 'easy' : 'medium'
      });
    });

    return nextSteps;
  }

  /**
   * Generate personalized study plan
   */
  private generateStudyPlan(weaknesses: WeaknessArea[], overallAccuracy: number): StudyPlan {
    const totalEstimatedHours = this.calculateStudyHours(weaknesses, overallAccuracy);
    const weeklyGoals = this.generateWeeklyGoals(weaknesses, totalEstimatedHours);
    const focusAreas = weaknesses.map(w => w.category);
    const milestones = this.generateMilestones(overallAccuracy);

    return {
      totalEstimatedHours,
      weeklyGoals,
      focusAreas,
      milestones
    };
  }

  /**
   * Calculate recommended study hours
   */
  private calculateStudyHours(weaknesses: WeaknessArea[], overallAccuracy: number): number {
    let baseHours = 10; // Minimum study time

    // Add hours based on overall performance
    if (overallAccuracy < 50) baseHours += 20;
    else if (overallAccuracy < 70) baseHours += 10;
    else if (overallAccuracy < 85) baseHours += 5;

    // Add hours for each weakness
    weaknesses.forEach(weakness => {
      if (weakness.accuracy < 50) baseHours += 8;
      else if (weakness.accuracy < 70) baseHours += 4;
    });

    return Math.min(baseHours, 50); // Cap at 50 hours
  }

  /**
   * Generate weekly study goals
   */
  private generateWeeklyGoals(weaknesses: WeaknessArea[], totalHours: number): WeeklyGoal[] {
    const weeks = Math.ceil(totalHours / 8); // 8 hours per week max
    const goals: WeeklyGoal[] = [];

    for (let week = 1; week <= weeks; week++) {
      const weeklyHours = Math.min(8, totalHours - (week - 1) * 8);
      const topics = this.getWeeklyTopics(weaknesses, week, weeks);
      
      goals.push({
        week,
        topics,
        practiceQuestions: Math.ceil(weeklyHours * 5), // 5 questions per hour
        estimatedHours: weeklyHours,
        objectives: this.getWeeklyObjectives(topics, week)
      });
    }

    return goals;
  }

  /**
   * Generate milestones
   */
  private generateMilestones(overallAccuracy: number): Milestone[] {
    const milestones: Milestone[] = [];
    const today = new Date();

    if (overallAccuracy < 70) {
      milestones.push({
        title: 'Achieve 70% accuracy',
        description: 'Reach a solid foundation level in all topic areas',
        targetDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        criteria: ['Score 70%+ on practice quizzes', 'Complete weak area reviews']
      });
    }

    if (overallAccuracy < 85) {
      milestones.push({
        title: 'Achieve 85% accuracy',
        description: 'Demonstrate strong competency across all domains',
        targetDate: new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000), // 4 weeks
        criteria: ['Score 85%+ consistently', 'Master scenario-based questions']
      });
    }

    milestones.push({
      title: 'Certification ready',
      description: 'Ready to take the AWS AI Practitioner certification exam',
      targetDate: new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000), // 6 weeks
      criteria: ['Score 90%+ on practice exams', 'Complete all study modules', 'Pass timed practice tests']
    });

    return milestones;
  }

  /**
   * Assess certification readiness
   */
  assessCertificationReadiness(userId: string): CertificationReadiness {
    const history = this.getUserHistory(userId);
    if (!history || history.attempts.length === 0) {
      return {
        overallReadiness: 0,
        domainReadiness: {},
        estimatedPassProbability: 0,
        recommendedStudyTime: 40,
        weakestDomains: [],
        readinessLevel: 'not-ready'
      };
    }

    // Calculate domain readiness based on recent performance
    const recentAttempts = history.attempts.slice(-5); // Last 5 attempts
    const domainReadiness: Record<string, number> = {};
    
    Object.keys(this.certificationDomains).forEach(domain => {
      const domainScores = recentAttempts.map(attempt => 
        attempt.feedback.categoryScores[domain] || 0
      );
      domainReadiness[domain] = domainScores.length > 0 
        ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length 
        : 0;
    });

    const overallReadiness = Object.values(domainReadiness).reduce((a, b) => a + b, 0) / Object.keys(domainReadiness).length;
    const estimatedPassProbability = this.calculatePassProbability(overallReadiness, domainReadiness);
    const weakestDomains = Object.entries(domainReadiness)
      .filter(([_, score]) => score < 70)
      .sort(([_, a], [__, b]) => a - b)
      .map(([domain, _]) => domain);

    const readinessLevel = this.determineReadinessLevel(overallReadiness, estimatedPassProbability);
    const recommendedStudyTime = this.calculateRecommendedStudyTime(overallReadiness, weakestDomains.length);

    return {
      overallReadiness,
      domainReadiness,
      estimatedPassProbability,
      recommendedStudyTime,
      weakestDomains,
      readinessLevel
    };
  }

  // Helper methods

  private initializeCertificationDomains(): void {
    this.certificationDomains = {
      'aiml': ['Amazon SageMaker', 'Amazon Bedrock', 'Amazon Rekognition', 'Amazon Comprehend'],
      'fundamentals': ['Machine Learning', 'Deep Learning', 'AI concepts'],
      'responsible-ai': ['Bias', 'Fairness', 'Explainability', 'Privacy'],
      'security': ['IAM', 'Data protection', 'Compliance'],
      'deployment': ['MLOps', 'Model deployment', 'Monitoring']
    };
  }

  private initializePassingThresholds(): void {
    this.passingThresholds = {
      'overall': 70,
      'aiml': 65,
      'fundamentals': 70,
      'responsible-ai': 60,
      'security': 65,
      'deployment': 60
    };
  }

  private isAnswerCorrect(question: QuizQuestion, userAnswer: string | number): boolean {
    if (question.type === 'multiple-choice') {
      return userAnswer === question.correctAnswer;
    } else if (question.type === 'cloze-deletion') {
      const correctAnswer = question.correctAnswer as string;
      const userAnswerStr = userAnswer as string;
      return this.normalizeAnswer(userAnswerStr) === this.normalizeAnswer(correctAnswer);
    } else if (question.type === 'scenario-based') {
      return userAnswer === question.correctAnswer;
    }
    return false;
  }

  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  private getUserHistory(userId: string): PerformanceHistory | undefined {
    return this.performanceHistory.get(userId);
  }

  private updatePerformanceHistory(userId: string, attempt: QuizAttempt): void {
    const history = this.performanceHistory.get(userId) || {
      attempts: [],
      trends: [],
      achievements: [],
      streaks: { currentStreak: 0, longestStreak: 0, streakType: 'daily', lastActivity: new Date() }
    };

    history.attempts.push(attempt);
    
    // Keep only last 20 attempts
    if (history.attempts.length > 20) {
      history.attempts = history.attempts.slice(-20);
    }

    this.performanceHistory.set(userId, history);
  }

  private convertToQuizFeedback(detailedFeedback: DetailedFeedback, basicGrading: any): QuizFeedback {
    return {
      overallScore: basicGrading.overallScore,
      categoryScores: Object.fromEntries(
        Object.entries(basicGrading.categoryScores).map(([cat, scores]: [string, any]) => [
          cat,
          (scores.correct / scores.total) * 100
        ])
      ),
      strengths: detailedFeedback.strengths.map(s => s.description),
      weaknesses: detailedFeedback.weaknesses.map(w => w.description),
      recommendations: detailedFeedback.recommendations.map(r => r.description),
      nextSteps: detailedFeedback.nextSteps.map(ns => ns.action)
    };
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'aiml': 'AWS AI/ML Services',
      'fundamentals': 'AI/ML Fundamentals',
      'responsible-ai': 'Responsible AI Practices',
      'security': 'Security and Compliance',
      'deployment': 'Model Deployment and MLOps'
    };
    return descriptions[category] || category;
  }

  private identifyCommonMistakes(questions: QuizQuestion[], incorrectAnswers: UserAnswer[]): string[] {
    // Analyze patterns in incorrect answers
    const mistakes: string[] = [];
    
    if (incorrectAnswers.length > 0) {
      mistakes.push('Confusion between similar AWS services');
      mistakes.push('Misunderstanding of use case scenarios');
      mistakes.push('Incomplete knowledge of service capabilities');
    }

    return mistakes;
  }

  private generateImprovementActions(category: string, accuracy: number): string[] {
    const actions: string[] = [];
    
    if (accuracy < 50) {
      actions.push(`Review basic ${category} concepts`);
      actions.push(`Complete ${category} tutorial modules`);
      actions.push(`Practice with easier questions first`);
    } else {
      actions.push(`Focus on ${category} use cases`);
      actions.push(`Practice scenario-based questions`);
      actions.push(`Review AWS documentation`);
    }

    return actions;
  }

  private getStudyResources(category: string): string[] {
    const resources: Record<string, string[]> = {
      'aiml': ['AWS AI Services Documentation', 'SageMaker Developer Guide', 'Bedrock User Guide'],
      'fundamentals': ['ML Fundamentals Course', 'AI Concepts Tutorial', 'Deep Learning Basics'],
      'responsible-ai': ['Responsible AI Whitepaper', 'Bias Detection Guide', 'Explainable AI Resources'],
      'security': ['AWS Security Best Practices', 'IAM User Guide', 'Data Protection Guidelines'],
      'deployment': ['MLOps Best Practices', 'Model Deployment Guide', 'Monitoring and Logging']
    };
    return resources[category] || ['General AWS Documentation'];
  }

  private getPracticeResources(category: string): string[] {
    return [
      `${category} practice questions`,
      `${category} scenario exercises`,
      `${category} hands-on labs`
    ];
  }

  private getWeeklyTopics(weaknesses: WeaknessArea[], week: number, totalWeeks: number): string[] {
    const topicsPerWeek = Math.ceil(weaknesses.length / totalWeeks);
    const startIndex = (week - 1) * topicsPerWeek;
    const endIndex = Math.min(startIndex + topicsPerWeek, weaknesses.length);
    
    return weaknesses.slice(startIndex, endIndex).map(w => w.category);
  }

  private getWeeklyObjectives(topics: string[], week: number): string[] {
    return topics.map(topic => `Master ${topic} concepts and applications`);
  }

  private calculatePassProbability(overallReadiness: number, domainReadiness: Record<string, number>): number {
    // Simple model: weighted average with penalty for very weak domains
    let probability = overallReadiness;
    
    // Penalty for domains below passing threshold
    Object.entries(domainReadiness).forEach(([domain, score]) => {
      const threshold = this.passingThresholds[domain] || 70;
      if (score < threshold) {
        probability *= 0.9; // 10% penalty per weak domain
      }
    });

    return Math.max(0, Math.min(100, probability));
  }

  private determineReadinessLevel(overallReadiness: number, passProbability: number): CertificationReadiness['readinessLevel'] {
    if (overallReadiness >= 90 && passProbability >= 85) return 'ready';
    if (overallReadiness >= 80 && passProbability >= 70) return 'almost-ready';
    if (overallReadiness >= 60 && passProbability >= 50) return 'needs-work';
    return 'not-ready';
  }

  private calculateRecommendedStudyTime(overallReadiness: number, weakDomainCount: number): number {
    let baseHours = 20;
    
    if (overallReadiness < 50) baseHours += 30;
    else if (overallReadiness < 70) baseHours += 20;
    else if (overallReadiness < 85) baseHours += 10;
    
    baseHours += weakDomainCount * 5;
    
    return Math.min(baseHours, 60);
  }
}

export default QuizAssessment;