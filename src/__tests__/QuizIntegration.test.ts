/**
 * Integration tests for the complete quiz generation and assessment system
 */

import QuizGenerator from '../services/QuizGenerator';
import QuizAssessment from '../services/QuizAssessment';

// Mock KnowledgeMiner for integration tests
class MockKnowledgeMiner {
  async processContent(content: string) {
    return {
      services: new Map([
        ['amazon rekognition', {
          name: 'Amazon Rekognition',
          fullName: 'Amazon Rekognition',
          category: 'aiml',
          confidence: 0.9,
          context: 'Amazon Rekognition is a computer vision service',
          sourceFile: 'ai_usecases.md',
          module: 'ai_usecases',
          lesson: 'computer_vision',
          position: 100,
          description: 'A computer vision service that analyzes images and videos'
        }],
        ['amazon comprehend', {
          name: 'Amazon Comprehend',
          fullName: 'Amazon Comprehend',
          category: 'aiml',
          confidence: 0.9,
          context: 'Amazon Comprehend is a natural language processing service',
          sourceFile: 'ai_usecases.md',
          module: 'ai_usecases',
          lesson: 'nlp',
          position: 200,
          description: 'A natural language processing service for text analysis'
        }]
      ]),
      terminology: new Map([
        ['machine learning', {
          term: 'Machine Learning',
          definition: 'A type of AI that enables computers to learn without being explicitly programmed',
          type: 'technical-term' as const,
          category: 'ai-ml-concept',
          context: 'Machine learning is a subset of artificial intelligence',
          sourceFile: 'fundamentals.md',
          module: 'fundamentals',
          lesson: 'ml_fundamentals',
          confidence: 0.95
        }]
      ]),
      objectives: [],
      conceptMap: new Map(),
      summary: {
        servicesCount: 2,
        terminologyCount: 1,
        objectivesCount: 0,
        conceptsCount: 0
      }
    };
  }
}

describe('Quiz System Integration', () => {
  let quizGenerator: QuizGenerator;
  let quizAssessment: QuizAssessment;

  const sampleContent = `
    Amazon Rekognition is a computer vision service that makes it easy to add image and video analysis to your applications.
    Amazon Comprehend is a natural language processing (NLP) service that uses machine learning to find insights and relationships in text.
    Machine Learning is a type of artificial intelligence (AI) that enables computers to learn without being explicitly programmed.
  `;

  beforeEach(() => {
    const mockKnowledgeMiner = new MockKnowledgeMiner();
    quizGenerator = new QuizGenerator(mockKnowledgeMiner as any);
    quizAssessment = new QuizAssessment();
  });

  describe('End-to-End Quiz Flow', () => {
    it('should generate, take, and grade a complete quiz', async () => {
      // Step 1: Generate a quiz
      const questions = await quizGenerator.generateQuiz(sampleContent, {
        count: 3,
        difficulty: 'medium'
      });

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(3);

      // Step 2: Simulate user answers
      const userAnswers = questions.map((question, index) => ({
        questionId: question.id,
        answer: question.type === 'multiple-choice' ? 0 : 'test answer',
        timeSpent: 30 + Math.random() * 30, // 30-60 seconds per question
        confidence: 3 + Math.floor(Math.random() * 3), // 3-5 confidence
        isCorrect: false // Will be determined during grading
      }));

      // Step 3: Create quiz attempt
      const attempt = {
        id: 'test_attempt_1',
        userId: 'test_user',
        quizId: 'test_quiz_1',
        questions,
        answers: userAnswers,
        timeSpent: userAnswers.reduce((total, answer) => total + answer.timeSpent, 0),
        completedAt: new Date()
      };

      // Step 4: Grade the quiz
      const gradedAttempt = quizAssessment.gradeQuizAttempt(attempt);

      // Verify grading results
      expect(gradedAttempt.score).toBeGreaterThanOrEqual(0);
      expect(gradedAttempt.score).toBeLessThanOrEqual(100);
      expect(gradedAttempt.feedback).toBeDefined();
      expect(gradedAttempt.feedback.overallScore).toBe(gradedAttempt.score);
      expect(Array.isArray(gradedAttempt.feedback.strengths)).toBe(true);
      expect(Array.isArray(gradedAttempt.feedback.weaknesses)).toBe(true);
      expect(Array.isArray(gradedAttempt.feedback.recommendations)).toBe(true);
      expect(Array.isArray(gradedAttempt.feedback.nextSteps)).toBe(true);

      // Verify answers were marked as correct/incorrect
      gradedAttempt.answers.forEach(answer => {
        expect(typeof answer.isCorrect).toBe('boolean');
      });
    });

    it('should provide certification readiness assessment', async () => {
      // Generate and complete multiple quizzes to build history
      for (let i = 0; i < 3; i++) {
        const questions = await quizGenerator.generateQuiz(sampleContent, { count: 2 });
        
        if (questions.length > 0) {
          const userAnswers = questions.map(question => ({
            questionId: question.id,
            answer: question.type === 'multiple-choice' ? 0 : 'correct answer',
            timeSpent: 45,
            confidence: 4,
            isCorrect: false
          }));

          const attempt = {
            id: `attempt_${i}`,
            userId: 'test_user',
            quizId: `quiz_${i}`,
            questions,
            answers: userAnswers,
            timeSpent: 90,
            completedAt: new Date()
          };

          quizAssessment.gradeQuizAttempt(attempt);
        }
      }

      // Get certification readiness
      const readiness = quizAssessment.assessCertificationReadiness('test_user');

      expect(readiness).toBeDefined();
      expect(readiness.overallReadiness).toBeGreaterThanOrEqual(0);
      expect(readiness.overallReadiness).toBeLessThanOrEqual(100);
      expect(readiness.estimatedPassProbability).toBeGreaterThanOrEqual(0);
      expect(readiness.estimatedPassProbability).toBeLessThanOrEqual(100);
      expect(readiness.recommendedStudyTime).toBeGreaterThan(0);
      expect(['not-ready', 'needs-work', 'almost-ready', 'ready']).toContain(readiness.readinessLevel);
      expect(Array.isArray(readiness.weakestDomains)).toBe(true);
    });

    it('should handle different question types correctly', async () => {
      // Test each question type individually
      const questionTypes = ['multiple-choice', 'cloze-deletion', 'scenario-based'] as const;

      for (const questionType of questionTypes) {
        const questions = await quizGenerator.generateQuiz(sampleContent, {
          questionTypes: [questionType],
          count: 2
        });

        // Verify questions of the requested type were generated (if possible)
        const questionsOfType = questions.filter(q => q.type === questionType);
        
        if (questionsOfType.length > 0) {
          questionsOfType.forEach(question => {
            expect(question.type).toBe(questionType);
            expect(question.id).toBeTruthy();
            expect(question.question).toBeTruthy();
            expect(question.explanation).toBeTruthy();
            expect(question.difficulty).toMatch(/^(easy|medium|hard)$/);
            expect(question.estimatedTime).toBeGreaterThan(0);
            expect(question.metadata).toBeDefined();
            expect(question.sourceAnchors).toBeDefined();

            if (questionType === 'multiple-choice' || questionType === 'scenario-based') {
              expect(question.choices).toHaveLength(4);
              expect(typeof question.correctAnswer).toBe('number');
            } else if (questionType === 'cloze-deletion') {
              expect(typeof question.correctAnswer).toBe('string');
            }
          });
        }
      }
    });

    it('should adapt to user performance over time', async () => {
      const userId = 'adaptive_test_user';
      
      // Simulate poor performance initially
      let questions = await quizGenerator.generateQuiz(sampleContent, { count: 2 });
      
      if (questions.length > 0) {
        const poorAnswers = questions.map(question => ({
          questionId: question.id,
          answer: question.type === 'multiple-choice' ? 999 : 'wrong answer', // Intentionally wrong
          timeSpent: 60,
          confidence: 2,
          isCorrect: false
        }));

        const poorAttempt = {
          id: 'poor_attempt',
          userId,
          quizId: 'poor_quiz',
          questions,
          answers: poorAnswers,
          timeSpent: 120,
          completedAt: new Date()
        };

        const gradedPoorAttempt = quizAssessment.gradeQuizAttempt(poorAttempt);
        
        // Should have low score and recommendations for improvement
        expect(gradedPoorAttempt.score).toBeLessThan(50);
        expect(gradedPoorAttempt.feedback.weaknesses.length).toBeGreaterThan(0);
        expect(gradedPoorAttempt.feedback.recommendations.length).toBeGreaterThan(0);
      }

      // Simulate improved performance
      questions = await quizGenerator.generateQuiz(sampleContent, { count: 2 });
      
      if (questions.length > 0) {
        const goodAnswers = questions.map(question => ({
          questionId: question.id,
          answer: question.type === 'multiple-choice' ? question.correctAnswer : question.correctAnswer,
          timeSpent: 30,
          confidence: 5,
          isCorrect: false // Will be determined during grading
        }));

        const goodAttempt = {
          id: 'good_attempt',
          userId,
          quizId: 'good_quiz',
          questions,
          answers: goodAnswers,
          timeSpent: 60,
          completedAt: new Date()
        };

        const gradedGoodAttempt = quizAssessment.gradeQuizAttempt(goodAttempt);
        
        // Should have better score and different recommendations
        expect(gradedGoodAttempt.feedback).toBeDefined();
        expect(gradedGoodAttempt.feedback.nextSteps.length).toBeGreaterThan(0);
      }
    });

    it('should provide detailed explanations and source citations', async () => {
      const questions = await quizGenerator.generateQuiz(sampleContent, { count: 2 });

      questions.forEach(question => {
        // Every question should have an explanation
        expect(question.explanation).toBeTruthy();
        expect(question.explanation.length).toBeGreaterThan(10);

        // Every question should have source anchors
        expect(question.sourceAnchors).toBeDefined();
        expect(question.sourceAnchors.length).toBeGreaterThan(0);

        question.sourceAnchors.forEach(anchor => {
          expect(anchor.file).toBeTruthy();
          expect(anchor.confidence).toBeGreaterThan(0);
          expect(anchor.confidence).toBeLessThanOrEqual(1);
        });

        // Multiple choice questions should have explanations for each choice
        if (question.type === 'multiple-choice' && question.choices) {
          question.choices.forEach(choice => {
            expect(choice.explanation).toBeTruthy();
          });
        }
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = sampleContent.repeat(10); // Simulate larger content
      
      const startTime = Date.now();
      const questions = await quizGenerator.generateQuiz(largeContent, { count: 5 });
      const endTime = Date.now();

      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(Array.isArray(questions)).toBe(true);
    });

    it('should handle concurrent quiz generation', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        quizGenerator.generateQuiz(sampleContent, { count: 2 })
      );

      const results = await Promise.all(promises);
      
      results.forEach(questions => {
        expect(Array.isArray(questions)).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty or invalid content gracefully', async () => {
      const emptyQuestions = await quizGenerator.generateQuiz('', { count: 5 });
      expect(Array.isArray(emptyQuestions)).toBe(true);

      const invalidQuestions = await quizGenerator.generateQuiz('   \n\t   ', { count: 5 });
      expect(Array.isArray(invalidQuestions)).toBe(true);
    });

    it('should handle invalid quiz options gracefully', async () => {
      const questions = await quizGenerator.generateQuiz(sampleContent, {
        count: -1,
        difficulty: 'invalid' as any,
        questionTypes: ['invalid-type'] as any
      });

      expect(Array.isArray(questions)).toBe(true);
    });

    it('should handle grading with missing or invalid data', async () => {
      const questions = await quizGenerator.generateQuiz(sampleContent, { count: 1 });
      
      if (questions.length > 0) {
        // Test with missing answers
        const incompleteAttempt = {
          id: 'incomplete',
          userId: 'test_user',
          quizId: 'test_quiz',
          questions,
          answers: [], // No answers provided
          timeSpent: 0,
          completedAt: new Date()
        };

        const gradedIncomplete = quizAssessment.gradeQuizAttempt(incompleteAttempt);
        expect(gradedIncomplete.score).toBe(0);
        expect(gradedIncomplete.feedback).toBeDefined();
      }
    });
  });
});