/**
 * ContentParser - Parses markdown files and extracts educational content
 * for question generation and assessment
 */
class ContentParser {
  constructor() {
    this.parsedContent = new Map();
    this.definitions = new Map();
    this.concepts = new Map();
    this.keyPhrases = new Map();
  }

  /**
   * Parse multiple markdown files and extract content
   * @param {Array} files - Array of {name, content} objects
   * @returns {Object} Parsed content structure
   */
  parseMarkdownFiles(files) {
    const allContent = {
      definitions: new Map(),
      concepts: new Map(),
      keyPhrases: new Map(),
      sections: new Map(),
      questionBank: []
    };

    files.forEach(file => {
      const parsed = this.parseMarkdownFile(file.content, file.name);
      
      // Merge definitions
      parsed.definitions.forEach((value, key) => {
        allContent.definitions.set(key, { ...value, sourceFile: file.name });
      });
      
      // Merge concepts
      parsed.concepts.forEach((value, key) => {
        allContent.concepts.set(key, { ...value, sourceFile: file.name });
      });
      
      // Merge key phrases
      parsed.keyPhrases.forEach((value, key) => {
        allContent.keyPhrases.set(key, { ...value, sourceFile: file.name });
      });
      
      // Store sections
      allContent.sections.set(file.name, parsed.sections);
    });

    this.parsedContent = allContent;
    return allContent;
  }

  /**
   * Parse a single markdown file
   * @param {string} content - Markdown content
   * @param {string} fileName - Name of the file
   * @returns {Object} Parsed content from the file
   */
  parseMarkdownFile(content, fileName) {
    const sections = this.extractSections(content);
    const definitions = this.extractDefinitions(content, fileName);
    const concepts = this.extractConcepts(content, fileName);
    const keyPhrases = this.extractKeyPhrases(content, fileName);

    return {
      sections,
      definitions,
      concepts,
      keyPhrases
    };
  }

  /**
   * Extract sections from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of sections with headers and content
   */
  extractSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: currentContent.join('\n').trim(),
            lineEnd: index - 1
          });
        }
        
        // Start new section
        currentSection = {
          level: headerMatch[1].length,
          title: headerMatch[2].trim(),
          lineStart: index,
          id: this.generateSectionId(headerMatch[2])
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    });

    // Add final section
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: currentContent.join('\n').trim(),
        lineEnd: lines.length - 1
      });
    }

    return sections;
  }

  /**
   * Extract definitions from content
   * @param {string} content - Markdown content
   * @param {string} fileName - Source file name
   * @returns {Map} Map of term -> definition
   */
  extractDefinitions(content, fileName) {
    const definitions = new Map();
    
    // Pattern 1: Bold term followed by definition
    const boldDefinitionRegex = /\*\*([^*]+)\*\*[:\s]+([^.\n]+[.])/g;
    let match;
    
    while ((match = boldDefinitionRegex.exec(content)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      if (this.isValidDefinition(term, definition)) {
        definitions.set(term.toLowerCase(), {
          term,
          definition,
          context: this.extractContext(content, match.index),
          sourceFile: fileName,
          type: 'bold_definition'
        });
      }
    }

    // Pattern 2: Term is/are definition patterns
    const isDefinitionRegex = /([A-Z][^.!?]*?)\s+(is|are)\s+([^.!?]+[.!?])/g;
    
    while ((match = isDefinitionRegex.exec(content)) !== null) {
      const term = match[1].trim();
      const definition = `${match[2]} ${match[3]}`.trim();
      
      if (this.isValidDefinition(term, definition) && term.length < 100) {
        definitions.set(term.toLowerCase(), {
          term,
          definition,
          context: this.extractContext(content, match.index),
          sourceFile: fileName,
          type: 'is_definition'
        });
      }
    }

    // Pattern 3: Definitions in lists
    const listDefinitionRegex = /^[\s]*[-*]\s*\*\*([^*]+)\*\*[:\s]*([^\n]+)/gm;
    
    while ((match = listDefinitionRegex.exec(content)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      if (this.isValidDefinition(term, definition)) {
        definitions.set(term.toLowerCase(), {
          term,
          definition,
          context: this.extractContext(content, match.index),
          sourceFile: fileName,
          type: 'list_definition'
        });
      }
    }

    return definitions;
  }

  /**
   * Extract key concepts from content
   * @param {string} content - Markdown content
   * @param {string} fileName - Source file name
   * @returns {Map} Map of concept -> details
   */
  extractConcepts(content, fileName) {
    const concepts = new Map();
    
    // Extract concepts from headers
    const headerRegex = /^#{1,6}\s+(.+)$/gm;
    let match;
    
    while ((match = headerRegex.exec(content)) !== null) {
      const concept = match[1].trim();
      const conceptKey = concept.toLowerCase();
      
      if (!concepts.has(conceptKey) && this.isValidConcept(concept)) {
        concepts.set(conceptKey, {
          concept,
          type: 'header',
          context: this.extractContext(content, match.index),
          sourceFile: fileName
        });
      }
    }

    // Extract concepts from emphasized text
    const emphasisRegex = /\*\*([^*]{3,50})\*\*/g;
    
    while ((match = emphasisRegex.exec(content)) !== null) {
      const concept = match[1].trim();
      const conceptKey = concept.toLowerCase();
      
      if (!concepts.has(conceptKey) && this.isValidConcept(concept)) {
        concepts.set(conceptKey, {
          concept,
          type: 'emphasis',
          context: this.extractContext(content, match.index),
          sourceFile: fileName
        });
      }
    }

    return concepts;
  }

  /**
   * Extract key phrases that should be used in answers
   * @param {string} content - Markdown content
   * @param {string} fileName - Source file name
   * @returns {Map} Map of phrase -> details
   */
  extractKeyPhrases(content, fileName) {
    const keyPhrases = new Map();
    
    // Common AI/ML phrases that should be preserved
    const importantPhrases = [
      'machine learning',
      'artificial intelligence',
      'deep learning',
      'neural networks',
      'foundation models',
      'large language models',
      'generative AI',
      'supervised learning',
      'unsupervised learning',
      'reinforcement learning',
      'fine-tuning',
      'prompt engineering',
      'retrieval-augmented generation',
      'natural language processing',
      'computer vision'
    ];

    importantPhrases.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        const foundPhrase = match[0];
        const phraseKey = foundPhrase.toLowerCase();
        
        if (!keyPhrases.has(phraseKey)) {
          keyPhrases.set(phraseKey, {
            phrase: foundPhrase,
            context: this.extractContext(content, match.index),
            sourceFile: fileName,
            importance: 'high'
          });
        }
      }
    });

    return keyPhrases;
  }

  /**
   * Generate a question bank from parsed content
   * @param {Object} parsedContent - The parsed content structure
   * @returns {Array} Array of question objects
   */
  generateQuestionBank(parsedContent) {
    const questions = [];
    
    // Generate definition questions
    parsedContent.definitions.forEach((def, key) => {
      questions.push({
        id: `def_${key.replace(/\s+/g, '_')}`,
        type: 'definition',
        question: `What is ${def.term}?`,
        expectedAnswer: def.definition,
        term: def.term,
        sourceFile: def.sourceFile,
        context: def.context,
        difficulty: this.assessDifficulty(def.definition)
      });
      
      // Also create "explain" variant
      questions.push({
        id: `exp_${key.replace(/\s+/g, '_')}`,
        type: 'explanation',
        question: `Explain ${def.term}.`,
        expectedAnswer: def.definition,
        term: def.term,
        sourceFile: def.sourceFile,
        context: def.context,
        difficulty: this.assessDifficulty(def.definition)
      });
    });

    // Generate concept questions
    parsedContent.concepts.forEach((concept, key) => {
      if (concept.type === 'header') {
        questions.push({
          id: `concept_${key.replace(/\s+/g, '_')}`,
          type: 'concept',
          question: `What can you tell me about ${concept.concept}?`,
          expectedAnswer: concept.context,
          term: concept.concept,
          sourceFile: concept.sourceFile,
          context: concept.context,
          difficulty: this.assessDifficulty(concept.context)
        });
      }
    });

    return questions;
  }

  /**
   * Validate if a term and definition pair is valid
   * @param {string} term - The term
   * @param {string} definition - The definition
   * @returns {boolean} Whether the definition is valid
   */
  isValidDefinition(term, definition) {
    return term.length > 2 && 
           term.length < 100 && 
           definition.length > 10 && 
           definition.length < 500 &&
           !term.includes('\n') &&
           definition.includes(' '); // Must have multiple words
  }

  /**
   * Validate if a concept is worth extracting
   * @param {string} concept - The concept text
   * @returns {boolean} Whether the concept is valid
   */
  isValidConcept(concept) {
    return concept.length > 3 && 
           concept.length < 100 &&
           !concept.includes('\n') &&
           !/^\d+\./.test(concept) && // Not a numbered list item
           !/^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/i.test(concept);
  }

  /**
   * Extract context around a match
   * @param {string} content - Full content
   * @param {number} index - Match index
   * @returns {string} Context around the match
   */
  extractContext(content, index) {
    const contextLength = 200;
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + contextLength);
    return content.substring(start, end).trim();
  }

  /**
   * Generate a section ID from title
   * @param {string} title - Section title
   * @returns {string} Section ID
   */
  generateSectionId(title) {
    return title.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .trim();
  }

  /**
   * Assess the difficulty of content
   * @param {string} text - Text to assess
   * @returns {string} Difficulty level
   */
  assessDifficulty(text) {
    const complexWords = ['algorithm', 'architecture', 'optimization', 'implementation', 'infrastructure'];
    const hasComplexWords = complexWords.some(word => text.toLowerCase().includes(word));
    const wordCount = text.split(' ').length;
    
    if (hasComplexWords || wordCount > 30) return 'hard';
    if (wordCount > 15) return 'medium';
    return 'easy';
  }

  /**
   * Get parsed content
   * @returns {Object} The parsed content
   */
  getParsedContent() {
    return this.parsedContent;
  }

  /**
   * Get all definitions
   * @returns {Map} Map of definitions
   */
  getDefinitions() {
    return this.parsedContent.definitions || new Map();
  }

  /**
   * Get all concepts
   * @returns {Map} Map of concepts
   */
  getConcepts() {
    return this.parsedContent.concepts || new Map();
  }

  /**
   * Get all key phrases
   * @returns {Map} Map of key phrases
   */
  getKeyPhrases() {
    return this.parsedContent.keyPhrases || new Map();
  }
}

export default ContentParser;