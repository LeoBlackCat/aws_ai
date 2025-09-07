/**
 * API Routes for AI Tutoring System
 * Handles chat, Socratic questioning, answer evaluation, and feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import TutorService, { TutorContext, TutorMode } from '@/services/TutorService';
import { prisma } from '@/lib/prisma';

const tutorService = new TutorService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'chat':
        return handleChat(params);
      case 'socratic':
        return handleSocraticQuestion(params);
      case 'evaluate':
        return handleEvaluateAnswer(params);
      case 'feedback':
        return handleProvideFeedback(params);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Tutor API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleChat(params: {
  message: string;
  userId: string;
  courseId?: string;
  currentLesson?: string;
  mode?: string;
  sessionId?: string;
}) {
  const { message, userId, courseId = 'aws-ai-practitioner', currentLesson, mode = 'answer', sessionId } = params;

  // Get user's learning history
  const learningHistory = await getUserLearningHistory(userId);

  // Create tutor context
  const context: TutorContext = {
    userId,
    courseId,
    currentLesson,
    learningHistory,
    mode: mode as TutorMode,
    sessionId
  };

  // Get or create tutor session
  let tutorSession;
  if (sessionId) {
    tutorSession = await prisma.tutorSession.findUnique({
      where: { id: sessionId },
      include: { messages: true }
    });
  }

  if (!tutorSession) {
    tutorSession = await prisma.tutorSession.create({
      data: {
        userId,
        mode: mode.toUpperCase() as any,
        lessonId: currentLesson,
        topic: extractTopicFromMessage(message)
      }
    });
  }

  // Generate tutor response
  const response = await tutorService.chat(message, {
    ...context,
    sessionId: tutorSession.id
  });

  // Save messages to database
  await prisma.tutorMessage.createMany({
    data: [
      {
        sessionId: tutorSession.id,
        role: 'USER',
        content: message
      },
      {
        sessionId: tutorSession.id,
        role: 'ASSISTANT',
        content: response.message,
        citations: response.citations as any,
        confidence: response.confidence
      }
    ]
  });

  return NextResponse.json({
    success: true,
    data: {
      ...response,
      sessionId: tutorSession.id
    }
  });
}

async function handleSocraticQuestion(params: {
  topic: string;
  userId?: string;
  courseId?: string;
  currentLesson?: string;
}) {
  const { topic, userId, courseId = 'aws-ai-practitioner', currentLesson } = params;

  let context: TutorContext | undefined;
  if (userId) {
    const learningHistory = await getUserLearningHistory(userId);
    context = {
      userId,
      courseId,
      currentLesson,
      learningHistory,
      mode: TutorMode.SOCRATIC
    };
  }

  const question = await tutorService.generateSocraticQuestion(topic, context);

  return NextResponse.json({
    success: true,
    data: { question }
  });
}

async function handleEvaluateAnswer(params: {
  question: string;
  answer: string;
  userId?: string;
  courseId?: string;
  currentLesson?: string;
}) {
  const { question, answer, userId, courseId = 'aws-ai-practitioner', currentLesson } = params;

  let context: TutorContext | undefined;
  if (userId) {
    const learningHistory = await getUserLearningHistory(userId);
    context = {
      userId,
      courseId,
      currentLesson,
      learningHistory,
      mode: TutorMode.ANSWER
    };
  }

  const evaluation = await tutorService.evaluateAnswer(question, answer, context);

  // Save evaluation to database if user is provided
  if (userId) {
    // This could be expanded to save evaluations for analytics
    console.log(`Evaluation for user ${userId}: ${evaluation.score}`);
  }

  return NextResponse.json({
    success: true,
    data: evaluation
  });
}

async function handleProvideFeedback(params: {
  userId: string;
  courseId?: string;
  performanceData?: any;
}) {
  const { userId, courseId = 'aws-ai-practitioner', performanceData } = params;

  // Get comprehensive performance data
  const performance = performanceData || await getUserPerformanceData(userId);
  
  const learningHistory = await getUserLearningHistory(userId);
  
  const context: TutorContext = {
    userId,
    courseId,
    learningHistory,
    mode: TutorMode.ANSWER
  };

  const feedback = await tutorService.provideFeedback(performance, context);

  return NextResponse.json({
    success: true,
    data: feedback
  });
}

// Helper functions

async function getUserLearningHistory(userId: string) {
  try {
    // Get recent learning activities
    const [progress, quizAttempts, cardReviews, sessions] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { lesson: true }
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: { quiz: true }
      }),
      prisma.cardReview.findMany({
        where: { userId },
        orderBy: { reviewedAt: 'desc' },
        take: 20
      }),
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: 5
      })
    ]);

    const learningHistory = [
      ...progress.map(p => ({
        type: 'lesson_completed' as const,
        timestamp: p.completedAt || p.updatedAt,
        content: p.lesson?.title || 'Unknown lesson',
        performance: p.confidence / 5, // Convert 1-5 scale to 0-1
        difficulty: 'medium'
      })),
      ...quizAttempts.map(qa => ({
        type: 'quiz_attempted' as const,
        timestamp: qa.completedAt || qa.startedAt,
        content: qa.quiz?.title || 'Quiz',
        performance: qa.score / qa.maxScore,
        difficulty: 'medium'
      })),
      ...cardReviews.map(cr => ({
        type: 'card_reviewed' as const,
        timestamp: cr.reviewedAt,
        content: 'Flashcard review',
        performance: cr.ease > 2 ? 0.8 : 0.4, // Convert ease to performance
        difficulty: 'easy'
      }))
    ];

    return learningHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  } catch (error) {
    console.error('Error getting learning history:', error);
    return [];
  }
}

async function getUserPerformanceData(userId: string) {
  try {
    const [quizStats, progressStats, cardStats] = await Promise.all([
      // Quiz performance
      prisma.quizAttempt.aggregate({
        where: { userId },
        _avg: { score: true },
        _count: { id: true }
      }),
      // Progress stats
      prisma.userProgress.aggregate({
        where: { userId },
        _avg: { confidence: true, timeSpent: true },
        _count: { id: true }
      }),
      // Card review stats
      prisma.cardReview.aggregate({
        where: { userId },
        _avg: { ease: true, timeSpent: true },
        _count: { id: true }
      })
    ]);

    // Get weak areas (topics with low performance)
    const weakAreas = await prisma.quizAttempt.findMany({
      where: {
        userId,
        score: { lt: 70 }
      },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                module: true
              }
            }
          }
        }
      },
      take: 10
    });

    return {
      averageQuizScore: quizStats._avg.score || 0,
      totalQuizzes: quizStats._count.id,
      averageConfidence: progressStats._avg.confidence || 3,
      averageStudyTime: progressStats._avg.timeSpent || 0,
      totalLessons: progressStats._count.id,
      averageCardEase: cardStats._avg.ease || 2.5,
      totalCardReviews: cardStats._count.id,
      weakAreas: weakAreas.map(wa => wa.quiz?.lesson?.module?.title || 'Unknown').slice(0, 5),
      strongAreas: [], // Could be calculated based on high-performing areas
      recentMistakes: [], // Could be extracted from recent quiz attempts
      preferredDifficulty: 'medium'
    };
  } catch (error) {
    console.error('Error getting performance data:', error);
    return {
      averageQuizScore: 0,
      totalQuizzes: 0,
      averageConfidence: 3,
      averageStudyTime: 0,
      totalLessons: 0,
      averageCardEase: 2.5,
      totalCardReviews: 0,
      weakAreas: [],
      strongAreas: [],
      recentMistakes: [],
      preferredDifficulty: 'medium'
    };
  }
}

function extractTopicFromMessage(message: string): string {
  // Simple topic extraction - could be enhanced with NLP
  const awsServices = message.match(/\b(SageMaker|Rekognition|Comprehend|Lex|Polly|Transcribe|Bedrock|Textract|Translate|Personalize|Forecast|Kendra|CodeWhisperer)\b/gi);
  if (awsServices && awsServices.length > 0) {
    return awsServices[0];
  }

  const concepts = message.match(/\b(machine learning|artificial intelligence|deep learning|neural network|natural language processing|computer vision)\b/gi);
  if (concepts && concepts.length > 0) {
    return concepts[0];
  }

  return 'General AWS AI';
}