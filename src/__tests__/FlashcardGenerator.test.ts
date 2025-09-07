/**
 * Tests for FlashcardGenerator service
 */

import FlashcardGenerator from '../services/FlashcardGenerator';
import KnowledgeMiner from '../services/KnowledgeMiner';
import { prisma } from '../lib/prisma';
import { Term, Lesson, Card } from '@prisma/client';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  prisma: {
    lesson: {
      findUnique: jest.fn(),
    },
    card: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    term: {
      upsert: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../services/KnowledgeMiner');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const MockKnowledgeMiner = KnowledgeMiner as jest.MockedClass<typeof KnowledgeMiner>;

describe('FlashcardGenerator', () => {
  let generator: FlashcardGenerator;
  let mockKnowledgeMiner: jest.Mocked<KnowledgeMiner>;

  beforeEach(() => {
    generator = new FlashcardGenerator();
    mockKnowledgeMiner = new MockKnowledgeMiner() as jest.Mocked<KnowledgeMiner>;
    (generator as any).knowledgeMiner = mockKnowledgeMiner;
    jest.clearAllMocks();
  });

  describe('generateFromLesson', () => {
    const mockLesson = {
      id: 'lesson-1',
      moduleId: 'module-1',
      title: 'AWS AI Services',
      slug: 'aws-ai-services',
      content: 'Amazon SageMaker is a fully managed service...',
      htmlContent: '<p>Amazon SageMaker is a fully managed service...</p>',
      frontmatter: {},
      order: 1,
      estimatedReadTime: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      module: {
        id: 'module-1',
        slug: 'ai-services',
        title: 'AI Services',
      },
      terms: [
        {
          id: 'term-1',
          term: 'Amazon SageMaker',
          definition: 'A fully managed service that provides developers and data scientists with the ability to build, train, and deploy machine learning models quickly.',
          category: 'AWS_SERVICE',
          sourceAnchor: null,
          context: 'Amazon SageMaker is a fully managed service that provides developers...',
          awsServiceId: null,
          lessonId: 'lesson-1',
          difficulty: 'INTERMEDIATE',
          frequency: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'term-2',
          term: 'Machine Learning',
          definition: 'A subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.',
          category: 'AI_CONCEPT',
          sourceAnchor: null,
          context: 'Machine learning is a subset of artificial intelligence...',
          awsServiceId: null,
          lessonId: 'lesson-1',
          difficulty: 'BEGINNER',
          frequency: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it('should generate flashcards from lesson terms', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.card.findFirst.mockResolvedValue(null); // No existing cards
      mockPrisma.card.create.mockResolvedValue({
        id: 'card-1',
        termId: 'term-1',
        lessonId: 'lesson-1',
        type: 'BASIC',
        front: 'What is Amazon SageMaker?',
        back: 'A fully managed service that provides developers and data scientists with the ability to build, train, and deploy machine learning models quickly.',
        hint: 'This is an AWS service in the AI/ML category',
        difficulty: 'INTERMEDIATE',
        tags: ['ai-services', 'AWS_SERVICE', 'INTERMEDIATE'],
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Card);

      const result = await generator.generateFromLesson('lesson-1');

      expect(result.generated).toBeGreaterThan(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.cards).toHaveLength(result.generated);
      expect(mockPrisma.card.create).toHaveBeenCalled();
    });

    it('should skip existing cards', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.card.findFirst.mockResolvedValue({
        id: 'existing-card',
        termId: 'term-1',
        type: 'BASIC',
        front: 'What is Amazon SageMaker?',
      } as Card);

      const result = await generator.generateFromLesson('lesson-1');

      expect(result.skipped).toBeGreaterThan(0);
      expect(mockPrisma.card.create).not.toHaveBeenCalled();
    });

    it('should extract additional terms if lesson has few terms', async () => {
      const lessonWithFewTerms = {
        ...mockLesson,
        terms: [mockLesson.terms[0]], // Only one term
      };

      mockPrisma.lesson.findUnique
        .mockResolvedValueOnce(lessonWithFewTerms as any)
        .mockResolvedValueOnce(mockLesson as any); // After extraction

      mockKnowledgeMiner.processContent.mockResolvedValue({
        services: new Map([
          ['sagemaker', {
            name: 'SageMaker',
            description: 'Machine learning service',
            category: 'aiml',
            confidence: 0.9,
            context: 'SageMaker is used for ML',
            sourceFile: 'test',
            module: 'test',
            lesson: 'test',
            position: 0,
            fullName: 'Amazon SageMaker'
          }]
        ]),
        terminology: new Map([
          ['ml', {
            term: 'ML',
            definition: 'Machine Learning',
            type: 'acronym' as const,
            category: 'ai-ml-concept',
            context: 'ML is machine learning',
            sourceFile: 'test',
            module: 'test',
            lesson: 'test',
            confidence: 0.8
          }]
        ]),
        objectives: [],
        conceptMap: new Map(),
        summary: {
          servicesCount: 1,
          terminologyCount: 1,
          objectivesCount: 0,
          conceptsCount: 0
        }
      });

      mockPrisma.term.upsert.mockResolvedValue({} as Term);
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      await generator.generateFromLesson('lesson-1');

      expect(mockKnowledgeMiner.processContent).toHaveBeenCalled();
      expect(mockPrisma.term.upsert).toHaveBeenCalled();
    });

    it('should respect maxCardsPerLesson limit', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      const options = {
        includeBasicCards: true,
        includeClozeCards: true,
        includeReverseCards: true,
        maxCardsPerLesson: 2,
      };

      const result = await generator.generateFromLesson('lesson-1', options);

      expect(result.generated).toBeLessThanOrEqual(2);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(mockLesson as any);
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockRejectedValue(new Error('Database error'));

      const result = await generator.generateFromLesson('lesson-1');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should throw error for non-existent lesson', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValue(null);

      await expect(generator.generateFromLesson('non-existent')).rejects.toThrow(
        'Lesson with id non-existent not found'
      );
    });
  });

  describe('Card Template Generation', () => {
    const mockTerm: Term = {
      id: 'term-1',
      term: 'Amazon EC2',
      definition: 'Amazon Elastic Compute Cloud provides scalable computing capacity in the AWS cloud.',
      category: 'AWS_SERVICE',
      sourceAnchor: null,
      context: 'Amazon EC2 provides scalable computing capacity...',
      awsServiceId: null,
      lessonId: 'lesson-1',
      difficulty: 'BEGINNER',
      frequency: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate basic card template', async () => {
      const result = await generator.generateFromTerms([mockTerm], 'lesson-1', {
        includeBasicCards: true,
        includeClozeCards: false,
        includeReverseCards: false,
        maxCardsPerLesson: 10,
      });

      expect(result.generated).toBeGreaterThan(0);
      expect(mockPrisma.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'BASIC',
          front: expect.stringContaining('Amazon EC2'),
          back: expect.stringContaining('scalable computing capacity'),
        }),
      });
    });

    it('should generate reverse card for AWS services', async () => {
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      const result = await generator.generateFromTerms([mockTerm], 'lesson-1', {
        includeBasicCards: false,
        includeClozeCards: false,
        includeReverseCards: true,
        maxCardsPerLesson: 10,
      });

      expect(result.generated).toBeGreaterThan(0);
      expect(mockPrisma.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'REVERSE',
          front: expect.stringContaining('What AWS service is described as'),
          back: 'Amazon EC2',
        }),
      });
    });

    it('should generate cloze deletion cards', async () => {
      const termWithLongDefinition: Term = {
        ...mockTerm,
        definition: 'Amazon EC2 provides scalable computing capacity and enables users to run virtual servers in the cloud.',
      };

      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      const result = await generator.generateFromTerms([termWithLongDefinition], 'lesson-1', {
        includeBasicCards: false,
        includeClozeCards: true,
        includeReverseCards: false,
        maxCardsPerLesson: 10,
      });

      expect(result.generated).toBeGreaterThan(0);
      expect(mockPrisma.card.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CLOZE',
          front: expect.stringContaining('[...]'),
        }),
      });
    });

    it('should filter by difficulty', async () => {
      const advancedTerm: Term = {
        ...mockTerm,
        difficulty: 'ADVANCED',
      };

      const result = await generator.generateFromTerms([advancedTerm], 'lesson-1', {
        includeBasicCards: true,
        includeClozeCards: false,
        includeReverseCards: false,
        maxCardsPerLesson: 10,
        difficultyFilter: ['BEGINNER', 'INTERMEDIATE'],
      });

      expect(result.generated).toBe(0);
      expect(mockPrisma.card.create).not.toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      const result = await generator.generateFromTerms([mockTerm], 'lesson-1', {
        includeBasicCards: true,
        includeClozeCards: false,
        includeReverseCards: false,
        maxCardsPerLesson: 10,
        categoryFilter: ['AI_CONCEPT'],
      });

      expect(result.generated).toBe(0);
      expect(mockPrisma.card.create).not.toHaveBeenCalled();
    });
  });

  describe('generateForCourse', () => {
    const mockCourse = {
      id: 'course-1',
      title: 'AWS AI Practitioner',
      modules: [
        {
          id: 'module-1',
          lessons: [
            { id: 'lesson-1', title: 'Lesson 1' },
            { id: 'lesson-2', title: 'Lesson 2' },
          ],
        },
      ],
    };

    it('should generate flashcards for all lessons in course', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      mockPrisma.lesson.findUnique.mockResolvedValue({
        ...mockLesson,
        terms: [mockLesson.terms[0]], // One term per lesson
      } as any);
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      const result = await generator.generateForCourse('course-1');

      expect(result.generated).toBeGreaterThan(0);
      expect(mockPrisma.lesson.findUnique).toHaveBeenCalledTimes(2); // Two lessons
    });

    it('should handle course not found', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      await expect(generator.generateForCourse('non-existent')).rejects.toThrow(
        'Course with id non-existent not found'
      );
    });

    it('should accumulate results from all lessons', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      mockPrisma.lesson.findUnique.mockResolvedValue({
        ...mockLesson,
        terms: [mockLesson.terms[0]],
      } as any);
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue({} as Card);

      const result = await generator.generateForCourse('course-1');

      expect(result.cards.length).toBe(result.generated);
      expect(result.errors).toBeInstanceOf(Array);
    });
  });

  describe('updateExistingCards', () => {
    it('should update existing cards with improved content', async () => {
      const mockCards = [
        {
          id: 'card-1',
          type: 'BASIC',
          front: 'Old question format',
          back: 'Old answer',
          term: {
            id: 'term-1',
            term: 'Amazon S3',
            definition: 'Simple Storage Service',
            category: 'AWS_SERVICE',
            difficulty: 'BEGINNER',
          },
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as any);
      mockPrisma.card.update.mockResolvedValue({} as Card);

      const updatedCount = await generator.updateExistingCards('lesson-1');

      expect(updatedCount).toBeGreaterThan(0);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: expect.objectContaining({
          front: expect.not.stringMatching('Old question format'),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should skip cards without terms', async () => {
      const mockCards = [
        {
          id: 'card-1',
          type: 'BASIC',
          front: 'Question',
          back: 'Answer',
          term: null,
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as any);

      const updatedCount = await generator.updateExistingCards('lesson-1');

      expect(updatedCount).toBe(0);
      expect(mockPrisma.card.update).not.toHaveBeenCalled();
    });
  });

  describe('Term Processing', () => {
    it('should map knowledge miner categories correctly', () => {
      const generator = new FlashcardGenerator();
      
      // Test private method through reflection
      const mapCategory = (generator as any).mapTermCategory;
      
      expect(mapCategory('aws-service')).toBe('AWS_SERVICE');
      expect(mapCategory('ai-ml-concept')).toBe('AI_CONCEPT');
      expect(mapCategory('general-tech')).toBe('TECHNICAL_TERM');
      expect(mapCategory('unknown-category')).toBe('TECHNICAL_TERM');
    });

    it('should map confidence to difficulty correctly', () => {
      const generator = new FlashcardGenerator();
      
      // Test private method through reflection
      const mapDifficulty = (generator as any).mapDifficulty;
      
      expect(mapDifficulty(0.9)).toBe('BEGINNER');
      expect(mapDifficulty(0.7)).toBe('INTERMEDIATE');
      expect(mapDifficulty(0.5)).toBe('ADVANCED');
      expect(mapDifficulty(0.3)).toBe('EXPERT');
    });
  });
});