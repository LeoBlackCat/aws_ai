import TTSService, { TTSOptions } from './TTSService';

export interface LearningProgress {
  userId: string;
  date: Date;
  lessonsCompleted: Array<{
    id: string;
    title: string;
    module: string;
    timeSpent: number;
    completedAt: Date;
  }>;
  quizResults: Array<{
    lessonId: string;
    lessonTitle: string;
    score: number;
    totalQuestions: number;
    timeSpent: number;
    completedAt: Date;
  }>;
  flashcardReviews: Array<{
    cardId: string;
    concept: string;
    difficulty: 'easy' | 'medium' | 'hard';
    reviewCount: number;
    lastReview: Date;
  }>;
  newConcepts: Array<{
    term: string;
    definition: string;
    category: string;
    source: string;
  }>;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    studyDays: number;
  };
  weakAreas: Array<{
    topic: string;
    accuracy: number;
    recommendedAction: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: Date;
  }>;
}

export interface PodcastRecapOptions extends TTSOptions {
  includeMotivation?: boolean;
  includeWeakAreas?: boolean;
  includeAchievements?: boolean;
  includeNextSteps?: boolean;
  tone?: 'professional' | 'friendly' | 'encouraging' | 'casual';
  duration?: 'short' | 'medium' | 'long'; // 2-3min, 5-7min, 10-15min
}

export class PodcastRecapGenerator {
  private ttsService: TTSService;

  constructor() {
    this.ttsService = new TTSService();
  }

  /**
   * Generate a podcast-style daily recap
   */
  async generateDailyPodcast(
    progress: LearningProgress,
    options: PodcastRecapOptions = {}
  ): Promise<{
    audioUrl: string;
    transcript: string;
    duration: number;
    highlights: string[];
  }> {
    const {
      includeMotivation = true,
      includeWeakAreas = true,
      includeAchievements = true,
      includeNextSteps = true,
      tone = 'encouraging',
      duration = 'medium',
      ...ttsOptions
    } = options;

    // Generate the podcast script
    const script = this.generatePodcastScript(progress, {
      includeMotivation,
      includeWeakAreas,
      includeAchievements,
      includeNextSteps,
      tone,
      duration,
    });

    // Generate audio
    const audioResult = await this.ttsService.generateAudio(script.content, ttsOptions);

    return {
      audioUrl: audioResult.audioUrl,
      transcript: script.content,
      duration: audioResult.duration,
      highlights: script.highlights,
    };
  }

  /**
   * Generate weekly summary podcast
   */
  async generateWeeklySummary(
    weeklyProgress: LearningProgress[],
    options: PodcastRecapOptions = {}
  ): Promise<{
    audioUrl: string;
    transcript: string;
    duration: number;
    highlights: string[];
  }> {
    const script = this.generateWeeklyScript(weeklyProgress, options);
    const audioResult = await this.ttsService.generateAudio(script.content, options);

    return {
      audioUrl: audioResult.audioUrl,
      transcript: script.content,
      duration: audioResult.duration,
      highlights: script.highlights,
    };
  }

  /**
   * Generate the podcast script content
   */
  private generatePodcastScript(
    progress: LearningProgress,
    options: {
      includeMotivation: boolean;
      includeWeakAreas: boolean;
      includeAchievements: boolean;
      includeNextSteps: boolean;
      tone: string;
      duration: string;
    }
  ): { content: string; highlights: string[] } {
    const { tone, duration } = options;
    const highlights: string[] = [];
    
    let script = this.getIntroduction(progress.date, tone);

    // Main content sections
    if (progress.lessonsCompleted.length > 0) {
      const lessonSection = this.generateLessonSection(progress.lessonsCompleted, tone);
      script += lessonSection.content;
      highlights.push(...lessonSection.highlights);
    }

    if (progress.quizResults.length > 0) {
      const quizSection = this.generateQuizSection(progress.quizResults, tone);
      script += quizSection.content;
      highlights.push(...quizSection.highlights);
    }

    if (progress.newConcepts.length > 0) {
      const conceptSection = this.generateConceptSection(progress.newConcepts, tone, duration);
      script += conceptSection.content;
      highlights.push(...conceptSection.highlights);
    }

    if (options.includeAchievements && progress.achievements.length > 0) {
      const achievementSection = this.generateAchievementSection(progress.achievements, tone);
      script += achievementSection.content;
      highlights.push(...achievementSection.highlights);
    }

    if (options.includeWeakAreas && progress.weakAreas.length > 0) {
      const weakAreaSection = this.generateWeakAreaSection(progress.weakAreas, tone);
      script += weakAreaSection.content;
      highlights.push(...weakAreaSection.highlights);
    }

    if (progress.streakData.currentStreak > 0) {
      const streakSection = this.generateStreakSection(progress.streakData, tone);
      script += streakSection.content;
      highlights.push(...streakSection.highlights);
    }

    if (options.includeNextSteps) {
      script += this.generateNextStepsSection(progress, tone);
    }

    if (options.includeMotivation) {
      script += this.generateMotivationalClosing(progress, tone);
    }

    return { content: script, highlights };
  }

  private getIntroduction(date: Date, tone: string): string {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });

    const intros = {
      professional: `Good day! This is your AWS AI Practitioner learning summary for ${dayName}, ${dateStr}. Let's review your progress.`,
      friendly: `Hey there! Welcome to your daily AWS learning recap for ${dayName}, ${dateStr}. Ready to see how you did today?`,
      encouraging: `Hello, future AWS AI expert! It's time for your ${dayName} learning celebration. Let's dive into all the amazing progress you made on ${dateStr}.`,
      casual: `What's up! Time for your daily AWS wrap-up. Here's what went down on ${dayName}, ${dateStr}.`,
    };

    return (intros[tone as keyof typeof intros] || intros.encouraging) + '\n\n';
  }

  private generateLessonSection(
    lessons: LearningProgress['lessonsCompleted'],
    tone: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    const totalTime = lessons.reduce((sum, lesson) => sum + lesson.timeSpent, 0);
    const timeStr = this.formatDuration(totalTime);

    if (lessons.length === 1) {
      content += `You completed one lesson today: "${lessons[0].title}" from the ${lessons[0].module} module. `;
      highlights.push(`Completed: ${lessons[0].title}`);
    } else {
      content += `You powered through ${lessons.length} lessons today, spending ${timeStr} in total study time. `;
      
      const modules = [...new Set(lessons.map(l => l.module))];
      if (modules.length === 1) {
        content += `All from the ${modules[0]} module. `;
      } else {
        content += `Covering ${modules.length} different modules: ${modules.join(', ')}. `;
      }
      
      highlights.push(`${lessons.length} lessons completed`);
      highlights.push(`${timeStr} study time`);
    }

    // Highlight key lessons
    const keyLessons = lessons.slice(0, 2);
    if (keyLessons.length > 0) {
      content += `Key topics included ${keyLessons.map(l => l.title).join(' and ')}. `;
    }

    content += '\n\n';
    return { content, highlights };
  }

  private generateQuizSection(
    quizzes: LearningProgress['quizResults'],
    tone: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    const avgScore = quizzes.reduce((sum, quiz) => sum + quiz.score, 0) / quizzes.length;
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);

    content += `On the assessment front, you tackled ${quizzes.length} quiz${quizzes.length > 1 ? 'zes' : ''} `;
    content += `with ${totalQuestions} total questions, achieving an average score of ${Math.round(avgScore)}%. `;

    if (avgScore >= 90) {
      content += tone === 'professional' 
        ? 'Excellent performance. ' 
        : 'Outstanding work! ';
      highlights.push('🏆 Excellent quiz performance');
    } else if (avgScore >= 80) {
      content += tone === 'professional' 
        ? 'Strong performance. ' 
        : 'Great job! ';
      highlights.push('✅ Strong quiz performance');
    } else if (avgScore >= 70) {
      content += 'Good progress, with room for improvement. ';
      highlights.push('📈 Good quiz progress');
    } else {
      content += 'This shows areas where additional review would be beneficial. ';
      highlights.push('📚 Review recommended');
    }

    // Highlight best performance
    const bestQuiz = quizzes.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    if (bestQuiz.score >= 85) {
      content += `Your strongest performance was on "${bestQuiz.lessonTitle}" with ${bestQuiz.score}%. `;
      highlights.push(`Best: ${bestQuiz.score}% on ${bestQuiz.lessonTitle}`);
    }

    content += '\n\n';
    return { content, highlights };
  }

  private generateConceptSection(
    concepts: LearningProgress['newConcepts'],
    tone: string,
    duration: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    const maxConcepts = duration === 'short' ? 3 : duration === 'medium' ? 5 : 8;
    const conceptsToMention = concepts.slice(0, maxConcepts);

    content += `You expanded your AWS knowledge with ${concepts.length} new concept${concepts.length > 1 ? 's' : ''}. `;

    if (conceptsToMention.length > 0) {
      content += 'Key additions to your toolkit include ';
      
      const awsServices = conceptsToMention.filter(c => c.category === 'aws-service');
      const aiConcepts = conceptsToMention.filter(c => c.category === 'ai-concept');
      const technical = conceptsToMention.filter(c => c.category === 'technical-term');

      const sections = [];
      if (awsServices.length > 0) {
        sections.push(`AWS services like ${awsServices.slice(0, 2).map(c => c.term).join(' and ')}`);
      }
      if (aiConcepts.length > 0) {
        sections.push(`AI concepts including ${aiConcepts.slice(0, 2).map(c => c.term).join(' and ')}`);
      }
      if (technical.length > 0) {
        sections.push(`technical terms such as ${technical.slice(0, 2).map(c => c.term).join(' and ')}`);
      }

      content += sections.join(', ') + '. ';
      
      highlights.push(`${concepts.length} new concepts learned`);
      conceptsToMention.slice(0, 3).forEach(concept => {
        highlights.push(`New: ${concept.term}`);
      });
    }

    content += '\n\n';
    return { content, highlights };
  }

  private generateAchievementSection(
    achievements: LearningProgress['achievements'],
    tone: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    if (achievements.length > 0) {
      content += tone === 'professional' 
        ? `You earned ${achievements.length} achievement${achievements.length > 1 ? 's' : ''} today. `
        : `Celebration time! You unlocked ${achievements.length} new achievement${achievements.length > 1 ? 's' : ''}! `;

      achievements.forEach(achievement => {
        content += `"${achievement.title}" - ${achievement.description}. `;
        highlights.push(`🏅 ${achievement.title}`);
      });

      content += '\n\n';
    }

    return { content, highlights };
  }

  private generateWeakAreaSection(
    weakAreas: LearningProgress['weakAreas'],
    tone: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    if (weakAreas.length > 0) {
      content += tone === 'professional'
        ? 'Areas identified for additional focus include '
        : 'Let\'s talk about opportunities for growth. ';

      const topWeakAreas = weakAreas.slice(0, 2);
      topWeakAreas.forEach((area, index) => {
        content += `${area.topic} where your accuracy is ${Math.round(area.accuracy)}%. `;
        content += `${area.recommendedAction}. `;
        highlights.push(`Focus area: ${area.topic}`);
      });

      content += '\n\n';
    }

    return { content, highlights };
  }

  private generateStreakSection(
    streakData: LearningProgress['streakData'],
    tone: string
  ): { content: string; highlights: string[] } {
    const highlights: string[] = [];
    let content = '';

    if (streakData.currentStreak > 1) {
      content += tone === 'professional'
        ? `You're maintaining a ${streakData.currentStreak}-day study streak. `
        : `You're on fire with a ${streakData.currentStreak}-day learning streak! `;

      if (streakData.currentStreak === streakData.longestStreak) {
        content += 'This is your personal best! ';
        highlights.push(`🔥 ${streakData.currentStreak}-day streak (Personal Best!)`);
      } else {
        content += `Your longest streak is ${streakData.longestStreak} days. `;
        highlights.push(`🔥 ${streakData.currentStreak}-day streak`);
      }

      content += '\n\n';
    }

    return { content, highlights };
  }

  private generateNextStepsSection(progress: LearningProgress, tone: string): string {
    let content = tone === 'professional'
      ? 'For tomorrow\'s session, consider '
      : 'Looking ahead to tomorrow, I recommend ';

    // Suggest based on weak areas
    if (progress.weakAreas.length > 0) {
      const topWeakArea = progress.weakAreas[0];
      content += `focusing on ${topWeakArea.topic} to strengthen that foundation. `;
    }

    // Suggest flashcard reviews
    const dueReviews = progress.flashcardReviews.filter(card => {
      const daysSinceReview = (Date.now() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceReview >= 1;
    });

    if (dueReviews.length > 0) {
      content += `You have ${dueReviews.length} flashcards ready for review. `;
    }

    content += '\n\n';
    return content;
  }

  private generateMotivationalClosing(progress: LearningProgress, tone: string): string {
    const motivationalMessages = {
      professional: 'Consistent daily progress builds expertise. Continue your methodical approach to AWS AI mastery.',
      friendly: 'You\'re making great progress on your AWS journey. Keep up the excellent work!',
      encouraging: 'Every concept you learn brings you closer to AWS AI certification success. You\'ve got this!',
      casual: 'Nice work today! You\'re building some serious AWS skills. Catch you tomorrow!',
    };

    return (motivationalMessages[tone as keyof typeof motivationalMessages] || motivationalMessages.encouraging) + '\n\n';
  }

  private generateWeeklyScript(
    weeklyProgress: LearningProgress[],
    options: PodcastRecapOptions
  ): { content: string; highlights: string[] } {
    // Implementation for weekly summary would be similar but aggregate data across the week
    // This is a simplified version
    const highlights: string[] = [];
    
    const totalLessons = weeklyProgress.reduce((sum, day) => sum + day.lessonsCompleted.length, 0);
    const totalQuizzes = weeklyProgress.reduce((sum, day) => sum + day.quizResults.length, 0);
    const totalConcepts = weeklyProgress.reduce((sum, day) => sum + day.newConcepts.length, 0);

    let content = `Welcome to your weekly AWS AI learning summary! This week you completed ${totalLessons} lessons, `;
    content += `took ${totalQuizzes} quizzes, and learned ${totalConcepts} new concepts. `;
    
    highlights.push(`${totalLessons} lessons this week`);
    highlights.push(`${totalQuizzes} quizzes completed`);
    highlights.push(`${totalConcepts} new concepts`);

    // Add more detailed weekly analysis here...
    
    return { content, highlights };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

export default PodcastRecapGenerator;