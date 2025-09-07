/**
 * VectorDatabase - Setup and management for course content embeddings
 * Handles vector database initialization, content ingestion, and similarity search
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { ContentChunk } from './TutorService';

export interface VectorDatabaseConfig {
  apiKey: string;
  environment?: string;
  indexName: string;
  dimension?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: any;
  content: string;
}

export interface IngestionProgress {
  processed: number;
  total: number;
  currentItem: string;
  errors: string[];
}

class VectorDatabase {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private index: any;
  private config: VectorDatabaseConfig;
  private isInitialized: boolean = false;

  constructor(config: VectorDatabaseConfig) {
    this.config = config;
    
    this.pinecone = new Pinecone({
      apiKey: config.apiKey,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY,
    });
  }

  /**
   * Initialize the vector database and create index if needed
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing vector database...');
      
      // Check if index exists
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.config.indexName);

      if (!indexExists) {
        console.log(`Creating new index: ${this.config.indexName}`);
        await this.createIndex();
      }

      // Connect to the index
      this.index = this.pinecone.index(this.config.indexName);
      this.isInitialized = true;
      
      console.log('Vector database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vector database:', error);
      throw error;
    }
  }

  /**
   * Create a new Pinecone index
   */
  private async createIndex(): Promise<void> {
    await this.pinecone.createIndex({
      name: this.config.indexName,
      dimension: this.config.dimension || 1536, // OpenAI ada-002 embedding dimension
      metric: this.config.metric || 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    // Wait for index to be ready
    console.log('Waiting for index to be ready...');
    let isReady = false;
    while (!isReady) {
      const indexDescription = await this.pinecone.describeIndex(this.config.indexName);
      isReady = indexDescription.status?.ready || false;
      if (!isReady) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' ').trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Ingest course content into the vector database
   */
  async ingestContent(
    contentChunks: ContentChunk[],
    onProgress?: (progress: IngestionProgress) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    console.log(`Starting ingestion of ${contentChunks.length} content chunks...`);
    
    const batchSize = 100; // Pinecone batch limit
    const errors: string[] = [];
    let processed = 0;

    for (let i = 0; i < contentChunks.length; i += batchSize) {
      const batch = contentChunks.slice(i, i + batchSize);
      
      try {
        // Generate embeddings for the batch
        const vectors = await Promise.all(
          batch.map(async (chunk) => {
            try {
              const embedding = await this.generateEmbedding(chunk.content);
              return {
                id: chunk.id,
                values: embedding,
                metadata: {
                  content: chunk.content,
                  source: chunk.metadata.source,
                  module: chunk.metadata.module,
                  lesson: chunk.metadata.lesson,
                  section: chunk.metadata.section,
                  paragraph: chunk.metadata.paragraph,
                  awsServices: chunk.metadata.awsServices,
                  concepts: chunk.metadata.concepts,
                  contentLength: chunk.content.length,
                  createdAt: new Date().toISOString()
                }
              };
            } catch (error) {
              console.error(`Error processing chunk ${chunk.id}:`, error);
              errors.push(`Failed to process chunk ${chunk.id}: ${error}`);
              return null;
            }
          })
        );

        // Filter out failed embeddings
        const validVectors = vectors.filter(v => v !== null);

        if (validVectors.length > 0) {
          // Upsert to Pinecone
          await this.index.upsert(validVectors);
          processed += validVectors.length;
        }

        // Report progress
        if (onProgress) {
          onProgress({
            processed,
            total: contentChunks.length,
            currentItem: `Batch ${Math.floor(i / batchSize) + 1}`,
            errors
          });
        }

        // Rate limiting - wait between batches
        if (i + batchSize < contentChunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        errors.push(`Batch error at index ${i}: ${error}`);
      }
    }

    console.log(`Ingestion completed. Processed: ${processed}, Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.warn('Ingestion errors:', errors);
    }
  }

  /**
   * Search for similar content using vector similarity
   */
  async search(
    query: string,
    options: {
      topK?: number;
      filter?: any;
      includeMetadata?: boolean;
      includeValues?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in Pinecone
      const searchResponse = await this.index.query({
        vector: queryEmbedding,
        topK: options.topK || 5,
        filter: options.filter,
        includeMetadata: options.includeMetadata !== false,
        includeValues: options.includeValues || false
      });

      // Transform results
      return searchResponse.matches?.map((match: any) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata || {},
        content: match.metadata?.content || ''
      })) || [];

    } catch (error) {
      console.error('Error searching vector database:', error);
      throw error;
    }
  }

  /**
   * Delete content from the vector database
   */
  async deleteContent(ids: string[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      await this.index.deleteMany(ids);
      console.log(`Deleted ${ids.length} vectors from database`);
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the vector database
   */
  async getStats(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        indexFullness: stats.indexFullness,
        namespaces: stats.namespaces
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Clear all content from the database
   */
  async clearAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      await this.index.deleteAll();
      console.log('Cleared all content from vector database');
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  /**
   * Test the database connection and functionality
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Test with a simple query
      const testEmbedding = await this.generateEmbedding('test query');
      const testResults = await this.index.query({
        vector: testEmbedding,
        topK: 1,
        includeMetadata: true
      });

      console.log('Vector database connection test successful');
      return true;
    } catch (error) {
      console.error('Vector database connection test failed:', error);
      return false;
    }
  }

  /**
   * Batch update metadata for existing vectors
   */
  async updateMetadata(updates: { id: string; metadata: any }[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      for (const update of updates) {
        await this.index.update({
          id: update.id,
          setMetadata: update.metadata
        });
      }
      console.log(`Updated metadata for ${updates.length} vectors`);
    } catch (error) {
      console.error('Error updating metadata:', error);
      throw error;
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(id: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      const result = await this.index.fetch([id]);
      return result.vectors?.[id] || null;
    } catch (error) {
      console.error('Error fetching vector:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and metadata filtering
   */
  async hybridSearch(
    query: string,
    filters: {
      module?: string;
      lesson?: string;
      awsServices?: string[];
      concepts?: string[];
      difficulty?: string;
    },
    topK: number = 5
  ): Promise<SearchResult[]> {
    // Build Pinecone filter
    const pineconeFilter: any = {};
    
    if (filters.module) {
      pineconeFilter.module = { $eq: filters.module };
    }
    
    if (filters.lesson) {
      pineconeFilter.lesson = { $eq: filters.lesson };
    }
    
    if (filters.awsServices && filters.awsServices.length > 0) {
      pineconeFilter.awsServices = { $in: filters.awsServices };
    }
    
    if (filters.concepts && filters.concepts.length > 0) {
      pineconeFilter.concepts = { $in: filters.concepts };
    }

    return this.search(query, {
      topK,
      filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
      includeMetadata: true
    });
  }
}

export default VectorDatabase;