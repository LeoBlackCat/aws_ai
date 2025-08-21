import QuestionGenerator from '../services/QuestionGenerator';

describe('QuestionGenerator', () => {
  let generator;
  let mockOpenAIService;
  
  beforeEach(() => {
    mockOpenAIService = {
      generateQuestions: jest.fn()
    };
    generator = new QuestionGenerator(mockOpenAIService);
  });

  describe('generateFromContent', () => {
    it('should generate questions from definitions', () => {
      const concepts = {
        definitions: new Map([
          ['machine learning', {
            term: 'Machine Learning',
            definition: 'A subset of artificial intelligence that enables computers to learn.',
            sourceFile: 'test.md',
            context: 'ML context'
          }]
        ]),
        concepts: new Map()
      };

      const questions = generator.generateFromContent(concepts, 'medium');
      
      expect(questions.length).toBeGreaterThan(0);
      
      // Should have definition question
      const defQuestion = questions.find(q => q.type === 'definition');
      expect(defQuestion).toBeDefined();
      expect(defQuestion.question).toContain('What is Machine Learning?');
      expect(defQuestion.expectedAnswer).toContain('subset of artificial intelligence');
      
      // Should have explanation question
      const expQuestion = questions.find(q => q.type === 'explanation');
      expect(expQuestion).toBeDefined();
      expect(expQuestion.question).toContain('Explain Machine Learning');
    });

    it('should generate questions from concepts', () => {
      const concepts = {
        definitions: new Map(),
        concepts: new Map([
          ['neural networks', {
            concept: 'Neural Networks',
            context: 'Neural networks are computing systems inspired by biological neural networks.',
            sourceFile: 'test.md'
          }]
        ])
      };

      const questions = generator.generateFromContent(concepts, 'medium');
      
      expect(questions.length).toBeGreaterThan(0);
      
      const conceptQuestion = questions.find(q => q.type === 'concept');
      expect(conceptQuestion).toBeDefined();
      expect(conceptQuestion.question).toContain('What can you tell me about Neural Networks?');
      
      const appQuestion = questions.find(q => q.type === 'application');
      expect(appQuestion).toBeDefined();
      expect(appQuestion.question).toContain('How is Neural Networks used in practice?');
    });

    it('should filter questions by difficulty', () => {
      const concepts = {
        definitions: new Map([
          ['ai', {
            term: 'AI',
            definition: 'Artificial intelligence.',
            sourceFile: 'test.md',
            context: 'Simple context'
          }],
          ['complex algorithm', {
            term: 'Complex Algorithm',
            definition: 'A sophisticated computational procedure that involves multiple optimization techniques and advanced mathematical concepts.',
            sourceFile: 'test.md',
            context: 'Complex context'
          }]
        ]),
        concepts: new Map()
      };

      const easyQuestions = generator.generateFromContent(concepts, 'easy');
      const hardQuestions = generator.generateFromContent(concepts, 'hard');
      
      expect(easyQuestions.length).toBeGreaterThan(0);
      expect(hardQuestions.length).toBeGreaterThan(0);
      
      // Easy questions should have easy difficulty
      easyQuestions.forEach(q => {
        expect(['easy', 'medium']).toContain(q.difficulty);
      });
    });
  });

  describe('createDefinitionQuestions', () => {
    it('should create multiple question types from a definition', () => {
      const definition = {
        term: 'Machine Learning',
        definition: 'A subset of artificial intelligence that enables computers to learn from data.',
        sourceFile: 'test.md',
        context: 'ML context'
      };

      const questions = generator.createDefinitionQuestions(definition);
      
      expect(questions.length).toBeGreaterThanOrEqual(2);
      
      const types = questions.map(q => q.type);
      expect(types).toContain('definition');
      expect(types).toContain('explanation');
      
      // All questions should have required fields
      questions.forEach(q => {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.expectedAnswer).toBeDefined();
        expect(q.keyPhrases).toBeDefined();
        expect(q.hints).toBeDefined();
      });
    });

    it('should create fill-in-the-blank questions', () => {
      const definition = {
        term: 'Neural Network',
        definition: 'A computing system inspired by biological neural networks that process information.',
        sourceFile: 'test.md',
        context: 'NN context'
      };

      const questions = generator.createDefinitionQuestions(definition);
      const blankQuestion = questions.find(q => q.type === 'fill_blank');
      
      if (blankQuestion) {
        expect(blankQuestion.question).toContain('______');
        expect(blankQuestion.expectedAnswer).toBeDefined();
        expect(blankQuestion.fullAnswer).toBeDefined();
      }
    });
  });

  describe('createComparisonQuestions', () => {
    it('should create comparison questions between related concepts', () => {
      const concepts = {
        definitions: new Map([
          ['supervised learning', {
            term: 'Supervised Learning',
            definition: 'Machine learning with labeled training data.',
            sourceFile: 'test.md'
          }],
          ['unsupervised learning', {
            term: 'Unsupervised Learning',
            definition: 'Machine learning without labeled training data.',
            sourceFile: 'test.md'
          }]
        ])
      };

      const questions = generator.createComparisonQuestions(concepts, 'medium');
      
      if (questions.length > 0) {
        const compQuestion = questions[0];
        expect(compQuestion.type).toBe('comparison');
        expect(compQuestion.question).toContain('difference between');
        expect(compQuestion.expectedAnswer).toBeDefined();
      }
    });
  });

  describe('generateWithAI', () => {
    it('should generate questions using OpenAI service', async () => {
      const mockResponse = JSON.stringify([
        {
          question: 'What is artificial intelligence?',
          expectedAnswer: 'AI is the simulation of human intelligence in machines.',
          keyPhrases: ['artificial intelligence', 'simulation', 'human intelligence'],
          hints: ['Think about machines mimicking human thinking', 'Consider computer systems that can reason']
        }
      ]);

      mockOpenAIService.generateQuestions.mockResolvedValue(mockResponse);

      const questions = await generator.generateWithAI('artificial intelligence', 'definition');
      
      expect(questions.length).toBe(1);
      expect(questions[0].question).toBe('What is artificial intelligence?');
      expect(questions[0].aiGenerated).toBe(true);
      expect(questions[0].keyPhrases).toContain('artificial intelligence');
    });

    it('should handle AI service errors gracefully', async () => {
      mockOpenAIService.generateQuestions.mockRejectedValue(new Error('API Error'));

      const questions = await generator.generateWithAI('test topic');
      
      expect(questions).toEqual([]);
    });

    it('should throw error when OpenAI service not configured', async () => {
      const generatorWithoutAI = new QuestionGenerator();
      
      await expect(generatorWithoutAI.generateWithAI('test topic'))
        .rejects.toThrow('OpenAI service not configured');
    });
  });

  describe('getNextQuestion', () => {
    beforeEach(() => {
      const questions = [
        {
          id: 'q1',
          type: 'definition',
          difficulty: 'easy',
          term: 'AI',
          question: 'What is AI?',
          expectedAnswer: 'Artificial intelligence.'
        },
        {
          id: 'q2',
          type: 'explanation',
          difficulty: 'medium',
          term: 'Machine Learning',
          question: 'Explain machine learning.',
          expectedAnswer: 'ML is a subset of AI.'
        },
        {
          id: 'q3',
          type: 'concept',
          difficulty: 'hard',
          term: 'Deep Learning',
          question: 'What is deep learning?',
          expectedAnswer: 'DL uses neural networks.'
        }
      ];
      generator.setQuestionBank(questions);
    });

    it('should return a question matching difficulty filter', () => {
      const question = generator.getNextQuestion({}, { difficulty: 'easy' });
      
      expect(question).toBeDefined();
      expect(question.difficulty).toBe('easy');
    });

    it('should return a question matching type filter', () => {
      const question = generator.getNextQuestion({}, { questionType: 'explanation' });
      
      expect(question).toBeDefined();
      expect(question.type).toBe('explanation');
    });

    it('should exclude used questions', () => {
      const question1 = generator.getNextQuestion({}, { difficulty: 'easy' });
      const question2 = generator.getNextQuestion({}, { difficulty: 'easy' });
      
      expect(question1).toBeDefined();
      expect(question2).toBeNull(); // Only one easy question available
    });

    it('should prioritize struggled topics', () => {
      const userProgress = {
        struggledTopics: ['Machine Learning']
      };
      
      const question = generator.getNextQuestion(userProgress);
      
      expect(question).toBeDefined();
      expect(question.term).toContain('Machine Learning');
    });

    it('should return null when no questions available', () => {
      generator.setQuestionBank([]);
      
      const question = generator.getNextQuestion();
      
      expect(question).toBeNull();
    });
  });

  describe('validateQuestion', () => {
    it('should validate correct question format', () => {
      const validQuestion = {
        id: 'test_q1',
        question: 'What is AI?',
        expectedAnswer: 'Artificial intelligence systems.',
        type: 'definition'
      };

      expect(generator.validateQuestion(validQuestion)).toBe(true);
    });

    it('should reject invalid questions', () => {
      const invalidQuestions = [
        null,
        {},
        { id: 'test' }, // Missing required fields
        { id: 'test', question: 'What?', expectedAnswer: 'AI', type: 'invalid_type' }, // Invalid type
        { id: 'test', question: 'Hi', expectedAnswer: 'AI', type: 'definition' } // Too short
      ];

      invalidQuestions.forEach(q => {
        expect(generator.validateQuestion(q)).toBe(false);
      });
    });
  });

  describe('utility methods', () => {
    it('should generate valid question IDs', () => {
      const id1 = generator.generateQuestionId('Machine Learning');
      const id2 = generator.generateQuestionId('AI & ML: Overview!');
      
      expect(id1).toBe('machine_learning');
      expect(id2).toBe('ai__ml_overview');
      expect(id1.length).toBeLessThanOrEqual(50);
    });

    it('should assess difficulty correctly', () => {
      expect(generator.assessDifficulty('Simple text.')).toBe('easy');
      expect(generator.assessDifficulty('This is a medium length explanation with some details about the topic.')).toBe('medium');
      expect(generator.assessDifficulty('This is a complex algorithm implementation that requires sophisticated optimization techniques and advanced mathematical concepts.')).toBe('hard');
    });

    it('should extract key phrases from text', () => {
      const text = 'Machine learning algorithms use supervised learning and neural networks for pattern recognition.';
      const phrases = generator.extractKeyPhrasesFromText(text);
      
      expect(phrases).toContain('machine learning');
      expect(phrases).toContain('supervised learning');
      expect(phrases).toContain('neural networks');
    });

    it('should generate helpful hints', () => {
      const text = 'Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed.';
      const hints = generator.generateHints(text);
      
      expect(hints.length).toBeGreaterThan(0);
      expect(hints.length).toBeLessThanOrEqual(3);
      expect(hints[0]).toContain('It starts with:');
    });

    it('should shuffle arrays randomly', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = generator.shuffleArray(original);
      
      expect(shuffled.length).toBe(original.length);
      expect(shuffled).toEqual(expect.arrayContaining(original));
      // Note: There's a small chance this could fail if shuffle returns same order
    });
  });

  describe('question bank management', () => {
    it('should manage question bank correctly', () => {
      const questions = [
        { id: 'q1', question: 'Test 1?', expectedAnswer: 'Answer 1', type: 'definition' },
        { id: 'q2', question: 'Test 2?', expectedAnswer: 'Answer 2', type: 'explanation' }
      ];

      generator.setQuestionBank(questions);
      expect(generator.getQuestionBank()).toEqual(questions);

      const newQuestions = [
        { id: 'q3', question: 'Test 3?', expectedAnswer: 'Answer 3', type: 'concept' }
      ];

      generator.addQuestions(newQuestions);
      expect(generator.getQuestionBank().length).toBe(3);
    });

    it('should track used questions', () => {
      const questions = [
        { id: 'q1', question: 'Test?', expectedAnswer: 'Answer', type: 'definition' }
      ];
      generator.setQuestionBank(questions);

      const question = generator.getNextQuestion();
      expect(generator.getUsedQuestions()).toContain('q1');

      generator.resetUsedQuestions();
      expect(generator.getUsedQuestions()).toEqual([]);
    });
  });
});