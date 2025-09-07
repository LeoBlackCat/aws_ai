/**
 * TutorService - AI-powered tutoring system with RAG capabilities
 * Provides Socratic questioning, answer evaluation, and contextual help
 * using OpenAI GPT-4 and vector database for course content retrieval
 */

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

export interface TutorContext {
  userId: string;
  courseId: string;
  currentLesson?: string;
  learningHistory: LearningEvent[];
  mode: TutorMode;
  sessionId?: string;
}

export interface LearningEvent {
  type: 'lesson_completed' | 'quiz_attempted' | 'card_reviewed' | 'question_asked';
  timestamp: Date;
  content: string;
  performance?: number; // 0-1 score
  difficulty?: string;
}

export interface TutorResponse {
  message: string;
  citations: Citation[];
  followUpQuestions: string[];
  confidence: number;
  mode: TutorMode;
  suggestedActions?: SuggestedAction[];
}

export interface Citation {
  source: string;
  module: string;
  lesson: string;
  section?: string;
  paragraph?: number;
  relevanceScore: number;
  excerpt: string;
}

export interface SuggestedAction {
  type: 'review_lesson' | 'take_quiz' | 'practice_cards' | 'explore_topic';
  title: string;
  description: string;
  url?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Evaluation {
  isCorrect: boolean;
  score: number; // 0-1
  feedback: string;
  improvements: string[];
  relatedConcepts: string[];
  citations: Citation[];
}

export interface Feedback {
  overallAssessment: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  nextSteps: string[];
  confidenceLevel: number;
}

export interface ContentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    module: string;
    lesson: string;
    section?: string;
    paragraph?: number;
    awsServices: string[];
    concepts: string[];
  };
  embedding?: number[];
  relevanceScore?: number;
}

export enum TutorMode {
  ANSWER = 'answer',
  SOCRATIC = 'socratic',
  DRILL = 'drill',
  EXPLAIN = 'explain'
}

class TutorService {
  private openai: OpenAI;
  private pinecone: Pinecone | null = null;
  private vectorIndex: any;
  private contentChunks: Map<string, ContentChunk> = new Map();
  private conversationHistory: Map<string, any[]> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY,
    });

    // Initialize Pinecone for vector database
    if (process.env.PINECONE_API_KEY) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      this.initializeVectorDatabase();
    }
  }

  /**
   * Initialize vector database connection
   */
  private async initializeVectorDatabase(): Promise<void> {
    try {
      const indexName = process.env.PINECONE_INDEX_NAME || 'aws-ai-course';
      if (this.pinecone) {
        this.vectorIndex = this.pinecone.index(indexName);
        console.log('Vector database initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize vector database:', error);
      // Fallback to in-memory search if Pinecone is not available
    }
  }

  /**
   * Main chat interface for the AI tutor
   */
  async chat(message: string, context: TutorContext): Promise<TutorResponse> {
    try {
      // Retrieve relevant content using RAG
      const relevantContent = await this.retrieveRelevantContent(message, context);
      
      // Get conversation history
      const history = this.getConversationHistory(context.sessionId || context.userId);
      
      // Generate response based on mode
      let response: TutorResponse;
      
      switch (context.mode) {
        case TutorMode.SOCRATIC:
          response = await this.generateSocraticResponse(message, context, relevantContent, history);
          break;
        case TutorMode.DRILL:
          response = await this.generateDrillResponse(message, context, relevantContent, history);
          break;
        case TutorMode.EXPLAIN:
          response = await this.generateExplanationResponse(message, context, relevantContent, history);
          break;
        default:
          response = await this.generateAnswerResponse(message, context, relevantContent, history);
      }

      // Update conversation history
      this.updateConversationHistory(context.sessionId || context.userId, message, response);
      
      return response;
    } catch (error) {
      console.error('Error in tutor chat:', error);
      return this.generateErrorResponse(error as Error);
    }
  }

  /**
   * Generate Socratic questioning response
   */
  async generateSocraticQuestion(topic: string, context?: TutorContext): Promise<string> {
    try {
      const relevantContent = context 
        ? await this.retrieveRelevantContent(topic, context)
        : [];

      const prompt = this.buildSocraticPrompt(topic, relevantContent);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a Socratic tutor for AWS AI Practitioner certification. Your goal is to guide learning through thoughtful questions rather than direct answers. Ask questions that help students discover concepts themselves.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'What would you like to explore about this topic?';
    } catch (error) {
      console.error('Error generating Socratic question:', error);
      return 'What aspects of this topic would you like to understand better?';
    }
  }

  /**
   * Evaluate user's answer to a question
   */
  async evaluateAnswer(question: string, answer: string, context?: TutorContext): Promise<Evaluation> {
    try {
      const relevantContent = context 
        ? await this.retrieveRelevantContent(`${question} ${answer}`, context)
        : [];

      const prompt = this.buildEvaluationPrompt(question, answer, relevantContent);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert AWS AI Practitioner instructor. Evaluate student answers objectively and provide constructive feedback. Focus on accuracy, completeness, and understanding of AWS AI concepts.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseEvaluationResponse(response, relevantContent);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Unable to evaluate answer at this time.',
        improvements: [],
        relatedConcepts: [],
        citations: []
      };
    }
  }

  /**
   * Provide personalized feedback based on performance
   */
  async provideFeedback(performance: any, context: TutorContext): Promise<Feedback> {
    try {
      const prompt = this.buildFeedbackPrompt(performance, context);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a supportive AWS AI Practitioner mentor. Provide encouraging yet honest feedback that helps students improve their understanding and performance.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseFeedbackResponse(response);
    } catch (error) {
      console.error('Error providing feedback:', error);
      return {
        overallAssessment: 'Keep practicing and reviewing the course materials.',
        strengths: [],
        areasForImprovement: [],
        recommendations: [],
        nextSteps: [],
        confidenceLevel: 0.5
      };
    }
  }

  /**
   * Retrieve relevant content using vector similarity search
   */
  private async retrieveRelevantContent(query: string, context: TutorContext): Promise<ContentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      if (this.vectorIndex && queryEmbedding) {
        // Use Pinecone for vector search
        const searchResults = await this.vectorIndex.query({
          vector: queryEmbedding,
          topK: 5,
          includeMetadata: true,
          filter: context.courseId ? { courseId: context.courseId } : undefined
        });

        return searchResults.matches?.map((match: any) => ({
          id: match.id,
          content: match.metadata?.content || '',
          metadata: match.metadata || {},
          relevanceScore: match.score || 0
        })) || [];
      } else {
        // Fallback to simple text search
        return this.performTextSearch(query, context);
      }
    } catch (error) {
      console.error('Error retrieving relevant content:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0]?.embedding || null;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Fallback text search when vector database is not available
   */
  private performTextSearch(query: string, context: TutorContext): ContentChunk[] {
    const queryTerms = query.toLowerCase().split(' ');
    const results: ContentChunk[] = [];

    for (const chunk of this.contentChunks.values()) {
      const content = chunk.content.toLowerCase();
      let relevanceScore = 0;

      queryTerms.forEach(term => {
        const occurrences = (content.match(new RegExp(term, 'g')) || []).length;
        relevanceScore += occurrences;
      });

      if (relevanceScore > 0) {
        results.push({
          ...chunk,
          relevanceScore
        });
      }
    }

    return results
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5);
  }

  /**
   * Generate different types of responses based on tutor mode
   */
  private async generateSocraticResponse(
    message: string,
    context: TutorContext,
    relevantContent: ContentChunk[],
    history: any[]
  ): Promise<TutorResponse> {
    const prompt = `
Based on the student's message: "${message}"

Relevant course content:
${relevantContent.map(chunk => `- ${chunk.content.substring(0, 200)}...`).join('\n')}

Generate a Socratic response that:
1. Asks a thought-provoking question to guide discovery
2. Doesn't give away the answer directly
3. Builds on what the student already knows
4. Relates to AWS AI concepts

Format your response as JSON:
{
  "message": "your socratic question",
  "followUpQuestions": ["question1", "question2"],
  "confidence": 0.9
}
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a Socratic tutor. Guide learning through questions, not answers.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = this.parseJsonResponse(completion.choices[0]?.message?.content || '{}');
    
    return {
      message: response.message || 'What do you think about this concept?',
      citations: this.generateCitations(relevantContent),
      followUpQuestions: response.followUpQuestions || [],
      confidence: response.confidence || 0.8,
      mode: TutorMode.SOCRATIC,
      suggestedActions: this.generateSuggestedActions(context, relevantContent)
    };
  }

  private async generateAnswerResponse(
    message: string,
    context: TutorContext,
    relevantContent: ContentChunk[],
    history: any[]
  ): Promise<TutorResponse> {
    const prompt = `
Student question: "${message}"

Relevant AWS AI course content:
${relevantContent.map((chunk, index) => `
[${index + 1}] ${chunk.content}
Source: ${chunk.metadata.module}/${chunk.metadata.lesson}
`).join('\n')}

Provide a helpful, accurate answer that:
1. Directly addresses the student's question
2. Uses information from the course content
3. Includes specific AWS service names and features
4. Provides practical examples when relevant
5. Cites sources using [1], [2], etc.

Keep the response concise but comprehensive.
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AWS AI Practitioner instructor. Provide accurate, helpful answers based on the course content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || 'I apologize, but I cannot provide an answer at this time.';
    
    return {
      message: responseText,
      citations: this.generateCitations(relevantContent),
      followUpQuestions: this.generateFollowUpQuestions(message, relevantContent),
      confidence: 0.9,
      mode: TutorMode.ANSWER,
      suggestedActions: this.generateSuggestedActions(context, relevantContent)
    };
  }

  private async generateDrillResponse(
    message: string,
    context: TutorContext,
    relevantContent: ContentChunk[],
    history: any[]
  ): Promise<TutorResponse> {
    // Generate a quick drill question based on the content
    const prompt = `
Based on this AWS AI content:
${relevantContent.map(chunk => chunk.content.substring(0, 150)).join('\n')}

Generate a quick drill question to test understanding. Make it:
1. Specific to AWS AI services
2. Practical and certification-relevant
3. Multiple choice with 4 options
4. Include the correct answer

Format as JSON:
{
  "message": "Here's a quick drill question:",
  "question": "your question",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": "A",
  "explanation": "brief explanation"
}
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate drill questions for AWS AI Practitioner certification practice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.6,
    });

    const response = this.parseJsonResponse(completion.choices[0]?.message?.content || '{}');
    
    const drillMessage = `${response.message || 'Here\'s a practice question:'}\n\n${response.question}\n\n${(response.options || []).join('\n')}`;
    
    return {
      message: drillMessage,
      citations: this.generateCitations(relevantContent),
      followUpQuestions: ['Would you like another practice question?', 'Need help with this topic?'],
      confidence: 0.85,
      mode: TutorMode.DRILL,
      suggestedActions: [{
        type: 'take_quiz',
        title: 'Take a Full Quiz',
        description: 'Test your knowledge with a comprehensive quiz',
        priority: 'medium'
      }]
    };
  }

  private async generateExplanationResponse(
    message: string,
    context: TutorContext,
    relevantContent: ContentChunk[],
    history: any[]
  ): Promise<TutorResponse> {
    const prompt = `
Explain this AWS AI concept in detail: "${message}"

Use this course content:
${relevantContent.map(chunk => chunk.content).join('\n\n')}

Provide a comprehensive explanation that:
1. Breaks down complex concepts into simple parts
2. Uses analogies and examples
3. Explains the "why" behind AWS service choices
4. Connects to real-world use cases
5. Mentions related AWS services

Make it educational and easy to understand.
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator. Explain AWS AI concepts clearly and comprehensively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const responseText = completion.choices[0]?.message?.content || 'I need more information to provide a detailed explanation.';
    
    return {
      message: responseText,
      citations: this.generateCitations(relevantContent),
      followUpQuestions: [
        'Would you like me to explain any specific part in more detail?',
        'Do you have questions about how this applies in practice?'
      ],
      confidence: 0.9,
      mode: TutorMode.EXPLAIN,
      suggestedActions: this.generateSuggestedActions(context, relevantContent)
    };
  }

  /**
   * Helper methods for building prompts and parsing responses
   */
  private buildSocraticPrompt(topic: string, relevantContent: ContentChunk[]): string {
    return `
Topic: ${topic}

Relevant content:
${relevantContent.map(chunk => chunk.content.substring(0, 200)).join('\n')}

Generate a Socratic question that helps the student discover key concepts about this topic.
`;
  }

  private buildEvaluationPrompt(question: string, answer: string, relevantContent: ContentChunk[]): string {
    return `
Question: ${question}
Student Answer: ${answer}

Reference content:
${relevantContent.map(chunk => chunk.content).join('\n\n')}

Evaluate the answer and provide:
1. Correctness (true/false)
2. Score (0-1)
3. Detailed feedback
4. Areas for improvement
5. Related concepts to study

Format as JSON with these fields: isCorrect, score, feedback, improvements, relatedConcepts
`;
  }

  private buildFeedbackPrompt(performance: any, context: TutorContext): string {
    return `
Student Performance Data:
${JSON.stringify(performance, null, 2)}

Learning Context:
- Current lesson: ${context.currentLesson || 'N/A'}
- Learning history: ${context.learningHistory.length} events

Provide comprehensive feedback including:
1. Overall assessment
2. Strengths
3. Areas for improvement
4. Specific recommendations
5. Next steps
6. Confidence level (0-1)
`;
  }

  private parseEvaluationResponse(response: string, relevantContent: ContentChunk[]): Evaluation {
    try {
      const parsed = JSON.parse(response);
      return {
        isCorrect: parsed.isCorrect || false,
        score: parsed.score || 0,
        feedback: parsed.feedback || response || 'No feedback available',
        improvements: parsed.improvements || [],
        relatedConcepts: parsed.relatedConcepts || [],
        citations: this.generateCitations(relevantContent)
      };
    } catch (error) {
      return {
        isCorrect: false,
        score: 0,
        feedback: response || 'No feedback available',
        improvements: [],
        relatedConcepts: [],
        citations: []
      };
    }
  }

  private parseFeedbackResponse(response: string): Feedback {
    try {
      const parsed = JSON.parse(response);
      return {
        overallAssessment: parsed.overallAssessment || response,
        strengths: parsed.strengths || [],
        areasForImprovement: parsed.areasForImprovement || [],
        recommendations: parsed.recommendations || [],
        nextSteps: parsed.nextSteps || [],
        confidenceLevel: parsed.confidenceLevel || 0.5
      };
    } catch (error) {
      return {
        overallAssessment: response,
        strengths: [],
        areasForImprovement: [],
        recommendations: [],
        nextSteps: [],
        confidenceLevel: 0.5
      };
    }
  }

  private parseJsonResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      return {};
    }
  }

  private generateCitations(relevantContent: ContentChunk[]): Citation[] {
    return relevantContent.map((chunk, index) => ({
      source: chunk.metadata.source || `Source ${index + 1}`,
      module: chunk.metadata.module || 'Unknown Module',
      lesson: chunk.metadata.lesson || 'Unknown Lesson',
      section: chunk.metadata.section,
      paragraph: chunk.metadata.paragraph,
      relevanceScore: chunk.relevanceScore || 0.8,
      excerpt: chunk.content.substring(0, 150) + '...'
    }));
  }

  private generateFollowUpQuestions(message: string, relevantContent: ContentChunk[]): string[] {
    const questions = [
      'Would you like me to explain any specific AWS service in more detail?',
      'Do you have questions about how this applies to real-world scenarios?',
      'Would you like to practice with some quiz questions on this topic?'
    ];

    // Add content-specific questions based on AWS services mentioned
    const awsServices = relevantContent.flatMap(chunk => chunk.metadata.awsServices || []);
    if (awsServices.length > 0) {
      questions.push(`Would you like to learn more about ${awsServices[0]}?`);
    }

    return questions.slice(0, 3);
  }

  private generateSuggestedActions(context: TutorContext, relevantContent: ContentChunk[]): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    if (context.currentLesson) {
      actions.push({
        type: 'review_lesson',
        title: 'Review Current Lesson',
        description: `Go back to ${context.currentLesson} for more details`,
        priority: 'medium'
      });
    }

    if (relevantContent.length > 0) {
      actions.push({
        type: 'practice_cards',
        title: 'Practice Flashcards',
        description: 'Reinforce your learning with spaced repetition',
        priority: 'high'
      });
    }

    actions.push({
      type: 'take_quiz',
      title: 'Take Practice Quiz',
      description: 'Test your understanding with targeted questions',
      priority: 'medium'
    });

    return actions;
  }

  private generateErrorResponse(error: Error): TutorResponse {
    return {
      message: 'I apologize, but I\'m having trouble processing your request right now. Please try again or rephrase your question.',
      citations: [],
      followUpQuestions: [
        'Would you like to try asking your question differently?',
        'Can I help you with a specific AWS AI service?'
      ],
      confidence: 0.1,
      mode: TutorMode.ANSWER,
      suggestedActions: [{
        type: 'review_lesson',
        title: 'Browse Course Content',
        description: 'Explore lessons to find the information you need',
        priority: 'low'
      }]
    };
  }

  private getConversationHistory(sessionId: string): any[] {
    return this.conversationHistory.get(sessionId) || [];
  }

  private updateConversationHistory(sessionId: string, message: string, response: TutorResponse): void {
    const history = this.getConversationHistory(sessionId);
    history.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: response.message, timestamp: new Date() }
    );
    
    // Keep only last 20 messages to manage memory
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    this.conversationHistory.set(sessionId, history);
  }

  /**
   * Content ingestion methods for building the knowledge base
   */
  async ingestCourseContent(courseContent: any[]): Promise<void> {
    console.log('Ingesting course content for RAG system...');
    
    for (const content of courseContent) {
      const chunks = await this.chunkContent(content);
      
      for (const chunk of chunks) {
        // Generate embedding
        const embedding = await this.generateEmbedding(chunk.content);
        
        if (embedding) {
          chunk.embedding = embedding;
          
          // Store in vector database if available
          if (this.vectorIndex) {
            await this.vectorIndex.upsert([{
              id: chunk.id,
              values: embedding,
              metadata: {
                content: chunk.content,
                ...chunk.metadata
              }
            }]);
          }
          
          // Store in local cache
          this.contentChunks.set(chunk.id, chunk);
        }
      }
    }
    
    console.log(`Ingested ${this.contentChunks.size} content chunks`);
  }

  private async chunkContent(content: any): Promise<ContentChunk[]> {
    const chunks: ContentChunk[] = [];
    const text = content.content || content.text || '';
    const chunkSize = 500; // characters
    const overlap = 50; // character overlap between chunks
    
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunkText = text.slice(i, i + chunkSize);
      
      if (chunkText.trim().length > 50) { // Only include substantial chunks
        chunks.push({
          id: `${content.id || 'chunk'}_${i}`,
          content: chunkText,
          metadata: {
            source: content.source || 'course',
            module: content.module || 'unknown',
            lesson: content.lesson || 'unknown',
            section: content.section,
            paragraph: Math.floor(i / chunkSize),
            awsServices: this.extractAWSServices(chunkText),
            concepts: this.extractConcepts(chunkText)
          }
        });
      }
    }
    
    return chunks;
  }

  private extractAWSServices(text: string): string[] {
    const awsServicePattern = /Amazon\s+\w+|AWS\s+\w+|\b(SageMaker|Rekognition|Comprehend|Lex|Polly|Transcribe|Bedrock|Textract|Translate|Personalize|Forecast|Kendra|CodeWhisperer)\b/gi;
    const matches = text.match(awsServicePattern) || [];
    return [...new Set(matches.map(match => match.trim()))];
  }

  private extractConcepts(text: string): string[] {
    const conceptPattern = /\b(machine learning|artificial intelligence|deep learning|neural networks?|natural language processing|computer vision|reinforcement learning|supervised learning|unsupervised learning|fine-tuning|embedding|transformer|model|algorithm|training|inference)\b/gi;
    const matches = text.match(conceptPattern) || [];
    return [...new Set(matches.map(match => match.toLowerCase()))];
  }
}

export default TutorService;