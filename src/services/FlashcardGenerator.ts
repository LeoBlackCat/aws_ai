/**
 * FlashcardGenerator - Generate flashcards from extracted AWS terms and concepts
 * Creates various types of cards for spaced repetition learning
 */

import { Card, Term, Lesson, CardType, Difficulty } from '@prisma/client';
import { prisma } from '../lib/prisma';
import KnowledgeMiner from './KnowledgeMiner';

export interface FlashcardTemplate {
  type: CardType;
  front: string;
  back: string;
  hint?: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface GenerationOptions {
  includeBasicCards: boolean;
  includeClozeCards: boolean;
  includeReverseCards: boolean;
  maxCardsPerLesson: number;
  difficultyFilter?: Difficulty[];
  categoryFilter?: string[];
}

export interface GenerationResult {
  generated: number;
  skipped: number;
  errors: string[];
  cards: Card[];
}

class FlashcardGenerator {
  private knowledgeMiner: KnowledgeMiner;

  constructor() {
    this.knowledgeMiner = new KnowledgeMiner();
  }

  /**
   * Generate flashcards from a lesson's content
   */
  async generateFromLesson(
    lessonId: string, 
    options: GenerationOptions = this.getDefaultOptions()
  ): Promise<GenerationResult> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        terms: true,
        module: true
      }
    });

    if (!lesson) {
      throw new Error(`Lesson with id ${lessonId} not found`);
    }

    const result: GenerationResult = {
      generated: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    // Extract additional terms if lesson doesn't have enough
    if (lesson.terms.length < 5) {
      await this.extractAndSaveTerms(lesson);
      // Refetch lesson with updated terms
      const updatedLesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { terms: true, module: true }
      });
      if (updatedLesson) {
        lesson.terms = updatedLesson.terms;
      }
    }

    // Generate cards from terms
    for (const term of lesson.terms) {
      try {
        const templates = this.generateCardTemplates(term, lesson, options);
        
        for (const template of templates) {
          // Check if card already exists
          const existingCard = await prisma.card.findFirst({
            where: {
              termId: term.id,
              type: template.type,
              front: template.front
            }
          });

          if (existingCard) {
            result.skipped++;
            continue;
          }

          // Create new card
          const card = await prisma.card.create({
            data: {
              termId: term.id,
              lessonId: lesson.id,
              type: template.type,
              front: template.front,
              back: template.back,
              hint: template.hint,
              difficulty: template.difficulty,
              tags: template.tags,
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
              nextReview: new Date()
            }
          });

          result.cards.push(card);
          result.generated++;

          // Respect max cards limit
          if (result.generated >= options.maxCardsPerLesson) {
            break;
          }
        }

        if (result.generated >= options.maxCardsPerLesson) {
          break;
        }
      } catch (error) {
        result.errors.push(`Error generating card for term ${term.term}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Generate flashcards from extracted AWS terms and concepts
   */
  async generateFromTerms(
    terms: Term[], 
    lessonId?: string,
    options: GenerationOptions = this.getDefaultOptions()
  ): Promise<GenerationResult> {
    const result: GenerationResult = {
      generated: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    for (const term of terms) {
      try {
        const templates = this.generateCardTemplatesFromTerm(term, options);
        
        for (const template of templates) {
          // Check if card already exists
          const existingCard = await prisma.card.findFirst({
            where: {
              termId: term.id,
              type: template.type,
              front: template.front
            }
          });

          if (existingCard) {
            result.skipped++;
            continue;
          }

          // Create new card
          const card = await prisma.card.create({
            data: {
              termId: term.id,
              lessonId: lessonId,
              type: template.type,
              front: template.front,
              back: template.back,
              hint: template.hint,
              difficulty: template.difficulty,
              tags: template.tags,
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
              nextReview: new Date()
            }
          });

          result.cards.push(card);
          result.generated++;

          // Respect max cards limit
          if (result.generated >= options.maxCardsPerLesson) {
            break;
          }
        }

        if (result.generated >= options.maxCardsPerLesson) {
          break;
        }
      } catch (error) {
        result.errors.push(`Error generating card for term ${term.term}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Generate card templates from a term and lesson context
   */
  private generateCardTemplates(
    term: Term, 
    lesson: Lesson & { module: any }, 
    options: GenerationOptions
  ): FlashcardTemplate[] {
    const templates: FlashcardTemplate[] = [];
    const tags = [lesson.module.slug, term.category, term.difficulty];

    // Filter by difficulty if specified
    if (options.difficultyFilter && !options.difficultyFilter.includes(term.difficulty)) {
      return templates;
    }

    // Filter by category if specified
    if (options.categoryFilter && !options.categoryFilter.includes(term.category)) {
      return templates;
    }

    // Basic card: Term -> Definition
    if (options.includeBasicCards) {
      templates.push({
        type: 'BASIC',
        front: this.formatTermQuestion(term.term),
        back: this.formatDefinitionAnswer(term.definition, term.context ?? undefined),
        hint: this.generateHint(term),
        difficulty: term.difficulty,
        tags
      });
    }

    // Reverse card: Definition -> Term (for AWS services)
    if (options.includeReverseCards && term.category === 'AWS_SERVICE') {
      templates.push({
        type: 'REVERSE',
        front: `What AWS service is described as: "${term.definition}"?`,
        back: term.term,
        hint: this.generateServiceHint(term),
        difficulty: term.difficulty,
        tags: [...tags, 'reverse']
      });
    }

    // Cloze deletion cards
    if (options.includeClozeCards) {
      const clozeTemplates = this.generateClozeTemplates(term);
      templates.push(...clozeTemplates);
    }

    return templates;
  }

  /**
   * Generate card templates from a term only
   */
  private generateCardTemplatesFromTerm(
    term: Term, 
    options: GenerationOptions
  ): FlashcardTemplate[] {
    const templates: FlashcardTemplate[] = [];
    const tags = [term.category, term.difficulty];

    // Filter by difficulty if specified
    if (options.difficultyFilter && !options.difficultyFilter.includes(term.difficulty)) {
      return templates;
    }

    // Filter by category if specified
    if (options.categoryFilter && !options.categoryFilter.includes(term.category)) {
      return templates;
    }

    // Basic card: Term -> Definition
    if (options.includeBasicCards) {
      templates.push({
        type: 'BASIC',
        front: this.formatTermQuestion(term.term),
        back: this.formatDefinitionAnswer(term.definition, term.context ?? undefined),
        hint: this.generateHint(term),
        difficulty: term.difficulty,
        tags
      });
    }

    // Reverse card for AWS services
    if (options.includeReverseCards && term.category === 'AWS_SERVICE') {
      templates.push({
        type: 'REVERSE',
        front: `What AWS service is described as: "${term.definition}"?`,
        back: term.term,
        hint: this.generateServiceHint(term),
        difficulty: term.difficulty,
        tags: [...tags, 'reverse']
      });
    }

    // Cloze deletion cards
    if (options.includeClozeCards) {
      const clozeTemplates = this.generateClozeTemplates(term);
      templates.push(...clozeTemplates);
    }

    return templates;
  }

  /**
   * Generate cloze deletion templates for a term
   */
  private generateClozeTemplates(term: Term): FlashcardTemplate[] {
    const templates: FlashcardTemplate[] = [];
    
    if (!term.definition || term.definition.length < 20) {
      return templates;
    }

    // Cloze deletion for the term itself
    const clozeDefinition = term.definition.replace(
      new RegExp(`\\b${term.term}\\b`, 'gi'), 
      '[...]'
    );
    
    if (clozeDefinition !== term.definition) {
      templates.push({
        type: 'CLOZE',
        front: `Fill in the blank: ${clozeDefinition}`,
        back: term.term,
        hint: `This is an AWS ${term.category.toLowerCase().replace('_', ' ')}`,
        difficulty: term.difficulty,
        tags: [term.category, term.difficulty, 'cloze']
      });
    }

    // Cloze deletion for key features (if definition contains "provides", "enables", etc.)
    const featurePatterns = [
      /provides\s+([^,.]+)/gi,
      /enables\s+([^,.]+)/gi,
      /offers\s+([^,.]+)/gi,
      /supports\s+([^,.]+)/gi
    ];

    featurePatterns.forEach(pattern => {
      const matches = Array.from(term.definition.matchAll(pattern));
      matches.forEach(match => {
        if (match[1] && match[1].length > 5) {
          const clozeText = term.definition.replace(match[1], '[...]');
          templates.push({
            type: 'CLOZE',
            front: `Complete the description: ${clozeText}`,
            back: match[1].trim(),
            hint: `Think about what ${term.term} provides or enables`,
            difficulty: term.difficulty,
            tags: [term.category, term.difficulty, 'cloze', 'features']
          });
        }
      });
    });

    return templates;
  }

  /**
   * Format term as a question
   */
  private formatTermQuestion(term: string): string {
    // Handle acronyms
    if (term.match(/^[A-Z]{2,}$/)) {
      return `What does ${term} stand for?`;
    }
    
    // Handle AWS services
    if (term.includes('AWS') || term.includes('Amazon')) {
      return `What is ${term}?`;
    }
    
    // Handle technical terms
    return `Define: ${term}`;
  }

  /**
   * Format definition as an answer with context
   */
  private formatDefinitionAnswer(definition: string, context?: string): string {
    let answer = definition;
    
    // Add context if available and not too long
    if (context && context.length < 200 && !definition.includes(context)) {
      answer += `\n\nContext: ${context}`;
    }
    
    return answer;
  }

  /**
   * Generate a helpful hint for the term
   */
  private generateHint(term: Term): string {
    switch (term.category) {
      case 'AWS_SERVICE':
        return `This is an AWS service in the ${this.categorizeAWSService(term.term)} category`;
      case 'AI_CONCEPT':
        return 'This is an AI/ML concept';
      case 'TECHNICAL_TERM':
        return 'This is a technical term';
      case 'BUSINESS_CONCEPT':
        return 'This is a business concept';
      case 'CERTIFICATION_TERM':
        return 'This term is important for AWS certification';
      default:
        return 'Think about the AWS AI Practitioner course content';
    }
  }

  /**
   * Generate a hint for AWS service reverse cards
   */
  private generateServiceHint(term: Term): string {
    const serviceCategory = this.categorizeAWSService(term.term);
    return `This is an AWS ${serviceCategory} service`;
  }

  /**
   * Categorize AWS service for better hints
   */
  private categorizeAWSService(serviceName: string): string {
    const name = serviceName.toLowerCase();
    
    if (name.includes('sagemaker') || name.includes('bedrock') || name.includes('rekognition') || 
        name.includes('comprehend') || name.includes('textract') || name.includes('polly') ||
        name.includes('lex') || name.includes('kendra') || name.includes('personalize')) {
      return 'AI/ML';
    } else if (name.includes('ec2') || name.includes('lambda') || name.includes('fargate')) {
      return 'compute';
    } else if (name.includes('s3') || name.includes('ebs') || name.includes('efs')) {
      return 'storage';
    } else if (name.includes('rds') || name.includes('dynamodb') || name.includes('aurora')) {
      return 'database';
    } else if (name.includes('iam') || name.includes('cognito') || name.includes('kms')) {
      return 'security';
    }
    
    return 'cloud';
  }

  /**
   * Extract and save terms from lesson content
   */
  private async extractAndSaveTerms(lesson: Lesson & { module: any }): Promise<void> {
    const extractionResult = await this.knowledgeMiner.processContent(lesson.content, {
      sourceFile: lesson.slug,
      module: lesson.module.slug,
      lesson: lesson.title
    });

    // Save extracted terms to database
    for (const [, termData] of extractionResult.terminology) {
      try {
        await prisma.term.upsert({
          where: {
            term_category: {
              term: termData.term,
              category: this.mapTermCategory(termData.category)
            }
          },
          update: {
            definition: termData.definition,
            context: termData.context,
            lessonId: lesson.id
          },
          create: {
            term: termData.term,
            definition: termData.definition,
            category: this.mapTermCategory(termData.category),
            context: termData.context,
            lessonId: lesson.id,
            difficulty: this.mapDifficulty(termData.confidence)
          }
        });
      } catch (error) {
        console.error(`Error saving term ${termData.term}:`, error);
      }
    }

    // Save AWS services as terms
    for (const [, serviceData] of extractionResult.services) {
      try {
        await prisma.term.upsert({
          where: {
            term_category: {
              term: serviceData.name,
              category: 'AWS_SERVICE'
            }
          },
          update: {
            definition: serviceData.description,
            context: serviceData.context,
            lessonId: lesson.id
          },
          create: {
            term: serviceData.name,
            definition: serviceData.description,
            category: 'AWS_SERVICE',
            context: serviceData.context,
            lessonId: lesson.id,
            difficulty: this.mapDifficulty(serviceData.confidence)
          }
        });
      } catch (error) {
        console.error(`Error saving AWS service ${serviceData.name}:`, error);
      }
    }
  }

  /**
   * Map knowledge miner category to Prisma enum
   */
  private mapTermCategory(category: string): any {
    const categoryMap: Record<string, string> = {
      'aws-service': 'AWS_SERVICE',
      'ai-ml-concept': 'AI_CONCEPT',
      'ml-process': 'AI_CONCEPT',
      'general-tech': 'TECHNICAL_TERM',
      'security': 'TECHNICAL_TERM',
      'data-storage': 'TECHNICAL_TERM',
      'networking': 'TECHNICAL_TERM'
    };
    
    return categoryMap[category] || 'TECHNICAL_TERM';
  }

  /**
   * Map confidence score to difficulty level
   */
  private mapDifficulty(confidence: number): Difficulty {
    if (confidence >= 0.8) return 'BEGINNER';
    if (confidence >= 0.6) return 'INTERMEDIATE';
    if (confidence >= 0.4) return 'ADVANCED';
    return 'EXPERT';
  }

  /**
   * Get default generation options
   */
  private getDefaultOptions(): GenerationOptions {
    return {
      includeBasicCards: true,
      includeClozeCards: true,
      includeReverseCards: true,
      maxCardsPerLesson: 50
    };
  }

  /**
   * Generate flashcards for all lessons in a course
   */
  async generateForCourse(
    courseId: string, 
    options: GenerationOptions = this.getDefaultOptions()
  ): Promise<GenerationResult> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    const totalResult: GenerationResult = {
      generated: 0,
      skipped: 0,
      errors: [],
      cards: []
    };

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        try {
          const lessonResult = await this.generateFromLesson(lesson.id, options);
          
          totalResult.generated += lessonResult.generated;
          totalResult.skipped += lessonResult.skipped;
          totalResult.errors.push(...lessonResult.errors);
          totalResult.cards.push(...lessonResult.cards);
        } catch (error) {
          totalResult.errors.push(`Error processing lesson ${lesson.title}: ${error}`);
        }
      }
    }

    return totalResult;
  }

  /**
   * Update existing cards with improved content
   */
  async updateExistingCards(lessonId: string): Promise<number> {
    const cards = await prisma.card.findMany({
      where: { lessonId },
      include: { term: true }
    });

    let updatedCount = 0;

    for (const card of cards) {
      if (!card.term) continue;

      try {
        const templates = this.generateCardTemplatesFromTerm(card.term, this.getDefaultOptions());
        const matchingTemplate = templates.find(t => t.type === card.type);

        if (matchingTemplate && matchingTemplate.front !== card.front) {
          await prisma.card.update({
            where: { id: card.id },
            data: {
              front: matchingTemplate.front,
              back: matchingTemplate.back,
              hint: matchingTemplate.hint,
              tags: matchingTemplate.tags,
              updatedAt: new Date()
            }
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating card ${card.id}:`, error);
      }
    }

    return updatedCount;
  }
}

export default FlashcardGenerator;