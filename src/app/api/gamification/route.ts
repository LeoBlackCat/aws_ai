import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '../../../services/GamificationService';

const gamificationService = GamificationService.getInstance();

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, use a default user ID
    // In production, this would come from authentication
    const userId = 'demo-user-1';

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'achievements':
        const achievements = await gamificationService.getUserAchievements(userId);
        return NextResponse.json({ success: true, data: achievements });

      case 'leaderboard':
        const type = (searchParams.get('type') as 'all_time' | 'weekly' | 'monthly') || 'all_time';
        const limit = parseInt(searchParams.get('limit') || '50');
        const leaderboard = await gamificationService.getLeaderboard(type, limit, userId);
        return NextResponse.json({ success: true, data: leaderboard });

      case 'daily-challenge':
        const challenge = await gamificationService.generateDailyChallenge(userId);
        return NextResponse.json({ success: true, data: challenge });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Gamification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For demo purposes, use a default user ID
    // In production, this would come from authentication
    const userId = 'demo-user-1';

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'award-xp':
        const xpResult = await gamificationService.awardXP(userId, data);
        return NextResponse.json({ success: true, data: xpResult });

      case 'update-streak':
        const streakResult = await gamificationService.updateStreak(
          userId, 
          data.maintainStreak !== false
        );
        return NextResponse.json({ success: true, data: streakResult });

      case 'check-achievements':
        const newAchievements = await gamificationService.checkAchievements(userId, data);
        return NextResponse.json({ success: true, data: newAchievements });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Gamification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}