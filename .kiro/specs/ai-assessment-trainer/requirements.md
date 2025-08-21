# AI Tutor Requirements

## Project Overview
An educational web application that tests users' knowledge by asking questions and evaluating their spoken responses against predefined answers from markdown files. The app mimics OpenAI's Realtime API experience but operates entirely client-side.

## Core Concept
- **Question Format**: "What is fine-tuning of Foundation Models?"
- **Expected Answer**: "Fine-tuning is a supervised learning process..." (exact phrasing from .md files)
- **Evaluation**: Assess how close user's response is to the original text, allowing for different phrasing while maintaining accuracy

## Technical Stack (Following Arabic App Pattern)

### Frontend Framework
- **React 19** with functional components and hooks
- **Webpack 5** for module bundling and development server
- **TailwindCSS** for responsive styling
- **No backend** - all processing happens client-side

### APIs & Services
- **OpenAI API** for:
  - Answer evaluation and similarity scoring
  - Question generation from markdown content
  - Natural language processing of user responses
- **Web Speech API** for:
  - Speech recognition (user input)
  - Text-to-speech (question reading)
- **Environment variables** via `.env` file for API keys

### Core Features

#### 1. Training Mode
- **Question Pool**: Generated from markdown files in `/data` directory
- **Speech Input**: Voice-based answers from users
- **Real-time Evaluation**: Compare user response to expected answer
- **Feedback System**: 
  - Immediate feedback on correctness
  - Similarity percentage
  - Suggestions for improvement
- **Adaptive Learning**: Focus on areas where user struggles

#### 2. Assessment Mode
- **Structured Tests**: Predefined sets of questions
- **Time Limits**: Optional time constraints per question
- **Scoring System**: Track accuracy and completion rates
- **Performance Analytics**: Progress tracking over time

#### 3. Content Management
- **Markdown Parser**: Extract questions and answers from .md files
- **Content Indexing**: Organize content by topics/difficulty
- **Dynamic Loading**: Load content based on selected topics

#### 4. User Experience
- **Progressive Web App**: Installable, offline-capable
- **Responsive Design**: Works on desktop and mobile
- **Accessibility**: Screen reader support, keyboard navigation
- **Audio Controls**: Adjustable speech rates, volume controls

## File Structure (Following Arabic App Pattern)
```
/src
  /components
    - AudioPlayer.js
    - QuestionDisplay.js
    - AnswerEvaluator.js
    - ProgressTracker.js
    - FeedbackSystem.js
  /utils
    - openaiHelper.js
    - speechUtils.js
    - contentParser.js
    - evaluationUtils.js
  /data
    - *.md files with training content
  App.js
  index.js
/public
  - Audio feedback files
  - Icons and assets
.env (OpenAI API key)
package.json
webpack.config.js
```

## Content Processing Pipeline

### 1. Markdown Parsing
- Extract Q&A pairs from existing .md files
- Maintain metadata (topic, difficulty, source)
- Support multiple answer formats (lists, paragraphs, definitions)

### 2. Question Generation
- Use OpenAI to create variations of questions
- Ensure semantic consistency with original content
- Generate different difficulty levels

### 3. Answer Evaluation
- **Semantic Similarity**: Use OpenAI embeddings to compare answers
- **Keyword Matching**: Essential terms must be present
- **Flexible Scoring**: Allow alternative phrasing while maintaining accuracy
- **Partial Credit**: Score based on completeness and correctness

## User Interaction Flow

### Training Session
1. **Topic Selection**: Choose subject area
2. **Question Presentation**: Audio/visual question display
3. **Voice Input**: User provides spoken answer
4. **Real-time Processing**: Transcribe and evaluate answer
5. **Immediate Feedback**: Show similarity score and corrections
6. **Adaptive Progression**: Move to next question based on performance

### Assessment Session
1. **Test Configuration**: Set parameters (time, questions, topics)
2. **Structured Questioning**: Predefined question sequence
3. **Performance Tracking**: Real-time progress indicators
4. **Final Evaluation**: Comprehensive score and analysis
5. **Review Mode**: Replay questions for improvement

## Key Performance Requirements

### Response Time
- **Question Loading**: < 2 seconds
- **Speech Recognition**: Real-time transcription
- **Answer Evaluation**: < 3 seconds
- **Feedback Display**: Immediate

### Accuracy
- **Speech Recognition**: 95%+ accuracy for clear speech
- **Answer Evaluation**: Consistent semantic matching
- **False Positives**: < 5% incorrect "correct" answers
- **False Negatives**: < 10% incorrect "incorrect" answers

### User Experience
- **Intuitive Interface**: Self-explanatory navigation
- **Error Recovery**: Graceful handling of API failures
- **Offline Capability**: Basic functionality without internet
- **Cross-browser Support**: Chrome, Firefox, Safari, Edge

## Advanced Features

### Personalization
- **Learning Profiles**: Track individual progress
- **Adaptive Difficulty**: Adjust based on performance
- **Custom Content**: User-uploaded training materials
- **Spaced Repetition**: Intelligent review scheduling

### Analytics
- **Progress Tracking**: Detailed performance metrics
- **Weak Areas**: Identify knowledge gaps
- **Time Analytics**: Track learning efficiency
- **Comparative Analysis**: Benchmark against standards

### Integration
- **Export Results**: PDF reports, data export
- **LMS Integration**: Connect with learning management systems
- **Multi-language**: Support for different languages
- **Collaborative Features**: Group study sessions

## Technical Considerations

### Security
- **API Key Protection**: Environment variables only
- **Data Privacy**: No server-side storage of user responses
- **Local Storage**: Minimal data retention
- **HTTPS**: Secure communication

### Performance
- **Lazy Loading**: Load content on demand
- **Caching**: Cache frequently used content
- **Optimization**: Minimize bundle size
- **Error Handling**: Robust error recovery

### Scalability
- **Modular Design**: Easy to add new content types
- **Plugin Architecture**: Extensible evaluation methods
- **Content Versioning**: Track changes to training materials
- **API Rate Limiting**: Efficient API usage

## Success Metrics

### User Engagement
- **Session Duration**: Average 15+ minutes
- **Return Rate**: 70% user return within 7 days
- **Completion Rate**: 80% of started sessions completed

### Learning Effectiveness
- **Improvement Rate**: 20% accuracy increase over 10 sessions
- **Knowledge Retention**: 85% accuracy on review questions
- **Topic Coverage**: Users engage with 80% of available content

### Technical Performance
- **Uptime**: 99.9% availability
- **Load Time**: < 3 seconds initial load
- **Error Rate**: < 1% of user interactions
- **API Efficiency**: Optimal usage of OpenAI tokens

## Development Phases

### Phase 1: Core MVP (4-6 weeks)
- Basic question/answer flow
- Speech recognition integration
- Simple evaluation system
- Markdown content parsing

### Phase 2: Enhanced Training (3-4 weeks)
- Advanced evaluation algorithms
- Progress tracking
- Adaptive difficulty
- Improved UI/UX

### Phase 3: Assessment Mode (2-3 weeks)
- Structured testing
- Performance analytics
- Export capabilities
- Mobile optimization

### Phase 4: Advanced Features (4-6 weeks)
- Personalization
- Advanced analytics
- Collaboration features
- Integration capabilities

## Risk Mitigation

### Technical Risks
- **API Limitations**: Implement fallback evaluation methods
- **Speech Recognition**: Provide text input alternative
- **Browser Compatibility**: Progressive enhancement approach
- **Performance**: Implement caching and optimization

### Content Risks
- **Quality Control**: Automated content validation
- **Version Management**: Track content changes
- **Accuracy**: Human review of auto-generated content
- **Bias**: Diverse training materials and evaluation

### User Experience Risks
- **Learning Curve**: Comprehensive onboarding
- **Accessibility**: Full compliance with WCAG guidelines
- **Device Support**: Cross-platform testing
- **Network Issues**: Offline mode development

This requirements document provides a comprehensive foundation for building an AI tutor that follows the technical patterns from the Arabic app while adding sophisticated educational evaluation capabilities.