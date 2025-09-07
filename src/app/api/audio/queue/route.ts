import { NextRequest, NextResponse } from 'next/server';
import AudioGenerationPipeline from '@/services/AudioGenerationPipeline';

let audioService: AudioGenerationPipeline | null = null;

function getAudioService() {
  if (!audioService) {
    try {
      audioService = new AudioGenerationPipeline();
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      return null;
    }
  }
  return audioService;
}

export async function POST(request: NextRequest) {
  try {
    const service = getAudioService();
    if (!service) {
      return NextResponse.json(
        { error: 'Audio service not available - check configuration' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, priority = 'normal', ...requestData } = body;

    if (!['lesson-summary', 'daily-recap'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be lesson-summary or daily-recap' },
        { status: 400 }
      );
    }

    if (!['high', 'normal', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be high, normal, or low' },
        { status: 400 }
      );
    }

    let queueId: string;

    if (type === 'lesson-summary') {
      const { lessonId, lessonTitle, lessonContent, voiceId, options } = requestData;
      
      if (!lessonId || !lessonTitle || !lessonContent) {
        return NextResponse.json(
          { error: 'Missing required fields: lessonId, lessonTitle, lessonContent' },
          { status: 400 }
        );
      }

      queueId = await service.queueAudioGeneration(
        'lesson-summary',
        { lessonId, lessonTitle, lessonContent, voiceId, options },
        priority
      );
    } else {
      const { userId, date, learningProgress, voiceId, options } = requestData;
      
      if (!userId || !date || !learningProgress) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, date, learningProgress' },
          { status: 400 }
        );
      }

      queueId = await service.queueAudioGeneration(
        'daily-recap',
        { userId, date: new Date(date), learningProgress, voiceId, options },
        priority
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: { queueId, message: 'Audio generation queued successfully' }
    });

  } catch (error) {
    console.error('Audio queue error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to queue audio generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const service = getAudioService();
    if (!service) {
      return NextResponse.json(
        { error: 'Audio service not available - check configuration' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('id');

    if (queueId) {
      // Get specific queue item status
      const status = service.getQueueStatus(queueId);
      if (!status) {
        return NextResponse.json(
          { error: 'Queue item not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: status });
    } else {
      // Get queue statistics
      const stats = service.getQueueStats();
      return NextResponse.json({ success: true, data: stats });
    }
  } catch (error) {
    console.error('Audio queue status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get queue status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const service = getAudioService();
    if (!service) {
      return NextResponse.json(
        { error: 'Audio service not available - check configuration' },
        { status: 503 }
      );
    }

    // Cleanup old queue items
    const { searchParams } = new URL(request.url);
    const maxAge = parseInt(searchParams.get('maxAge') || '86400000'); // 24 hours default

    service.cleanup(maxAge);

    return NextResponse.json({ 
      success: true, 
      message: 'Queue cleanup completed' 
    });
  } catch (error) {
    console.error('Audio queue cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cleanup queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}