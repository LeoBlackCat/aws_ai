import ContentParser from '../services/ContentParser';

describe('ContentParser', () => {
  let parser;
  
  beforeEach(() => {
    parser = new ContentParser();
  });

  describe('parseMarkdownFile', () => {
    it('should extract sections from markdown content', () => {
      const content = `# Introduction
This is the introduction.

## Machine Learning
Machine learning is a subset of AI.

### Deep Learning
Deep learning uses neural networks.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].title).toBe('Introduction');
      expect(result.sections[0].level).toBe(1);
      expect(result.sections[1].title).toBe('Machine Learning');
      expect(result.sections[1].level).toBe(2);
    });

    it('should extract definitions from bold text', () => {
      const content = `**Machine Learning**: A subset of artificial intelligence that enables computers to learn.
      
**Deep Learning** is a method that uses neural networks with multiple layers.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.definitions.size).toBeGreaterThan(0);
      expect(result.definitions.has('machine learning')).toBe(true);
      expect(result.definitions.get('machine learning').definition).toContain('subset of artificial intelligence');
    });

    it('should extract definitions from "is/are" patterns', () => {
      const content = `Artificial Intelligence is the simulation of human intelligence in machines.
      
Neural networks are computing systems inspired by biological neural networks.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.definitions.size).toBeGreaterThan(0);
      expect(result.definitions.has('artificial intelligence')).toBe(true);
      expect(result.definitions.get('artificial intelligence').definition).toContain('simulation of human intelligence');
    });

    it('should extract concepts from headers and emphasis', () => {
      const content = `# Machine Learning Fundamentals

This section covers **supervised learning** and **unsupervised learning**.

## Neural Networks
Neural networks are important.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.concepts.size).toBeGreaterThan(0);
      expect(result.concepts.has('machine learning fundamentals')).toBe(true);
      expect(result.concepts.has('supervised learning')).toBe(true);
      expect(result.concepts.has('neural networks')).toBe(true);
    });

    it('should extract key phrases', () => {
      const content = `Machine learning and artificial intelligence are transforming industries.
      
Deep learning models use neural networks for complex pattern recognition.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.keyPhrases.size).toBeGreaterThan(0);
      expect(result.keyPhrases.has('machine learning')).toBe(true);
      expect(result.keyPhrases.has('artificial intelligence')).toBe(true);
      expect(result.keyPhrases.has('deep learning')).toBe(true);
    });
  });

  describe('generateQuestionBank', () => {
    it('should generate questions from parsed content', () => {
      const parsedContent = {
        definitions: new Map([
          ['machine learning', {
            term: 'Machine Learning',
            definition: 'A subset of artificial intelligence that enables computers to learn.',
            sourceFile: 'test.md',
            context: 'test context'
          }]
        ]),
        concepts: new Map([
          ['neural networks', {
            concept: 'Neural Networks',
            type: 'header',
            context: 'Neural networks are computing systems.',
            sourceFile: 'test.md'
          }]
        ]),
        keyPhrases: new Map()
      };

      const questions = parser.generateQuestionBank(parsedContent);
      
      expect(questions.length).toBeGreaterThan(0);
      
      // Should have definition questions
      const defQuestion = questions.find(q => q.type === 'definition');
      expect(defQuestion).toBeDefined();
      expect(defQuestion.question).toContain('What is');
      expect(defQuestion.expectedAnswer).toContain('subset of artificial intelligence');
      
      // Should have explanation questions
      const expQuestion = questions.find(q => q.type === 'explanation');
      expect(expQuestion).toBeDefined();
      expect(expQuestion.question).toContain('Explain');
      
      // Should have concept questions
      const conceptQuestion = questions.find(q => q.type === 'concept');
      expect(conceptQuestion).toBeDefined();
      expect(conceptQuestion.question).toContain('What can you tell me about');
    });

    it('should assign difficulty levels', () => {
      const parsedContent = {
        definitions: new Map([
          ['ai', {
            term: 'AI',
            definition: 'Artificial intelligence.',
            sourceFile: 'test.md',
            context: 'test context'
          }],
          ['complex algorithm', {
            term: 'Complex Algorithm',
            definition: 'A sophisticated computational procedure that involves multiple optimization techniques and advanced mathematical concepts for solving intricate problems.',
            sourceFile: 'test.md',
            context: 'test context'
          }]
        ]),
        concepts: new Map(),
        keyPhrases: new Map()
      };

      const questions = parser.generateQuestionBank(parsedContent);
      
      const easyQuestion = questions.find(q => q.term === 'AI');
      const hardQuestion = questions.find(q => q.term === 'Complex Algorithm');
      
      expect(easyQuestion.difficulty).toBe('easy');
      expect(hardQuestion.difficulty).toBe('hard');
    });
  });

  describe('validation methods', () => {
    it('should validate definitions correctly', () => {
      expect(parser.isValidDefinition('AI', 'Artificial intelligence systems.')).toBe(true);
      expect(parser.isValidDefinition('A', 'Short term.')).toBe(false); // Term too short
      expect(parser.isValidDefinition('Valid term', 'Short.')).toBe(false); // Definition too short
      expect(parser.isValidDefinition('Term\nwith\nlines', 'Valid definition here.')).toBe(false); // Term has newlines
    });

    it('should validate concepts correctly', () => {
      expect(parser.isValidConcept('Machine Learning')).toBe(true);
      expect(parser.isValidConcept('AI')).toBe(false); // Too short
      expect(parser.isValidConcept('The machine learning')).toBe(false); // Starts with article
      expect(parser.isValidConcept('1. First item')).toBe(false); // Numbered list item
    });
  });

  describe('parseMarkdownFiles', () => {
    it('should parse multiple files and merge content', () => {
      const files = [
        {
          name: 'intro.md',
          content: '# Introduction\n**AI**: Artificial intelligence systems.'
        },
        {
          name: 'ml.md',
          content: '# Machine Learning\n**ML**: Machine learning algorithms.'
        }
      ];

      const result = parser.parseMarkdownFiles(files);
      
      expect(result.definitions.size).toBe(2);
      expect(result.definitions.has('ai')).toBe(true);
      expect(result.definitions.has('ml')).toBe(true);
      expect(result.definitions.get('ai').sourceFile).toBe('intro.md');
      expect(result.definitions.get('ml').sourceFile).toBe('ml.md');
      
      expect(result.sections.size).toBe(2);
      expect(result.sections.has('intro.md')).toBe(true);
      expect(result.sections.has('ml.md')).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should generate section IDs correctly', () => {
      expect(parser.generateSectionId('Machine Learning Basics')).toBe('machine-learning-basics');
      expect(parser.generateSectionId('AI & ML: Overview')).toBe('ai--ml-overview');
      expect(parser.generateSectionId('  Spaced Title  ')).toBe('spaced-title');
    });

    it('should extract context around matches', () => {
      const content = 'This is a long piece of content with some important information in the middle that we want to extract context for.';
      const index = content.indexOf('important information');
      
      const context = parser.extractContext(content, index);
      
      expect(context).toContain('important information');
      expect(context.length).toBeLessThanOrEqual(400); // 200 chars on each side
    });

    it('should assess difficulty correctly', () => {
      expect(parser.assessDifficulty('Simple text.')).toBe('easy');
      expect(parser.assessDifficulty('This is a medium length explanation with some details.')).toBe('medium');
      expect(parser.assessDifficulty('This is a complex algorithm implementation that requires sophisticated optimization techniques.')).toBe('hard');
    });
  });
});