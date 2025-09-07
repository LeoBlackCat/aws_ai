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
    const { type, ...requestData } = body;

    switch (type) {
      case 'lesson-summary': {
        const { lessonId, lessonTitle, lessonContent, voiceId, options } = requestData;
        
        if (!lessonId || !lessonTitle || !lessonContent) {
          return NextResponse.json(
            { error: 'Missing required fields: lessonId, lessonTitle, lessonContent' },
            { status: 400 }
          );
        }

        const audioContent = await service.generateLessonAudio({
          lessonId,
          lessonTitle,
          lessonContent,
          voiceId,
          options,
        });

        return NextResponse.json({ success: true, data: audioContent });
      }

      case 'daily-recap': {
        const { userId, date, learningProgress, voiceId, options } = requestData;
        
        if (!userId || !date || !learningProgress) {
          return NextResponse.json(
            { error: 'Missing required fields: userId, date, learningProgress' },
            { status: 400 }
          );
        }

        const audioContent = await service.generateDailyRecapAudio({
          userId,
          date: new Date(date),
          learningProgress,
          voiceId,
          options,
        });

        return NextResponse.json({ success: true, data: audioContent });
      }

      case 'custom': {
        const { text, title, options } = requestData;
        
        if (!text || !title) {
          return NextResponse.json(
            { error: 'Missing required fields: text, title' },
            { status: 400 }
          );
        }

        const audioContent = await service.generateCustomAudio(text, title, options);
        return NextResponse.json({ success: true, data: audioContent });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be one of: lesson-summary, daily-recap, custom' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { 
        error: 'Audio generation failed',
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
    const action = searchParams.get('action');

    switch (action) {
      case 'voices': {
        const voices = await service.getAvailableVoices();
        return NextResponse.json({ success: true, data: voices });
      }

      case 'queue-stats': {
        const stats = service.getQueueStats();
        return NextResponse.json({ success: true, data: stats });
      }

      case 'queue-status': {
        const queueId = searchParams.get('queueId');
        if (!queueId) {
          return NextResponse.json(
            { error: 'Missing queueId parameter' },
            { status: 400 }
          );
        }

        const status = service.getQueueStatus(queueId);
        if (!status) {
          return NextResponse.json(
            { error: 'Queue item not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, data: status });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: voices, queue-stats, queue-status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Audio API error:', error);
    return NextResponse.json(
      { 
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}