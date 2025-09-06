import ContentParser from '../services/ContentParser';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module for testing
jest.mock('fs/promises');

describe('ContentParser', () => {
  let parser;
  
  beforeEach(() => {
    parser = new ContentParser();
    jest.clearAllMocks();
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
          content: '# Introduction\n**AI**: Artificial intelligence systems.',
          module: 'fundamentals',
          lesson: 'intro'
        },
        {
          name: 'ml.md',
          content: '# Machine Learning\n**ML**: Machine learning algorithms.',
          module: 'fundamentals',
          lesson: 'ml'
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
      expect(parser.generateSectionId('AI & ML: Overview')).toBe('ai--ml--overview');
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

  // New tests for enhanced functionality
  describe('AWS Course Structure Detection', () => {
    it('should extract module links from main course file', () => {
      const content = `# AWS AI Practitioner

## [Fundamentals of Machine Learning](./fundamentals/fundamentals.md)
## [AI Use Cases](./ai_usecases/ai_usecases.md)`;

      const links = parser.extractModuleLinks(content);
      
      expect(links).toHaveLength(2);
      expect(links[0].title).toBe('Fundamentals of Machine Learning');
      expect(links[0].path).toBe('./fundamentals/fundamentals.md');
      expect(links[1].title).toBe('AI Use Cases');
      expect(links[1].path).toBe('./ai_usecases/ai_usecases.md');
    });

    it('should extract frontmatter from markdown content', () => {
      const content = `---
title: "Test Lesson"
duration: 30
difficulty: "beginner"
published: true
---

# Test Content`;

      const frontmatter = parser.extractFrontmatter(content);
      
      expect(frontmatter.title).toBe('Test Lesson');
      expect(frontmatter.duration).toBe(30);
      expect(frontmatter.difficulty).toBe('beginner');
      expect(frontmatter.published).toBe(true);
    });

    it('should extract title from markdown content', () => {
      const content = `---
title: "Frontmatter Title"
---

# Main Title

Some content here.`;

      const title = parser.extractTitleFromContent(content);
      expect(title).toBe('Main Title');
    });

    it('should generate URL-friendly slugs', () => {
      expect(parser.generateSlug('Machine Learning Basics')).toBe('machine-learning-basics');
      expect(parser.generateSlug('AI & ML: Overview')).toBe('ai--ml--overview');
      expect(parser.generateSlug('  Spaced Title  ')).toBe('spaced-title');
    });
  });

  describe('Asset Resolution', () => {
    it('should determine asset type from file extension', () => {
      expect(parser.getAssetType('image.jpg')).toBe('image');
      expect(parser.getAssetType('video.mp4')).toBe('video');
      expect(parser.getAssetType('audio.mp3')).toBe('audio');
      expect(parser.getAssetType('document.pdf')).toBe('document');
      expect(parser.getAssetType('unknown.xyz')).toBe('unknown');
    });

    it('should identify asset links', () => {
      expect(parser.isAssetLink('image.jpg')).toBe(true);
      expect(parser.isAssetLink('video.mp4')).toBe(true);
      expect(parser.isAssetLink('lesson.md')).toBe(false);
      expect(parser.isAssetLink('http://example.com')).toBe(false);
    });
  });

  describe('Cross-Reference Extraction', () => {
    it('should extract cross-references from content', () => {
      const parsedContent = {
        sections: new Map([
          ['test.md', [
            {
              id: 'introduction',
              content: 'See [Machine Learning](./ml.md) for more details. Also check [Deep Learning](./dl.md#neural-networks).',
              level: 1,
              title: 'Introduction'
            }
          ]]
        ])
      };

      parser.extractCrossReferences(parsedContent);
      const crossRefs = parser.getCrossReferences();
      
      expect(crossRefs.size).toBeGreaterThan(0);
      
      const refs = Array.from(crossRefs.values());
      const mlRef = refs.find(ref => ref.linkPath === './ml.md');
      const dlRef = refs.find(ref => ref.linkPath === './dl.md#neural-networks');
      
      expect(mlRef).toBeDefined();
      expect(mlRef.linkText).toBe('Machine Learning');
      expect(dlRef).toBeDefined();
      expect(dlRef.anchor).toBe('neural-networks');
    });

    it('should find cross-references to a specific target', () => {
      // Set up some cross-references
      parser.crossReferences.set('ref1', {
        fromFile: 'intro.md',
        linkPath: './target.md',
        linkText: 'Target'
      });
      parser.crossReferences.set('ref2', {
        fromFile: 'chapter1.md',
        linkPath: './target.md#section',
        linkText: 'Target Section'
      });

      const refs = parser.findCrossReferencesTo('./target.md');
      expect(refs).toHaveLength(2);
    });
  });

  describe('Enhanced Key Phrase Extraction', () => {
    it('should extract AWS-specific phrases', () => {
      const content = `Amazon SageMaker is a fully managed service for machine learning.
      Amazon Bedrock provides foundation models for generative AI applications.
      EC2 instances can be used for model training.`;

      const result = parser.parseMarkdownFile(content, 'test.md');
      
      expect(result.keyPhrases.has('amazon sagemaker')).toBe(true);
      expect(result.keyPhrases.has('amazon bedrock')).toBe(true);
      expect(result.keyPhrases.has('machine learning')).toBe(true);
      expect(result.keyPhrases.has('ec2')).toBe(true);
      
      const sagemakerPhrase = result.keyPhrases.get('amazon sagemaker');
      expect(sagemakerPhrase.category).toBe('aws-service');
      expect(sagemakerPhrase.importance).toBe('high');
    });

    it('should categorize phrases correctly', () => {
      expect(parser.categorizePhrase('Amazon S3')).toBe('aws-service');
      expect(parser.categorizePhrase('machine learning')).toBe('ai-ml-concept');
      expect(parser.categorizePhrase('training data')).toBe('ml-process');
      expect(parser.categorizePhrase('general term')).toBe('general-tech');
    });
  });

  describe('Slug Mapping and URL Generation', () => {
    it('should generate slug mappings for course structure', () => {
      const courseStructure = {
        title: 'AWS AI Practitioner',
        modules: [
          {
            slug: 'fundamentals',
            lessons: [
              { slug: 'introduction', path: 'fundamentals/intro.md' },
              { slug: 'basics', path: 'fundamentals/basics.md' }
            ]
          }
        ]
      };

      parser.generateSlugMappings(courseStructure);
      const slugMap = parser.getSlugMappings();
      
      expect(slugMap.get('course')).toBe('aws-ai-practitioner');
      expect(slugMap.get('module:fundamentals')).toBe('aws-ai-practitioner/fundamentals');
      expect(slugMap.get('lesson:fundamentals:introduction')).toBe('aws-ai-practitioner/fundamentals/introduction');
    });

    it('should get canonical URLs for lessons', () => {
      parser.slugMap.set('lesson:fundamentals:introduction', 'aws-ai-practitioner/fundamentals/introduction');
      
      const url = parser.getCanonicalUrl('fundamentals', 'introduction');
      expect(url).toBe('aws-ai-practitioner/fundamentals/introduction');
    });
  });

  describe('Database Export', () => {
    it('should export structured data for database ingestion', () => {
      // Set up some test data
      parser.courseStructure = {
        title: 'AWS AI Practitioner',
        modules: [{ title: 'Test Module', slug: 'test' }]
      };
      
      parser.parsedContent.definitions.set('ai', {
        term: 'AI',
        definition: 'Artificial Intelligence',
        sourceFile: 'test.md',
        module: 'test',
        lesson: 'intro'
      });

      parser.slugMap.set('course', 'aws-ai-practitioner');

      const exported = parser.exportForDatabase();
      
      expect(exported.course.title).toBe('AWS AI Practitioner');
      expect(exported.course.slug).toBe('aws-ai-practitioner');
      expect(exported.definitions).toHaveLength(1);
      expect(exported.definitions[0].term).toBe('AI');
      expect(exported.definitions[0].category).toBe('ai-concept');
    });
  });

  describe('AWS Term Categorization', () => {
    it('should categorize AWS terms correctly', () => {
      expect(parser.categorizeAWSTerm('Amazon S3', 'AWS storage service')).toBe('aws-service');
      expect(parser.categorizeAWSTerm('Machine Learning', 'AI technique')).toBe('ai-concept');
      expect(parser.categorizeAWSTerm('Certification', 'AWS exam')).toBe('certification-term');
      expect(parser.categorizeAWSTerm('Algorithm', 'Technical concept')).toBe('technical-term');
    });
  });
});