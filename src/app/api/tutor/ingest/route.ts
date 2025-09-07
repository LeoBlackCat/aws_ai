/**
 * API Route for Content Ingestion into Vector Database
 * Processes course content and creates embeddings for RAG system
 */

import { NextRequest, NextResponse } from 'next/server';
import VectorDatabase from '@/services/VectorDatabase';
import CitationService from '@/services/CitationService';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const citationService = new CitationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'ingest_course':
        return handleIngestCourse(params);
      case 'ingest_lesson':
        return handleIngestLesson(params);
      case 'test_connection':
        return handleTestConnection(params);
      case 'get_stats':
        return handleGetStats(params);
      case 'clear_database':
        return handleClearDatabase(params);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Content ingestion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleIngestCourse(params: { courseId?: string; force?: boolean }) {
  const { courseId = 'aws-ai-practitioner', force = false } = params;

  try {
    // Initialize vector database
    const vectorDB = new VectorDatabase({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
      dimension: 1536
    });

    await vectorDB.initialize();

    // Test connection first
    const connectionTest = await vectorDB.testConnection();
    if (!connectionTest) {
      return NextResponse.json(
        { error: 'Failed to connect to vector database' },
        { status: 500 }
      );
    }

    // Get course content from database
    const course = await prisma.course.findFirst({
      where: { slug: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                terms: true,
                objectives: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Process course content
    const contentChunks = [];
    let totalLessons = 0;
    let processedLessons = 0;

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        totalLessons++;
        
        try {
          // Parse lesson content into chunks
          const lessonChunks = await processLessonContent(lesson, module, course);
          contentChunks.push(...lessonChunks);
          
          // Register source document for citations
          const sourceDoc = citationService.parseSourceDocument(lesson.content, {
            title: lesson.title,
            module: module.title,
            lesson: lesson.title,
            tags: ['aws', 'ai', 'course']
          });
          citationService.registerSourceDocument(sourceDoc);
          
          processedLessons++;
        } catch (error) {
          console.error(`Error processing lesson ${lesson.title}:`, error);
        }
      }
    }

    // Ingest content into vector database
    let ingestedCount = 0;
    const errors: string[] = [];

    await vectorDB.ingestContent(contentChunks, (progress) => {
      ingestedCount = progress.processed;
      errors.push(...progress.errors);
    });

    // Get final stats
    const stats = await vectorDB.getStats();

    return NextResponse.json({
      success: true,
      data: {
        courseId,
        totalLessons,
        processedLessons,
        totalChunks: contentChunks.length,
        ingestedChunks: ingestedCount,
        errors: errors.length,
        vectorDBStats: stats
      }
    });

  } catch (error) {
    console.error('Course ingestion error:', error);
    return NextResponse.json(
      { error: `Failed to ingest course: ${error}` },
      { status: 500 }
    );
  }
}

async function handleIngestLesson(params: { lessonId: string }) {
  const { lessonId } = params;

  try {
    // Get lesson from database
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true
          }
        },
        terms: true,
        objectives: true
      }
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Initialize vector database
    const vectorDB = new VectorDatabase({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
      dimension: 1536
    });

    await vectorDB.initialize();

    // Process lesson content
    const contentChunks = await processLessonContent(lesson, lesson.module, lesson.module.course);

    // Ingest into vector database
    await vectorDB.ingestContent(contentChunks);

    // Register source document
    const sourceDoc = citationService.parseSourceDocument(lesson.content, {
      title: lesson.title,
      module: lesson.module.title,
      lesson: lesson.title,
      tags: ['aws', 'ai', 'course']
    });
    citationService.registerSourceDocument(sourceDoc);

    return NextResponse.json({
      success: true,
      data: {
        lessonId,
        lessonTitle: lesson.title,
        chunksCreated: contentChunks.length,
        module: lesson.module.title
      }
    });

  } catch (error) {
    console.error('Lesson ingestion error:', error);
    return NextResponse.json(
      { error: `Failed to ingest lesson: ${error}` },
      { status: 500 }
    );
  }
}

async function handleTestConnection(params: {}) {
  try {
    const vectorDB = new VectorDatabase({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
      dimension: 1536
    });

    const isConnected = await vectorDB.testConnection();

    return NextResponse.json({
      success: true,
      data: {
        connected: isConnected,
        indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
        hasApiKey: !!process.env.PINECONE_API_KEY
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Connection test failed: ${error}`
    });
  }
}

async function handleGetStats(params: {}) {
  try {
    const vectorDB = new VectorDatabase({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
      dimension: 1536
    });

    await vectorDB.initialize();
    const stats = await vectorDB.getStats();
    const citationStats = citationService.getCitationStats();

    return NextResponse.json({
      success: true,
      data: {
        vectorDatabase: stats,
        citations: citationStats
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to get stats: ${error}`
    });
  }
}

async function handleClearDatabase(params: { confirm?: boolean }) {
  const { confirm = false } = params;

  if (!confirm) {
    return NextResponse.json(
      { error: 'Confirmation required to clear database' },
      { status: 400 }
    );
  }

  try {
    const vectorDB = new VectorDatabase({
      apiKey: process.env.PINECONE_API_KEY!,
      indexName: process.env.PINECONE_INDEX_NAME || 'aws-ai-course',
      dimension: 1536
    });

    await vectorDB.initialize();
    await vectorDB.clearAll();
    citationService.clearCache();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Database cleared successfully'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to clear database: ${error}`
    });
  }
}

// Helper function to process lesson content into chunks
async function processLessonContent(lesson: any, module: any, course: any) {
  const chunks = [];
  const content = lesson.content || '';
  const chunkSize = 500;
  const overlap = 50;

  // Split content into chunks
  for (let i = 0; i < content.length; i += chunkSize - overlap) {
    const chunkText = content.slice(i, i + chunkSize);
    
    if (chunkText.trim().length > 50) {
      chunks.push({
        id: `${lesson.id}_chunk_${Math.floor(i / chunkSize)}`,
        content: chunkText,
        metadata: {
          source: 'course',
          courseId: course.id,
          courseTitle: course.title,
          module: module.title,
          moduleId: module.id,
          lesson: lesson.title,
          lessonId: lesson.id,
          section: extractSectionFromChunk(chunkText),
          paragraph: Math.floor(i / chunkSize),
          awsServices: extractAWSServices(chunkText),
          concepts: extractConcepts(chunkText),
          terms: lesson.terms?.map((t: any) => t.term) || [],
          objectives: lesson.objectives?.map((o: any) => o.objective) || []
        }
      });
    }
  }

  return chunks;
}

function extractSectionFromChunk(text: string): string | undefined {
  // Look for markdown headers in the chunk
  const headerMatch = text.match(/^(#{1,6})\s+(.+)$/m);
  return headerMatch ? headerMatch[2] : undefined;
}

function extractAWSServices(text: string): string[] {
  const awsServicePattern = /Amazon\s+\w+|AWS\s+\w+|\b(SageMaker|Rekognition|Comprehend|Lex|Polly|Transcribe|Bedrock|Textract|Translate|Personalize|Forecast|Kendra|CodeWhisperer)\b/gi;
  const matches = text.match(awsServicePattern) || [];
  return [...new Set(matches.map(match => match.trim()))];
}

function extractConcepts(text: string): string[] {
  const conceptPattern = /\b(machine learning|artificial intelligence|deep learning|neural network|natural language processing|computer vision|reinforcement learning|supervised learning|unsupervised learning|fine-tuning|embedding|transformer|model|algorithm|training|inference)\b/gi;
  const matches = text.match(conceptPattern) || [];
  return [...new Set(matches.map(match => match.toLowerCase()))];
}