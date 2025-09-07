/**
 * QuizGenerator - AWS AI Practitioner specific quiz generation service
 * Generates multiple choice, cloze deletion, and scenario-based questions
 * with detailed explanations and source citations
 */

import KnowledgeMiner from './KnowledgeMiner';

export interface AWSService {
  name: string;
  fullName: string;
  category: string;
  confidence: number;
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  position: number;
  description: string;
}

export interface AWSTerminology {
  term: string;
  definition: string;
  type: 'acronym' | 'technical-term' | 'service-term';
  category: string;
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  confidence: number;
}

export interface LearningObjective {
  id: string;
  text: string;
  type: 'knowledge' | 'application' | 'analysis' | 'synthesis' | 'general';
  context: string;
  sourceFile: string;
  module: string;
  lesson: string;
  confidence: number;
  awsServices: string[];
  concepts: string[];
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'cloze-deletion' | 'scenario-based';
  question: string;
  choices?: Choice[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  awsServices: string[];
  sourceAnchors: SourceAnchor[];
  category: string;
  estimatedTime: number; // seconds
  metadata: QuestionMetadata;
}

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface SourceAnchor {
  file: string;
  module: string;
  lesson: string;
  section?: string;
  paragraph?: number;
  confidence: number;
}

export interface QuestionMetadata {
  createdAt: Date;
  tags: string[];
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  certificationRelevance: number; // 0-1 score
  practicalRelevance: number; // 0-1 score
}

export interface QuizGenerationOptions {
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: ('multiple-choice' | 'cloze-deletion' | 'scenario-based')[];
  awsServices?: string[];
  modules?: string[];
  count?: number;
  focusAreas?: string[];
  excludeUsed?: boolean;
  userPerformance?: UserPerformanceData;
}

export interface UserPerformanceData {
  weakAreas: string[];
  strongAreas: string[];
  averageScore: number;
  recentMistakes: string[];
  preferredDifficulty: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  questions: QuizQuestion[];
  answers: UserAnswer[];
  score: number;
  timeSpent: number;
  completedAt: Date;
  feedback: QuizFeedback;
}

export interface UserAnswer {
  questionId: string;
  answer: string | number;
  timeSpent: number;
  confidence: number; // 1-5 scale
  isCorrect: boolean;
}

export interface QuizFeedback {
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextSteps: string[];
}

class QuizGenerator {
  private knowledgeMiner: KnowledgeMiner;
  private questionTemplates: Map<string, QuestionTemplate>;
  private awsScenarios: AWSScenario[];
  private usedQuestions: Set<string> = new Set();

  constructor(knowledgeMiner: KnowledgeMiner) {
    this.knowledgeMiner = knowledgeMiner;
    this.questionTemplates = new Map();
    this.awsScenarios = [];
    this.initializeTemplates();
    this.initializeScenarios();
  }

  /**
   * Generate quiz questions based on content and options
   */
  async generateQuiz(
    content: string,
    options: QuizGenerationOptions = {}
  ): Promise<QuizQuestion[]> {
    const {
      difficulty = 'mixed',
      questionTypes = ['multiple-choice', 'cloze-deletion', 'scenario-based'],
      count = 10,
      focusAreas = [],
      excludeUsed = true,
      userPerformance
    } = options;

    // Extract knowledge from content
    const knowledge = await this.knowledgeMiner.processContent(content);
    
    const questions: QuizQuestion[] = [];
    const targetCounts = this.distributeQuestionTypes(questionTypes, count);

    // Generate multiple choice questions
    if (targetCounts['multiple-choice'] > 0) {
      const mcQuestions = await this.generateMultipleChoiceQuestions(
        knowledge,
        targetCounts['multiple-choice'],
        difficulty,
        focusAreas,
        userPerformance
      );
      questions.push(...mcQuestions);
    }

    // Generate cloze deletion questions
    if (targetCounts['cloze-deletion'] > 0) {
      const clozeQuestions = await this.generateClozeDeletionQuestions(
        knowledge,
        content,
        targetCounts['cloze-deletion'],
        difficulty,
        focusAreas
      );
      questions.push(...clozeQuestions);
    }

    // Generate scenario-based questions
    if (targetCounts['scenario-based'] > 0) {
      const scenarioQuestions = await this.generateScenarioBasedQuestions(
        knowledge,
        targetCounts['scenario-based'],
        difficulty,
        focusAreas,
        userPerformance
      );
      questions.push(...scenarioQuestions);
    }

    // Filter out used questions if requested
    let filteredQuestions = excludeUsed 
      ? questions.filter(q => !this.usedQuestions.has(q.id))
      : questions;

    // Shuffle and limit to requested count
    filteredQuestions = this.shuffleArray(filteredQuestions).slice(0, count);

    // Mark questions as used
    filteredQuestions.forEach(q => this.usedQuestions.add(q.id));

    return filteredQuestions;
  }

  /**
   * Generate multiple choice questions with AWS-specific scenarios
   */
  private async generateMultipleChoiceQuestions(
    knowledge: any,
    count: number,
    difficulty: string,
    focusAreas: string[],
    userPerformance?: UserPerformanceData
  ): Promise<QuizQuestion[]> {
    const questions: QuizQuestion[] = [];
    const services = Array.from(knowledge.services.values());
    const terminology = Array.from(knowledge.terminology.values());

    // Prioritize weak areas if user performance data is available
    let prioritizedServices = services as AWSService[];
    if (userPerformance?.weakAreas.length) {
      prioritizedServices = (services as AWSService[]).filter((s: AWSService) => 
        userPerformance.weakAreas.some(area => 
          s.name.toLowerCase().includes(area.toLowerCase()) ||
          s.category.toLowerCase().includes(area.toLowerCase())
        )
      );
      if (prioritizedServices.length === 0) prioritizedServices = services as AWSService[];
    }

    // Generate service definition questions
    for (let i = 0; i < Math.min(count * 0.4, prioritizedServices.length); i++) {
      const service = prioritizedServices[i];
      const question = this.createServiceDefinitionMCQ(service, services as AWSService[], difficulty);
      if (question) questions.push(question);
    }

    // Generate service use case questions
    for (let i = 0; i < Math.min(count * 0.3, prioritizedServices.length); i++) {
      const service = prioritizedServices[i];
      const question = this.createServiceUseCaseMCQ(service, services as AWSService[], difficulty);
      if (question) questions.push(question);
    }

    // Generate terminology questions
    for (let i = 0; i < Math.min(count * 0.3, terminology.length); i++) {
      const term = terminology[i] as AWSTerminology;
      const question = this.createTerminologyMCQ(term, terminology as AWSTerminology[], difficulty);
      if (question) questions.push(question);
    }

    return questions.slice(0, count);
  }

  /**
   * Create service definition multiple choice question
   */
  private createServiceDefinitionMCQ(
    service: AWSService,
    allServices: AWSService[],
    difficulty: string
  ): QuizQuestion | null {
    if (!service.description || service.description.length < 20) return null;

    const distractors = this.generateServiceDistractors(service, allServices, 3);
    if (distractors.length < 3) return null;

    const choices: Choice[] = [
      {
        id: 'a',
        text: service.description,
        isCorrect: true,
        explanation: `Correct! ${service.name} ${service.description}`
      },
      ...distractors.map((distractor, index) => ({
        id: String.fromCharCode(98 + index), // b, c, d
        text: distractor.description,
        isCorrect: false,
        explanation: `Incorrect. This describes ${distractor.name}, not ${service.name}.`
      }))
    ];

    // Shuffle choices
    const shuffledChoices = this.shuffleArray(choices);
    const correctIndex = shuffledChoices.findIndex(c => c.isCorrect);

    return {
      id: `mcq_def_${service.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      type: 'multiple-choice',
      question: `What is ${service.name}?`,
      choices: shuffledChoices,
      correctAnswer: correctIndex,
      explanation: `${service.name} is ${service.description}. This AWS service is categorized under ${service.category} and is commonly used for ${this.getServiceUseCases(service)}.`,
      difficulty: this.adjustDifficultyForService(service, difficulty),
      awsServices: [service.name],
      sourceAnchors: [{
        file: service.sourceFile,
        module: service.module,
        lesson: service.lesson,
        confidence: service.confidence
      }],
      category: service.category,
      estimatedTime: 45,
      metadata: {
        createdAt: new Date(),
        tags: ['aws-service', 'definition', service.category],
        bloomsLevel: 'remember',
        certificationRelevance: 0.9,
        practicalRelevance: 0.7
      }
    };
  }

  /**
   * Create service use case multiple choice question
   */
  private createServiceUseCaseMCQ(
    service: AWSService,
    allServices: AWSService[],
    difficulty: string
  ): QuizQuestion | null {
    const scenario = this.getServiceScenario(service);
    if (!scenario) return null;

    const distractors = this.generateServiceDistractors(service, allServices, 3);
    if (distractors.length < 3) return null;

    const choices: Choice[] = [
      {
        id: 'a',
        text: service.name,
        isCorrect: true,
        explanation: `Correct! ${service.name} is the best choice for this scenario because ${scenario.reasoning}`
      },
      ...distractors.map((distractor, index) => ({
        id: String.fromCharCode(98 + index),
        text: distractor.name,
        isCorrect: false,
        explanation: `Incorrect. ${distractor.name} is used for ${this.getServiceUseCases(distractor)}, which doesn't match this scenario.`
      }))
    ];

    const shuffledChoices = this.shuffleArray(choices);
    const correctIndex = shuffledChoices.findIndex(c => c.isCorrect);

    return {
      id: `mcq_use_${service.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      type: 'multiple-choice',
      question: `${scenario.question}\n\nWhich AWS service would be most appropriate for this use case?`,
      choices: shuffledChoices,
      correctAnswer: correctIndex,
      explanation: `${service.name} is the correct choice. ${scenario.reasoning}`,
      difficulty: this.adjustDifficultyForService(service, difficulty),
      awsServices: [service.name],
      sourceAnchors: [{
        file: service.sourceFile,
        module: service.module,
        lesson: service.lesson,
        confidence: service.confidence
      }],
      category: service.category,
      estimatedTime: 60,
      metadata: {
        createdAt: new Date(),
        tags: ['aws-service', 'use-case', service.category, 'scenario'],
        bloomsLevel: 'apply',
        certificationRelevance: 0.95,
        practicalRelevance: 0.9
      }
    };
  }

  /**
   * Create terminology multiple choice question
   */
  private createTerminologyMCQ(
    term: AWSTerminology,
    allTerms: AWSTerminology[],
    difficulty: string
  ): QuizQuestion | null {
    if (!term.definition || term.definition.length < 10) return null;

    const distractors = this.generateTerminologyDistractors(term, allTerms, 3);
    if (distractors.length < 3) return null;

    const choices: Choice[] = [
      {
        id: 'a',
        text: term.definition,
        isCorrect: true,
        explanation: `Correct! ${term.term} is defined as: ${term.definition}`
      },
      ...distractors.map((distractor, index) => ({
        id: String.fromCharCode(98 + index),
        text: distractor.definition,
        isCorrect: false,
        explanation: `Incorrect. This is the definition of ${distractor.term}, not ${term.term}.`
      }))
    ];

    const shuffledChoices = this.shuffleArray(choices);
    const correctIndex = shuffledChoices.findIndex(c => c.isCorrect);

    return {
      id: `mcq_term_${term.term.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      type: 'multiple-choice',
      question: `What does ${term.term} mean?`,
      choices: shuffledChoices,
      correctAnswer: correctIndex,
      explanation: `${term.term} is ${term.definition}. This term is categorized under ${term.category}.`,
      difficulty: this.assessTermDifficulty(term, difficulty),
      awsServices: [],
      sourceAnchors: [{
        file: term.sourceFile,
        module: term.module,
        lesson: term.lesson,
        confidence: term.confidence
      }],
      category: term.category,
      estimatedTime: 30,
      metadata: {
        createdAt: new Date(),
        tags: ['terminology', 'definition', term.category, term.type],
        bloomsLevel: 'remember',
        certificationRelevance: 0.8,
        practicalRelevance: 0.6
      }
    };
  }

  /**
   * Generate cloze deletion questions from content
   */
  private async generateClozeDeletionQuestions(
    knowledge: any,
    content: string,
    count: number,
    difficulty: string,
    focusAreas: string[]
  ): Promise<QuizQuestion[]> {
    const questions: QuizQuestion[] = [];
    const sentences = this.extractKeyDefinitionSentences(content, knowledge);

    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const sentence = sentences[i];
      const clozeQuestion = this.createClozeDeletionQuestion(sentence, difficulty);
      if (clozeQuestion) questions.push(clozeQuestion);
    }

    return questions;
  }

  /**
   * Create cloze deletion question from sentence
   */
  private createClozeDeletionQuestion(
    sentence: KeySentence,
    difficulty: string
  ): QuizQuestion | null {
    const importantTerms = this.identifyImportantTerms(sentence.text);
    if (importantTerms.length === 0) return null;

    // Select term to blank based on difficulty
    const termToBlank = this.selectTermForCloze(importantTerms, difficulty);
    const blankedText = sentence.text.replace(
      new RegExp(`\\b${this.escapeRegex(termToBlank)}\\b`, 'gi'),
      '______'
    );

    return {
      id: `cloze_${sentence.id}_${Date.now()}`,
      type: 'cloze-deletion',
      question: `Complete the following statement:\n\n"${blankedText}"`,
      correctAnswer: termToBlank,
      explanation: `The correct answer is "${termToBlank}". ${sentence.explanation || sentence.text}`,
      difficulty: this.assessClozeDifficulty(termToBlank, difficulty),
      awsServices: sentence.awsServices,
      sourceAnchors: sentence.sourceAnchors,
      category: sentence.category,
      estimatedTime: 30,
      metadata: {
        createdAt: new Date(),
        tags: ['cloze-deletion', 'fill-blank', sentence.category],
        bloomsLevel: 'understand',
        certificationRelevance: 0.85,
        practicalRelevance: 0.7
      }
    };
  }

  /**
   * Generate scenario-based questions with realistic AWS use cases
   */
  private async generateScenarioBasedQuestions(
    knowledge: any,
    count: number,
    difficulty: string,
    focusAreas: string[],
    userPerformance?: UserPerformanceData
  ): Promise<QuizQuestion[]> {
    const questions: QuizQuestion[] = [];
    const relevantScenarios = this.selectRelevantScenarios(
      knowledge,
      focusAreas,
      userPerformance
    );

    for (let i = 0; i < Math.min(count, relevantScenarios.length); i++) {
      const scenario = relevantScenarios[i];
      const scenarioQuestion = this.createScenarioQuestion(scenario, knowledge, difficulty);
      if (scenarioQuestion) questions.push(scenarioQuestion);
    }

    return questions;
  }

  /**
   * Create scenario-based question
   */
  private createScenarioQuestion(
    scenario: AWSScenario,
    knowledge: any,
    difficulty: string
  ): QuizQuestion | null {
    const correctService = scenario.correctService;
    const distractorServices = this.getScenarioDistractors(scenario, knowledge);
    
    if (distractorServices.length < 3) return null;

    const choices: Choice[] = [
      {
        id: 'a',
        text: correctService.name,
        isCorrect: true,
        explanation: `Correct! ${correctService.name} is ideal for this scenario because ${scenario.reasoning}`
      },
      ...distractorServices.slice(0, 3).map((service, index) => ({
        id: String.fromCharCode(98 + index),
        text: service.name,
        isCorrect: false,
        explanation: `Incorrect. While ${service.name} is useful for ${service.category} tasks, it's not the best fit for this specific scenario.`
      }))
    ];

    const shuffledChoices = this.shuffleArray(choices);
    const correctIndex = shuffledChoices.findIndex(c => c.isCorrect);

    return {
      id: `scenario_${scenario.id}_${Date.now()}`,
      type: 'scenario-based',
      question: `${scenario.context}\n\n${scenario.question}`,
      choices: shuffledChoices,
      correctAnswer: correctIndex,
      explanation: `${scenario.reasoning}\n\nKey considerations: ${scenario.keyPoints.join(', ')}`,
      difficulty: scenario.difficulty,
      awsServices: [correctService.name, ...distractorServices.slice(0, 3).map(s => s.name)],
      sourceAnchors: [{
        file: 'scenario',
        module: scenario.module || 'mixed',
        lesson: scenario.lesson || 'scenario',
        confidence: 0.9
      }],
      category: scenario.category,
      estimatedTime: 90,
      metadata: {
        createdAt: new Date(),
        tags: ['scenario', 'real-world', scenario.category, 'decision-making'],
        bloomsLevel: 'analyze',
        certificationRelevance: 0.95,
        practicalRelevance: 0.95
      }
    };
  }

  /**
   * Grade quiz attempt and provide detailed feedback
   */
  gradeQuiz(attempt: Omit<QuizAttempt, 'score' | 'feedback'>): QuizAttempt {
    const { questions, answers } = attempt;
    let correctAnswers = 0;
    const categoryScores: Record<string, { correct: number; total: number }> = {};
    const incorrectQuestions: QuizQuestion[] = [];

    // Grade each answer
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      // Initialize category tracking
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = { correct: 0, total: 0 };
      }
      categoryScores[question.category].total++;

      // Check if answer is correct
      const isCorrect = this.isAnswerCorrect(question, answer.answer);
      answer.isCorrect = isCorrect;

      if (isCorrect) {
        correctAnswers++;
        categoryScores[question.category].correct++;
      } else {
        incorrectQuestions.push(question);
      }
    });

    const overallScore = (correctAnswers / questions.length) * 100;
    const feedback = this.generateQuizFeedback(
      overallScore,
      categoryScores,
      incorrectQuestions,
      attempt.timeSpent
    );

    return {
      ...attempt,
      score: overallScore,
      feedback
    };
  }

  /**
   * Check if user answer is correct
   */
  private isAnswerCorrect(question: QuizQuestion, userAnswer: string | number): boolean {
    if (question.type === 'multiple-choice') {
      return userAnswer === question.correctAnswer;
    } else if (question.type === 'cloze-deletion') {
      const correctAnswer = question.correctAnswer as string;
      const userAnswerStr = userAnswer as string;
      return this.normalizeAnswer(userAnswerStr) === this.normalizeAnswer(correctAnswer);
    } else if (question.type === 'scenario-based') {
      return userAnswer === question.correctAnswer;
    }
    return false;
  }

  /**
   * Generate detailed quiz feedback
   */
  private generateQuizFeedback(
    overallScore: number,
    categoryScores: Record<string, { correct: number; total: number }>,
    incorrectQuestions: QuizQuestion[],
    timeSpent: number
  ): QuizFeedback {
    const categoryPercentages: Record<string, number> = {};
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    // Calculate category percentages
    Object.entries(categoryScores).forEach(([category, scores]) => {
      const percentage = (scores.correct / scores.total) * 100;
      categoryPercentages[category] = percentage;

      if (percentage >= 80) {
        strengths.push(`Strong performance in ${category} (${percentage.toFixed(0)}%)`);
      } else if (percentage < 60) {
        weaknesses.push(`Needs improvement in ${category} (${percentage.toFixed(0)}%)`);
      }
    });

    // Generate recommendations based on performance
    if (overallScore >= 90) {
      recommendations.push("Excellent performance! You're ready for more advanced topics.");
      nextSteps.push("Consider taking practice certification exams");
      nextSteps.push("Explore hands-on AWS labs and projects");
    } else if (overallScore >= 70) {
      recommendations.push("Good understanding of the material with room for improvement.");
      nextSteps.push("Review the topics where you scored below 70%");
      nextSteps.push("Practice more scenario-based questions");
    } else {
      recommendations.push("Focus on fundamental concepts before moving to advanced topics.");
      nextSteps.push("Review course materials for weak areas");
      nextSteps.push("Take additional practice quizzes on basic concepts");
    }

    // Add specific recommendations for weak areas
    incorrectQuestions.forEach(question => {
      if (question.awsServices.length > 0) {
        recommendations.push(`Review ${question.awsServices.join(', ')} documentation`);
      }
    });

    return {
      overallScore,
      categoryScores: categoryPercentages,
      strengths,
      weaknesses,
      recommendations: Array.from(new Set(recommendations)),
      nextSteps: Array.from(new Set(nextSteps))
    };
  }

  // Helper methods and initialization

  private initializeTemplates(): void {
    // Initialize question templates for different AWS service categories
    this.questionTemplates.set('aiml-service-definition', {
      pattern: 'What is {service}?',
      type: 'multiple-choice',
      difficulty: 'easy',
      category: 'aiml'
    });

    this.questionTemplates.set('aiml-use-case', {
      pattern: 'Which AWS service would you use for {use_case}?',
      type: 'multiple-choice',
      difficulty: 'medium',
      category: 'aiml'
    });

    // Add more templates as needed
  }

  private initializeScenarios(): void {
    this.awsScenarios = [
      {
        id: 'image-analysis-scenario',
        category: 'aiml',
        difficulty: 'medium',
        context: 'A retail company wants to automatically analyze product images uploaded by customers to detect inappropriate content and extract product information.',
        question: 'Which AWS service would be most appropriate for this image analysis task?',
        correctService: { name: 'Amazon Rekognition', category: 'aiml' },
        reasoning: 'Amazon Rekognition provides pre-trained computer vision capabilities for image and video analysis, including content moderation and object detection.',
        keyPoints: ['Pre-trained models', 'Content moderation', 'Object detection', 'Easy integration'],
        module: 'ai_usecases',
        lesson: 'computer_vision'
      },
      {
        id: 'text-analysis-scenario',
        category: 'aiml',
        difficulty: 'medium',
        context: 'A customer service team needs to analyze thousands of customer feedback emails to understand sentiment and extract key topics.',
        question: 'Which AWS service would be best for analyzing the sentiment and topics in these emails?',
        correctService: { name: 'Amazon Comprehend', category: 'aiml' },
        reasoning: 'Amazon Comprehend is a natural language processing service that can analyze text for sentiment, entities, key phrases, and topics.',
        keyPoints: ['Natural language processing', 'Sentiment analysis', 'Topic modeling', 'Entity extraction'],
        module: 'ai_usecases',
        lesson: 'natural_language_processing'
      },
      {
        id: 'chatbot-scenario',
        category: 'aiml',
        difficulty: 'medium',
        context: 'A company wants to build an intelligent chatbot that can understand natural language queries and provide conversational responses about their products.',
        question: 'Which AWS service would be most suitable for building this conversational interface?',
        correctService: { name: 'Amazon Lex', category: 'aiml' },
        reasoning: 'Amazon Lex is specifically designed for building conversational interfaces using voice and text, with natural language understanding capabilities.',
        keyPoints: ['Conversational AI', 'Natural language understanding', 'Voice and text support', 'Integration with other AWS services'],
        module: 'ai_usecases',
        lesson: 'conversational_ai'
      }
    ];
  }

  private distributeQuestionTypes(
    types: string[],
    totalCount: number
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    const countPerType = Math.floor(totalCount / types.length);
    const remainder = totalCount % types.length;

    types.forEach((type, index) => {
      distribution[type] = countPerType + (index < remainder ? 1 : 0);
    });

    return distribution;
  }

  private generateServiceDistractors(
    targetService: AWSService,
    allServices: AWSService[],
    count: number
  ): AWSService[] {
    return allServices
      .filter(s => s.name !== targetService.name && s.category === targetService.category)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  private generateTerminologyDistractors(
    targetTerm: AWSTerminology,
    allTerms: AWSTerminology[],
    count: number
  ): AWSTerminology[] {
    return allTerms
      .filter(t => t.term !== targetTerm.term && t.category === targetTerm.category)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  private getServiceScenario(service: AWSService): ServiceScenario | null {
    const scenarios: Record<string, ServiceScenario> = {
      'Amazon Rekognition': {
        question: 'A social media platform needs to automatically detect and moderate inappropriate images uploaded by users.',
        reasoning: 'it provides pre-trained computer vision models for image analysis and content moderation'
      },
      'Amazon Comprehend': {
        question: 'An e-commerce company wants to analyze customer reviews to understand sentiment and extract key topics.',
        reasoning: 'it offers natural language processing capabilities for sentiment analysis and topic modeling'
      },
      'Amazon SageMaker': {
        question: 'A data science team needs to build, train, and deploy custom machine learning models at scale.',
        reasoning: 'it provides a complete platform for the entire machine learning lifecycle'
      }
    };

    return scenarios[service.name] || null;
  }

  private getServiceUseCases(service: AWSService): string {
    const useCases: Record<string, string> = {
      'Amazon Rekognition': 'image and video analysis, facial recognition, content moderation',
      'Amazon Comprehend': 'text analysis, sentiment analysis, entity extraction',
      'Amazon SageMaker': 'building and deploying machine learning models',
      'Amazon Lex': 'building conversational interfaces and chatbots',
      'Amazon Polly': 'text-to-speech conversion',
      'Amazon Transcribe': 'speech-to-text conversion'
    };

    return useCases[service.name] || `${service.category} related tasks`;
  }

  private adjustDifficultyForService(service: AWSService, baseDifficulty: string): 'easy' | 'medium' | 'hard' {
    if (baseDifficulty === 'mixed') {
      // Assign difficulty based on service complexity
      const complexServices = ['Amazon SageMaker', 'Amazon Bedrock'];
      const easyServices = ['Amazon Polly', 'Amazon Transcribe'];
      
      if (complexServices.includes(service.name)) return 'hard';
      if (easyServices.includes(service.name)) return 'easy';
      return 'medium';
    }
    
    return baseDifficulty as 'easy' | 'medium' | 'hard';
  }

  private assessTermDifficulty(term: AWSTerminology, baseDifficulty: string): 'easy' | 'medium' | 'hard' {
    if (baseDifficulty === 'mixed') {
      const complexTerms = ['fine-tuning', 'reinforcement learning', 'transformer'];
      const easyTerms = ['AI', 'ML', 'cloud'];
      
      if (complexTerms.some(ct => term.term.toLowerCase().includes(ct))) return 'hard';
      if (easyTerms.some(et => term.term.toLowerCase().includes(et))) return 'easy';
      return 'medium';
    }
    
    return baseDifficulty as 'easy' | 'medium' | 'hard';
  }

  private extractKeyDefinitionSentences(content: string, knowledge: any): KeySentence[] {
    const sentences: KeySentence[] = [];
    const definitionPatterns = [
      /([A-Z][^.!?]*(?:is|are|refers to|means|involves)[^.!?]*[.!?])/g,
      /([A-Z][^.!?]*(?:AWS|Amazon)[^.!?]*[.!?])/g
    ];

    definitionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const sentence = match[1].trim();
        if (sentence.length > 50 && sentence.length < 300) {
          sentences.push({
            id: `sent_${sentences.length}`,
            text: sentence,
            awsServices: this.extractServicesFromText(sentence),
            category: this.categorizeText(sentence),
            sourceAnchors: [{
              file: 'content',
              module: 'unknown',
              lesson: 'unknown',
              confidence: 0.8
            }],
            explanation: sentence
          });
        }
      }
    });

    return sentences;
  }

  private identifyImportantTerms(text: string): string[] {
    const awsServicePattern = /\b(?:Amazon|AWS)\s+[A-Z][a-zA-Z]+\b/g;
    const technicalTermPattern = /\b(?:machine learning|artificial intelligence|deep learning|neural network|algorithm|model|training|inference|deployment)\b/gi;
    
    const terms: string[] = [];
    let match;

    while ((match = awsServicePattern.exec(text)) !== null) {
      terms.push(match[0]);
    }

    while ((match = technicalTermPattern.exec(text)) !== null) {
      terms.push(match[0]);
    }

    return Array.from(new Set(terms));
  }

  private selectTermForCloze(terms: string[], difficulty: string): string {
    if (difficulty === 'easy') {
      return terms.find(t => t.length < 15) || terms[0];
    } else if (difficulty === 'hard') {
      return terms.find(t => t.length > 20) || terms[terms.length - 1];
    }
    return terms[Math.floor(terms.length / 2)];
  }

  private assessClozeDifficulty(term: string, baseDifficulty: string): 'easy' | 'medium' | 'hard' {
    if (baseDifficulty === 'mixed') {
      if (term.length > 20 || term.includes('learning')) return 'hard';
      if (term.length < 10) return 'easy';
      return 'medium';
    }
    return baseDifficulty as 'easy' | 'medium' | 'hard';
  }

  private selectRelevantScenarios(
    knowledge: any,
    focusAreas: string[],
    userPerformance?: UserPerformanceData
  ): AWSScenario[] {
    let scenarios = [...this.awsScenarios];

    if (focusAreas.length > 0) {
      scenarios = scenarios.filter(s => 
        focusAreas.some(area => s.category.includes(area) || s.keyPoints.some(kp => kp.includes(area)))
      );
    }

    if (userPerformance?.weakAreas.length) {
      scenarios = scenarios.filter(s =>
        userPerformance.weakAreas.some(area => s.category.includes(area))
      );
    }

    return scenarios;
  }

  private getScenarioDistractors(scenario: AWSScenario, knowledge: any): AWSService[] {
    const services = Array.from(knowledge.services.values()) as AWSService[];
    return services
      .filter((s: AWSService) => s.name !== scenario.correctService.name && s.category === scenario.category)
      .sort(() => Math.random() - 0.5);
  }

  private extractServicesFromText(text: string): string[] {
    const servicePattern = /\b(?:Amazon|AWS)\s+[A-Z][a-zA-Z]+\b/g;
    const services: string[] = [];
    let match;

    while ((match = servicePattern.exec(text)) !== null) {
      services.push(match[0]);
    }

    return Array.from(new Set(services));
  }

  private categorizeText(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('machine learning') || lowerText.includes('ai')) return 'aiml';
    if (lowerText.includes('security')) return 'security';
    if (lowerText.includes('storage')) return 'storage';
    if (lowerText.includes('compute')) return 'compute';
    return 'general';
  }

  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Public utility methods
  resetUsedQuestions(): void {
    this.usedQuestions.clear();
  }

  getUsedQuestions(): string[] {
    return Array.from(this.usedQuestions);
  }

  addCustomScenario(scenario: AWSScenario): void {
    this.awsScenarios.push(scenario);
  }
}

// Supporting interfaces
interface QuestionTemplate {
  pattern: string;
  type: string;
  difficulty: string;
  category: string;
}

interface AWSScenario {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  context: string;
  question: string;
  correctService: { name: string; category: string };
  reasoning: string;
  keyPoints: string[];
  module?: string;
  lesson?: string;
}

interface ServiceScenario {
  question: string;
  reasoning: string;
}

interface KeySentence {
  id: string;
  text: string;
  awsServices: string[];
  category: string;
  sourceAnchors: SourceAnchor[];
  explanation?: string;
}

export default QuizGenerator;