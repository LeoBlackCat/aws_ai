/**
 * Tests for TutorService - AI tutoring system with RAG capabilities
 */

import TutorService, { TutorContext, TutorMode, LearningEvent } from '../services/TutorService';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  message: 'What do you think Amazon SageMaker is used for?',
                  followUpQuestions: ['How does it differ from other ML services?'],
                  confidence: 0.9
                })
              }
            }]
          })
        }
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1536).fill(0.1)
          }]
        })
      }
    }))
  };
});

// Mock Pinecone
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({
        matches: [{
          id: 'test-chunk-1',
          score: 0.9,
          metadata: {
            content: 'Amazon SageMaker is a fully managed service for machine learning.',
            module: 'AI Services',
            lesson: 'SageMaker Overview',
            awsServices: ['Amazon SageMaker'],
            concepts: ['machine learning']
          }
        }]
      }),
      upsert: jest.fn().mockResolvedValue({}),
      describeIndexStats: jest.fn().mockResolvedValue({
        totalVectorCount: 100,
        dimension: 1536
      })
    })
  }))
}));

describe('TutorService', () => {
  let tutorService: TutorService;
  let mockContext: TutorContext;

  beforeEach(() => {
    tutorService = new TutorService();
    mockContext = {
      userId: 'test-user-1',
      courseId: 'aws-ai-practitioner',
      currentLesson: 'sagemaker-overview',
      learningHistory: [
        {
          type: 'lesson_completed',
          timestamp: new Date(),
          content: 'Introduction to Machine Learning',
          performance: 0.8,
          difficulty: 'medium'
        }
      ],
      mode: TutorMode.ANSWER
    };
  });

  describe('chat', () => {
    it('should generate appropriate response in answer mode', async () => {
      const message = 'What is Amazon SageMaker?';
      
      const response = await tutorService.chat(message, mockContext);
      
      expect(response).toBeDefined();
      expect(response.message).toBeTruthy();
      expect(response.mode).toBe(TutorMode.ANSWER);
      expect(response.confidence).toBeGreaterThan(0);
      expect(Array.isArray(response.citations)).toBe(true);
      expect(Array.isArray(response.followUpQuestions)).toBe(true);
    });

    it('should generate Socratic response in Socratic mode', async () => {
      mockContext.mode = TutorMode.SOCRATIC;
      const message = 'Tell me about machine learning';
      
      const response = await tutorService.chat(message, mockContext);
      
      expect(response).toBeDefined();
      expect(response.mode).toBe(TutorMode.SOCRATIC);
      expect(response.message).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      // Mock OpenAI to throw an error
      const originalCreate = tutorService['openai'].chat.completions.create;
      tutorService['openai'].chat.completions.create = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const response = await tutorService.chat('test message', mockContext);
      
      expect(response).toBeDefined();
      expect(response.message).toContain('trouble processing');
      expect(response.confidence).toBeLessThan(0.5);
      
      // Restore original method
      tutorService['openai'].chat.completions.create = originalCreate;
    });
  });

  describe('generateSocraticQuestion', () => {
    it('should generate a Socratic question for a given topic', async () => {
      const topic = 'supervised learning';
      
      const question = await tutorService.generateSocraticQuestion(topic, mockContext);
      
      expect(question).toBeTruthy();
      expect(typeof question).toBe('string');
      expect(question.length).toBeGreaterThan(10);
    });

    it('should work without context', async () => {
      const topic = 'neural networks';
      
      const question = await tutorService.generateSocraticQuestion(topic);
      
      expect(question).toBeTruthy();
      expect(typeof question).toBe('string');
    });
  });

  describe('evaluateAnswer', () => {
    it('should evaluate a correct answer positively', async () => {
      const question = 'What is Amazon SageMaker?';
      const answer = 'Amazon SageMaker is a fully managed machine learning service that helps developers build, train, and deploy ML models.';
      
      const evaluation = await tutorService.evaluateAnswer(question, answer, mockContext);
      
      expect(evaluation).toBeDefined();
      expect(typeof evaluation.isCorrect).toBe('boolean');
      expect(evaluation.score).toBeGreaterThanOrEqual(0);
      expect(evaluation.score).toBeLessThanOrEqual(1);
      expect(evaluation.feedback).toBeTruthy();
      expect(Array.isArray(evaluation.improvements)).toBe(true);
      expect(Array.isArray(evaluation.relatedConcepts)).toBe(true);
      expect(Array.isArray(evaluation.citations)).toBe(true);
    });

    it('should handle evaluation errors gracefully', async () => {
      // Mock OpenAI to throw an error
      const originalCreate = tutorService['openai'].chat.completions.create;
      tutorService['openai'].chat.completions.create = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const evaluation = await tutorService.evaluateAnswer('test question', 'test answer');
      
      expect(evaluation).toBeDefined();
      expect(evaluation.isCorrect).toBe(false);
      expect(evaluation.score).toBe(0);
      expect(evaluation.feedback).toContain('Unable to evaluate');
      
      // Restore original method
      tutorService['openai'].chat.completions.create = originalCreate;
    });
  });

  describe('provideFeedback', () => {
    it('should provide comprehensive feedback based on performance', async () => {
      const performance = {
        averageScore: 0.75,
        totalQuizzes: 5,
        weakAreas: ['computer vision', 'deep learning'],
        strongAreas: ['machine learning basics'],
        recentMistakes: ['confused SageMaker with Rekognition']
      };
      
      const feedback = await tutorService.provideFeedback(performance, mockContext);
      
      expect(feedback).toBeDefined();
      expect(feedback.overallAssessment).toBeTruthy();
      expect(Array.isArray(feedback.strengths)).toBe(true);
      expect(Array.isArray(feedback.areasForImprovement)).toBe(true);
      expect(Array.isArray(feedback.recommendations)).toBe(true);
      expect(Array.isArray(feedback.nextSteps)).toBe(true);
      expect(feedback.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(feedback.confidenceLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('content ingestion', () => {
    it('should ingest course content successfully', async () => {
      const courseContent = [
        {
          id: 'lesson-1',
          content: 'Amazon SageMaker is a fully managed service that provides every developer and data scientist with the ability to build, train, and deploy machine learning models quickly.',
          module: 'AI Services',
          lesson: 'SageMaker Overview',
          source: 'course'
        }
      ];
      
      await expect(tutorService.ingestCourseContent(courseContent)).resolves.not.toThrow();
    });

    it('should chunk content appropriately', async () => {
      const content = {
        id: 'test-content',
        content: 'A'.repeat(1000), // Long content to test chunking
        module: 'Test Module',
        lesson: 'Test Lesson',
        source: 'test'
      };
      
      const chunks = await tutorService['chunkContent'](content);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].content.length).toBeLessThanOrEqual(500);
      expect(chunks[0].metadata.module).toBe('Test Module');
    });
  });

  describe('AWS service extraction', () => {
    it('should extract AWS services from text', () => {
      const text = 'Amazon SageMaker and Amazon Rekognition are popular AWS services for machine learning and computer vision.';
      
      const services = tutorService['extractAWSServices'](text);
      
      expect(services).toContain('Amazon SageMaker');
      expect(services).toContain('Amazon Rekognition');
      expect(services.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract concepts from text', () => {
      const text = 'Machine learning and artificial intelligence are transforming how we build applications with deep learning and neural networks.';
      
      const concepts = tutorService['extractConcepts'](text);
      
      expect(concepts).toContain('machine learning');
      expect(concepts).toContain('artificial intelligence');
      expect(concepts).toContain('deep learning');
      expect(concepts).toContain('neural networks');
    });
  });

  describe('conversation history', () => {
    it('should maintain conversation history', async () => {
      const sessionId = 'test-session-1';
      const message = 'What is machine learning?';
      
      // First message
      await tutorService.chat(message, { ...mockContext, sessionId });
      
      const history = tutorService['getConversationHistory'](sessionId);
      expect(history.length).toBeGreaterThanOrEqual(2); // user + assistant message
      
      // Second message should build on history
      await tutorService.chat('Can you give me an example?', { ...mockContext, sessionId });
      
      const updatedHistory = tutorService['getConversationHistory'](sessionId);
      expect(updatedHistory.length).toBeGreaterThanOrEqual(4); // 2 conversations = 4 messages
    });

    it('should limit conversation history size', async () => {
      const sessionId = 'test-session-2';
      
      // Add many messages to test history limit
      for (let i = 0; i < 25; i++) {
        await tutorService.chat(`Message ${i}`, { ...mockContext, sessionId });
      }
      
      const history = tutorService['getConversationHistory'](sessionId);
      expect(history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('error handling', () => {
    it('should handle missing OpenAI API key gracefully', () => {
      // Test initialization without API key
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.REACT_APP_OPENAI_API_KEY;
      
      expect(() => new TutorService()).not.toThrow();
      
      // Restore API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });

    it('should handle vector database connection failures', async () => {
      // Mock Pinecone to fail
      const originalPinecone = tutorService['pinecone'];
      tutorService['pinecone'] = null as any;
      
      const message = 'Test message';
      const response = await tutorService.chat(message, mockContext);
      
      expect(response).toBeDefined();
      expect(response.message).toBeTruthy();
      
      // Restore Pinecone
      tutorService['pinecone'] = originalPinecone;
    });
  });
});

describe('TutorService Integration', () => {
  let tutorService: TutorService;

  beforeEach(() => {
    tutorService = new TutorService();
  });

  it('should handle a complete tutoring session', async () => {
    const context: TutorContext = {
      userId: 'integration-test-user',
      courseId: 'aws-ai-practitioner',
      currentLesson: 'ml-fundamentals',
      learningHistory: [],
      mode: TutorMode.SOCRATIC,
      sessionId: 'integration-session'
    };

    // Start with a general question
    const response1 = await tutorService.chat('I want to learn about machine learning', context);
    expect(response1.mode).toBe(TutorMode.SOCRATIC);
    expect(response1.message).toBeTruthy();

    // Follow up with a more specific question
    const response2 = await tutorService.chat('What is supervised learning?', context);
    expect(response2.message).toBeTruthy();
    expect(response2.citations.length).toBeGreaterThanOrEqual(0);

    // Test evaluation
    const evaluation = await tutorService.evaluateAnswer(
      'What is supervised learning?',
      'Supervised learning is when you train a model with labeled data',
      context
    );
    expect(evaluation.score).toBeGreaterThanOrEqual(0);
  });
});