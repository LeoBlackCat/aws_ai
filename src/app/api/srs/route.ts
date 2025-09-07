/**
 * SRS API endpoints for spaced repetition system
 */

import { NextRequest, NextResponse } from 'next/server';
import SpacedRepetitionService from '../../../services/SpacedRepetitionService';
import { EaseRating } from '../../../services/SRSScheduler';

// Mock user ID for demo purposes
const DEMO_USER_ID = 'demo-user-123';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const srsService = new SpacedRepetitionService(DEMO_USER_ID);

    switch (action) {
      case 'daily-review':
        const dailyData = await srsService.getDailyReviewData();
        return NextResponse.json({
          success: true,
          data: dailyData
        });

      case 'stats':
        const stats = await srsService.getSRSStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'settings':
        const settings = srsService.getSettings();
        return NextResponse.json({
          success: true,
          data: settings
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: daily-review, stats, or settings'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('SRS API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const srsService = new SpacedRepetitionService(DEMO_USER_ID);

    switch (action) {
      case 'start-session':
        const session = await srsService.startStudySession();
        return NextResponse.json({
          success: true,
          data: session
        });

      case 'review-card':
        const { cardId, ease, timeSpent, confidence, sessionId } = body;
        
        if (!cardId || ease === undefined || timeSpent === undefined || confidence === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: cardId, ease, timeSpent, confidence'
          }, { status: 400 });
        }

        const reviewResult = await srsService.reviewCard(
          cardId,
          ease as EaseRating,
          timeSpent,
          confidence,
          sessionId
        );

        return NextResponse.json({
          success: true,
          data: reviewResult
        });

      case 'end-session':
        const { sessionId: endSessionId } = body;
        
        if (!endSessionId) {
          return NextResponse.json({
            success: false,
            error: 'Missing sessionId'
          }, { status: 400 });
        }

        const completedSession = await srsService.endStudySession(endSessionId);
        return NextResponse.json({
          success: true,
          data: completedSession
        });

      case 'generate-flashcards':
        const { lessonId, options } = body;
        
        if (!lessonId) {
          return NextResponse.json({
            success: false,
            error: 'Missing lessonId'
          }, { status: 400 });
        }

        const generationResult = await srsService.generateFlashcards(lessonId, options);
        return NextResponse.json({
          success: true,
          data: generationResult
        });

      case 'change-algorithm':
        const { algorithm } = body;
        
        if (!algorithm) {
          return NextResponse.json({
            success: false,
            error: 'Missing algorithm'
          }, { status: 400 });
        }

        await srsService.changeAlgorithm(algorithm);
        return NextResponse.json({
          success: true,
          message: `Algorithm changed to ${algorithm}`
        });

      case 'handle-leech-cards':
        const leechResult = await srsService.handleLeechCards();
        return NextResponse.json({
          success: true,
          data: leechResult
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('SRS API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}