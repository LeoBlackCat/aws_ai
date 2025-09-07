# Text-to-Speech (TTS) System

The AWS AI Trainer includes a comprehensive text-to-speech system that converts lesson content and learning progress into high-quality audio content using ElevenLabs TTS service.

## Features

### 🎵 Audio Generation
- **ElevenLabs Integration**: High-quality neural text-to-speech
- **Multiple Voices**: Choose from various voice options and styles
- **Custom Parameters**: Adjust stability, similarity boost, and speaking style
- **Background Processing**: Queue-based audio generation for better performance

### 🎧 Audio Player
- **Full-Featured Player**: Complete audio controls with progress tracking
- **Mini Player**: Background playback with minimized interface
- **Speed Controls**: Variable playback speed (0.5x - 2.0x)
- **Skip Controls**: 15-second forward/backward navigation
- **Volume Control**: Adjustable volume with mute functionality

### 📚 Content Types
- **Lesson Summaries**: 2-10 minute audio summaries of lesson content
- **Daily Recaps**: Personalized progress summaries with achievements
- **Custom Audio**: Generate audio from any text content
- **Podcast Style**: Engaging, conversational audio format

## Architecture

### Core Services

#### TTSService
Main service for ElevenLabs integration:
```typescript
class TTSService {
  generateAudio(text: string, options?: TTSOptions): Promise<AudioGenerationResult>
  generateLessonSummary(content: string, title: string): Promise<AudioGenerationResult>
  generateDailyRecap(progress: LearningProgress): Promise<AudioGenerationResult>
  getAvailableVoices(): Promise<VoiceOption[]>
}
```

#### AudioGenerationPipeline
Manages audio generation workflow:
```typescript
class AudioGenerationPipeline {
  generateLessonAudio(request: LessonAudioRequest): Promise<AudioContent>
  generateDailyRecapAudio(request: DailyRecapRequest): Promise<AudioContent>
  queueAudioGeneration(type: string, request: any, priority: string): Promise<string>
  getQueueStats(): QueueStats
}
```

### React Components

#### AudioManager
Main component that orchestrates TTS functionality:
- Voice selection interface
- Audio generation controls
- Player management
- Error handling

#### AudioPlayer
Full-featured audio player with:
- Play/pause controls
- Progress bar with seeking
- Speed and volume controls
- Download functionality

#### MiniAudioPlayer
Minimized player for background playback:
- Compact interface
- Essential controls only
- Expand/close functionality

### React Hooks

#### useTTS
Hook for TTS functionality:
```typescript
const {
  isGenerating,
  voices,
  selectedVoiceId,
  generateLessonAudio,
  generateDailyRecap,
  generateCustomAudio
} = useTTS();
```

#### useAudio
Hook for audio playback:
```typescript
const {
  isPlaying,
  currentTime,
  duration,
  play,
  pause,
  seek,
  setVolume,
  setPlaybackRate
} = useAudio(audioUrl);
```

## API Endpoints

### POST /api/audio
Generate audio content:
```json
{
  "type": "lesson-summary",
  "lessonId": "lesson-123",
  "lessonTitle": "AWS AI Services",
  "lessonContent": "...",
  "voiceId": "voice-id",
  "options": {
    "stability": 0.5,
    "similarityBoost": 0.75
  }
}
```

### GET /api/audio?action=voices
Get available voices:
```json
{
  "success": true,
  "data": [
    {
      "id": "voice-id",
      "name": "Rachel",
      "category": "general",
      "description": "Friendly female voice"
    }
  ]
}
```

### POST /api/audio/queue
Queue audio generation for background processing:
```json
{
  "type": "daily-recap",
  "priority": "normal",
  "userId": "user-123",
  "learningProgress": {...}
}
```

## Configuration

### Environment Variables
```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your-api-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Default voice
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

### Voice Options
The system supports multiple voice categories:
- **General**: Conversational, friendly voices
- **Professional**: Business-appropriate voices
- **Narrative**: Storytelling and educational voices
- **Custom**: User-uploaded voice clones (if available)

## Usage Examples

### Generate Lesson Audio
```typescript
const audioContent = await generateLessonAudio(
  'lesson-123',
  'AWS AI Services Overview',
  lessonMarkdownContent
);

// Play the generated audio
setCurrentAudio({
  url: audioContent.audioUrl,
  title: audioContent.title,
  type: 'lesson-summary'
});
```

### Generate Daily Recap
```typescript
const learningProgress = {
  lessonsCompleted: ['lesson-1', 'lesson-2'],
  quizScores: [{ lesson: 'lesson-1', score: 85 }],
  newConcepts: ['Amazon Bedrock', 'SageMaker'],
  reviewItems: ['EC2 instances']
};

const recap = await generateDailyRecap('user-123', learningProgress);
```

### Background Audio Generation
```typescript
// Queue for background processing
const queueId = await queueAudioGeneration('lesson-summary', {
  lessonId: 'lesson-123',
  lessonTitle: 'AWS AI Services',
  lessonContent: content
}, 'high');

// Check status later
const status = await checkQueueStatus(queueId);
```

## Content Processing

### Lesson Summary Generation
The system automatically:
1. Removes markdown formatting
2. Extracts key concepts and AWS services
3. Creates a 2-10 minute summary
4. Adds introduction and conclusion
5. Optimizes for audio consumption

### Daily Recap Generation
Personalized recaps include:
- Lessons completed today
- Quiz performance summary
- New concepts learned
- Items due for review
- Motivational messaging based on progress

## Performance Optimization

### Caching Strategy
- Generated audio files are cached with blob URLs
- Voice options are cached after first fetch
- Queue status is cached to reduce API calls

### Memory Management
- Automatic cleanup of old blob URLs
- Queue item cleanup after 24 hours
- Streaming audio processing to minimize memory usage

### Background Processing
- Queue-based generation prevents UI blocking
- Priority-based processing (high/normal/low)
- Automatic retry for failed generations

## Error Handling

### Client-Side Errors
- Network connectivity issues
- Audio playback failures
- Invalid audio formats
- User permission denials

### Server-Side Errors
- ElevenLabs API failures
- Rate limiting
- Invalid content processing
- Queue processing errors

### Graceful Degradation
- Fallback to text display if audio fails
- Alternative voice selection if preferred voice unavailable
- Offline mode with cached audio content

## Testing

### Unit Tests
- TTSService functionality
- AudioGenerationPipeline workflow
- React hook behavior
- Error handling scenarios

### Integration Tests
- API endpoint functionality
- ElevenLabs service integration
- Audio player component behavior
- Queue processing workflow

### Manual Testing
- Audio quality assessment
- Cross-browser compatibility
- Mobile device testing
- Accessibility compliance

## Future Enhancements

### Planned Features
- **Voice Cloning**: Custom voice training for personalized experience
- **Multi-language Support**: Generate audio in multiple languages
- **Offline Mode**: Download audio for offline listening
- **Smart Summaries**: AI-powered content optimization for audio
- **Interactive Audio**: Voice-controlled navigation and responses

### Performance Improvements
- **Streaming Generation**: Real-time audio streaming during generation
- **Compression**: Optimized audio formats for faster loading
- **CDN Integration**: Global audio content delivery
- **Batch Processing**: Bulk audio generation for course content

## Troubleshooting

### Common Issues

#### Audio Not Playing
1. Check browser audio permissions
2. Verify audio URL is valid
3. Test with different audio format
4. Check network connectivity

#### Generation Failures
1. Verify ElevenLabs API key
2. Check API rate limits
3. Validate input text length
4. Review error logs

#### Performance Issues
1. Clear audio cache
2. Reduce concurrent generations
3. Check network bandwidth
4. Monitor memory usage

### Debug Tools
- Browser developer tools for audio debugging
- Network tab for API call monitoring
- Console logs for error tracking
- Performance profiler for optimization

## Security Considerations

### Data Privacy
- Audio content is generated on-demand
- No permanent storage of user audio
- Secure API key management
- HTTPS-only audio delivery

### Content Security
- Input sanitization for text content
- Rate limiting for API abuse prevention
- Content filtering for inappropriate material
- Audit logging for generated content

This TTS system provides a comprehensive audio learning experience that enhances the AWS AI Trainer platform with engaging, accessible content delivery.