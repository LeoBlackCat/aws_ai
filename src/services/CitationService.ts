/**
 * CitationService - Manages source citations and paragraph references
 * Provides detailed source tracking for AI tutor responses
 */

export interface Citation {
  id: string;
  source: string;
  module: string;
  lesson: string;
  section?: string;
  paragraph?: number;
  lineNumber?: number;
  relevanceScore: number;
  excerpt: string;
  fullText?: string;
  url?: string;
  timestamp: Date;
}

export interface SourceDocument {
  id: string;
  title: string;
  module: string;
  lesson: string;
  content: string;
  sections: SourceSection[];
  metadata: {
    author?: string;
    lastUpdated: Date;
    version: string;
    tags: string[];
  };
}

export interface SourceSection {
  id: string;
  title: string;
  content: string;
  paragraphs: SourceParagraph[];
  startLine: number;
  endLine: number;
}

export interface SourceParagraph {
  id: string;
  content: string;
  lineNumber: number;
  wordCount: number;
  concepts: string[];
  awsServices: string[];
}

export interface CitationContext {
  query: string;
  responseText: string;
  sourceChunks: any[];
  userContext?: {
    currentLesson?: string;
    learningHistory?: any[];
  };
}

class CitationService {
  private sourceDocuments: Map<string, SourceDocument> = new Map();
  private citationCache: Map<string, Citation[]> = new Map();

  /**
   * Generate citations for AI tutor response
   */
  generateCitations(context: CitationContext): Citation[] {
    const citations: Citation[] = [];
    const { query, responseText, sourceChunks } = context;

    sourceChunks.forEach((chunk, index) => {
      const citation = this.createCitationFromChunk(chunk, query, responseText, index);
      if (citation) {
        citations.push(citation);
      }
    });

    // Sort by relevance score
    citations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Cache the citations
    const cacheKey = this.generateCacheKey(query, responseText);
    this.citationCache.set(cacheKey, citations);

    return citations;
  }

  /**
   * Create citation from content chunk
   */
  private createCitationFromChunk(
    chunk: any,
    query: string,
    responseText: string,
    index: number
  ): Citation | null {
    if (!chunk.metadata || !chunk.content) {
      return null;
    }

    const relevanceScore = this.calculateRelevanceScore(chunk, query, responseText);
    const excerpt = this.extractRelevantExcerpt(chunk.content, query, 150);

    return {
      id: `citation_${chunk.id || index}`,
      source: chunk.metadata.source || 'AWS AI Course',
      module: chunk.metadata.module || 'Unknown Module',
      lesson: chunk.metadata.lesson || 'Unknown Lesson',
      section: chunk.metadata.section,
      paragraph: chunk.metadata.paragraph,
      lineNumber: chunk.metadata.lineNumber,
      relevanceScore,
      excerpt,
      fullText: chunk.content,
      url: this.generateSourceUrl(chunk.metadata),
      timestamp: new Date()
    };
  }

  /**
   * Calculate relevance score for citation
   */
  private calculateRelevanceScore(chunk: any, query: string, responseText: string): number {
    let score = 0;

    // Base score from vector similarity (if available)
    if (chunk.score) {
      score += chunk.score * 0.4;
    }

    // Query term overlap
    const queryTerms = this.extractTerms(query.toLowerCase());
    const chunkTerms = this.extractTerms(chunk.content.toLowerCase());
    const queryOverlap = this.calculateTermOverlap(queryTerms, chunkTerms);
    score += queryOverlap * 0.3;

    // Response text overlap
    const responseTerms = this.extractTerms(responseText.toLowerCase());
    const responseOverlap = this.calculateTermOverlap(responseTerms, chunkTerms);
    score += responseOverlap * 0.2;

    // AWS service relevance boost
    const awsServices = chunk.metadata?.awsServices || [];
    if (awsServices.length > 0) {
      const serviceBoost = Math.min(awsServices.length * 0.1, 0.1);
      score += serviceBoost;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract relevant excerpt from content
   */
  private extractRelevantExcerpt(content: string, query: string, maxLength: number): string {
    const queryTerms = this.extractTerms(query.toLowerCase());
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Find sentence with most query term matches
    let bestSentence = sentences[0] || '';
    let maxMatches = 0;

    sentences.forEach(sentence => {
      const sentenceTerms = this.extractTerms(sentence.toLowerCase());
      const matches = this.calculateTermOverlap(queryTerms, sentenceTerms);
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSentence = sentence;
      }
    });

    // Truncate if too long
    if (bestSentence.length > maxLength) {
      bestSentence = bestSentence.substring(0, maxLength - 3) + '...';
    }

    return bestSentence.trim();
  }

  /**
   * Generate source URL for citation
   */
  private generateSourceUrl(metadata: any): string {
    const baseUrl = '/learn';
    const module = metadata.module?.toLowerCase().replace(/\s+/g, '-');
    const lesson = metadata.lesson?.toLowerCase().replace(/\s+/g, '-');
    
    if (module && lesson) {
      let url = `${baseUrl}/${module}/${lesson}`;
      
      if (metadata.section) {
        const section = metadata.section.toLowerCase().replace(/\s+/g, '-');
        url += `#${section}`;
      }
      
      return url;
    }
    
    return baseUrl;
  }

  /**
   * Format citations for display
   */
  formatCitations(citations: Citation[], format: 'inline' | 'footnote' | 'bibliography' = 'inline'): string {
    switch (format) {
      case 'inline':
        return this.formatInlineCitations(citations);
      case 'footnote':
        return this.formatFootnoteCitations(citations);
      case 'bibliography':
        return this.formatBibliographyCitations(citations);
      default:
        return this.formatInlineCitations(citations);
    }
  }

  /**
   * Format inline citations
   */
  private formatInlineCitations(citations: Citation[]): string {
    return citations
      .map((citation, index) => `[${index + 1}]`)
      .join(' ');
  }

  /**
   * Format footnote citations
   */
  private formatFootnoteCitations(citations: Citation[]): string {
    return citations
      .map((citation, index) => {
        const source = `${citation.module} > ${citation.lesson}`;
        const section = citation.section ? ` > ${citation.section}` : '';
        return `[${index + 1}] ${source}${section}`;
      })
      .join('\n');
  }

  /**
   * Format bibliography citations
   */
  private formatBibliographyCitations(citations: Citation[]): string {
    return citations
      .map((citation, index) => {
        const source = `${citation.module}: ${citation.lesson}`;
        const section = citation.section ? ` - ${citation.section}` : '';
        const excerpt = citation.excerpt ? ` ("${citation.excerpt}")` : '';
        return `${index + 1}. ${source}${section}${excerpt}`;
      })
      .join('\n\n');
  }

  /**
   * Get citation by ID
   */
  getCitation(citationId: string): Citation | null {
    for (const citations of this.citationCache.values()) {
      const citation = citations.find(c => c.id === citationId);
      if (citation) {
        return citation;
      }
    }
    return null;
  }

  /**
   * Get full context for citation
   */
  getCitationContext(citationId: string): {
    citation: Citation;
    fullDocument?: SourceDocument;
    surroundingParagraphs?: SourceParagraph[];
  } | null {
    const citation = this.getCitation(citationId);
    if (!citation) {
      return null;
    }

    const document = this.sourceDocuments.get(`${citation.module}/${citation.lesson}`);
    let surroundingParagraphs: SourceParagraph[] = [];

    if (document && citation.paragraph !== undefined) {
      // Get surrounding paragraphs for context
      const allParagraphs = document.sections.flatMap(s => s.paragraphs);
      const currentIndex = allParagraphs.findIndex(p => p.lineNumber === citation.paragraph);
      
      if (currentIndex >= 0) {
        const start = Math.max(0, currentIndex - 1);
        const end = Math.min(allParagraphs.length, currentIndex + 2);
        surroundingParagraphs = allParagraphs.slice(start, end);
      }
    }

    return {
      citation,
      fullDocument: document,
      surroundingParagraphs
    };
  }

  /**
   * Register source document for citation tracking
   */
  registerSourceDocument(document: SourceDocument): void {
    const key = `${document.module}/${document.lesson}`;
    this.sourceDocuments.set(key, document);
  }

  /**
   * Parse course content into source documents
   */
  parseSourceDocument(content: string, metadata: any): SourceDocument {
    const sections = this.parseSections(content);
    
    return {
      id: `${metadata.module}/${metadata.lesson}`,
      title: metadata.title || metadata.lesson,
      module: metadata.module,
      lesson: metadata.lesson,
      content,
      sections,
      metadata: {
        lastUpdated: new Date(),
        version: '1.0.0',
        tags: metadata.tags || [],
        ...metadata
      }
    };
  }

  /**
   * Parse content into sections and paragraphs
   */
  private parseSections(content: string): SourceSection[] {
    const sections: SourceSection[] = [];
    const lines = content.split('\n');
    let currentSection: SourceSection | null = null;
    let lineNumber = 0;

    lines.forEach((line, index) => {
      lineNumber = index + 1;
      
      // Detect section headers (markdown headers)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.endLine = lineNumber - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          id: `section_${sections.length + 1}`,
          title: headerMatch[2],
          content: '',
          paragraphs: [],
          startLine: lineNumber,
          endLine: lineNumber
        };
      } else if (currentSection && line.trim()) {
        // Add content to current section
        currentSection.content += line + '\n';
        
        // Create paragraph if line is substantial
        if (line.trim().length > 20) {
          const paragraph: SourceParagraph = {
            id: `para_${currentSection.paragraphs.length + 1}`,
            content: line.trim(),
            lineNumber,
            wordCount: line.trim().split(/\s+/).length,
            concepts: this.extractConcepts(line),
            awsServices: this.extractAWSServices(line)
          };
          currentSection.paragraphs.push(paragraph);
        }
      }
    });

    // Add final section
    if (currentSection) {
      (currentSection as SourceSection).endLine = lineNumber;
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Validate citation accuracy
   */
  validateCitation(citation: Citation): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if source document exists
    const documentKey = `${citation.module}/${citation.lesson}`;
    const document = this.sourceDocuments.get(documentKey);
    
    if (!document) {
      issues.push('Source document not found');
    } else {
      // Verify excerpt exists in source
      if (citation.excerpt && !document.content.includes(citation.excerpt.replace('...', ''))) {
        issues.push('Excerpt not found in source document');
      }
      
      // Verify paragraph reference
      if (citation.paragraph !== undefined) {
        const allParagraphs = document.sections.flatMap(s => s.paragraphs);
        const paragraphExists = allParagraphs.some(p => p.lineNumber === citation.paragraph);
        
        if (!paragraphExists) {
          issues.push('Referenced paragraph not found');
        }
      }
    }

    // Check relevance score
    if (citation.relevanceScore < 0 || citation.relevanceScore > 1) {
      issues.push('Invalid relevance score');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Helper methods
   */
  private extractTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private calculateTermOverlap(terms1: string[], terms2: string[]): number {
    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size, 1);
  }

  private extractConcepts(text: string): string[] {
    const conceptPattern = /\b(machine learning|artificial intelligence|deep learning|neural network|natural language processing|computer vision|reinforcement learning|supervised learning|unsupervised learning|fine-tuning|embedding|transformer|model|algorithm|training|inference)\b/gi;
    const matches = text.match(conceptPattern) || [];
    return [...new Set(matches.map(match => match.toLowerCase()))];
  }

  private extractAWSServices(text: string): string[] {
    const awsServicePattern = /Amazon\s+\w+|AWS\s+\w+|\b(SageMaker|Rekognition|Comprehend|Lex|Polly|Transcribe|Bedrock|Textract|Translate|Personalize|Forecast|Kendra|CodeWhisperer)\b/gi;
    const matches = text.match(awsServicePattern) || [];
    return [...new Set(matches.map(match => match.trim()))];
  }

  private generateCacheKey(query: string, responseText: string): string {
    const combined = `${query}|${responseText}`;
    return btoa(combined).substring(0, 32); // Simple hash
  }

  /**
   * Clear citation cache
   */
  clearCache(): void {
    this.citationCache.clear();
  }

  /**
   * Get citation statistics
   */
  getCitationStats(): {
    totalCitations: number;
    averageRelevanceScore: number;
    topSources: { source: string; count: number }[];
    cacheSize: number;
  } {
    let totalCitations = 0;
    let totalRelevanceScore = 0;
    const sourceCount: Map<string, number> = new Map();

    for (const citations of this.citationCache.values()) {
      totalCitations += citations.length;
      
      citations.forEach(citation => {
        totalRelevanceScore += citation.relevanceScore;
        
        const sourceKey = `${citation.module}/${citation.lesson}`;
        sourceCount.set(sourceKey, (sourceCount.get(sourceKey) || 0) + 1);
      });
    }

    const topSources = Array.from(sourceCount.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCitations,
      averageRelevanceScore: totalCitations > 0 ? totalRelevanceScore / totalCitations : 0,
      topSources,
      cacheSize: this.citationCache.size
    };
  }
}

export default CitationService;