import path from 'path';
import fs from 'fs/promises';

/**
 * ContentParser - Parses AWS AI course markdown files and extracts educational content
 * Handles course structure detection, asset resolution, frontmatter extraction, and cross-references
 */
class ContentParser {
  constructor() {
    this.parsedContent = {
      definitions: new Map(),
      concepts: new Map(),
      keyPhrases: new Map(),
      sections: new Map(),
      questionBank: []
    };
    this.courseStructure = null;
    this.assetMap = new Map();
    this.crossReferences = new Map();
    this.slugMap = new Map();
  }

  /**
   * Parse AWS AI course from directory structure
   * @param {string} coursePath - Path to the course directory
   * @returns {Promise<Object>} Parsed course structure
   */
  async parseAWSCourse(coursePath) {
    try {
      // Detect course structure
      const courseStructure = await this.detectCourseStructure(coursePath);
      
      // Parse all markdown files
      const allContent = this.parseMarkdownFiles(courseStructure.files);
      
      // Resolve assets
      await this.resolveAssets(coursePath, allContent);
      
      // Extract cross-references
      this.extractCrossReferences(allContent);
      
      // Generate slug mappings
      this.generateSlugMappings(courseStructure);
      
      return {
        ...allContent,
        courseStructure,
        assets: this.assetMap,
        crossReferences: this.crossReferences,
        slugMap: this.slugMap
      };
    } catch (error) {
      console.error('Error parsing AWS course:', error);
      throw error;
    }
  }

  /**
   * Detect AWS AI course structure from directory
   * @param {string} coursePath - Path to the course directory
   * @returns {Promise<Object>} Course structure
   */
  async detectCourseStructure(coursePath) {
    const structure = {
      title: 'AWS AI Practitioner',
      modules: [],
      files: []
    };

    try {
      // Read main course file
      const mainCoursePath = path.join(coursePath, 'aws_ai_practitioner.md');
      const mainCourseContent = await fs.readFile(mainCoursePath, 'utf-8');
      
      // Extract module information from main course file
      const moduleLinks = this.extractModuleLinks(mainCourseContent);
      
      // Process each module
      for (const moduleLink of moduleLinks) {
        const modulePath = path.join(coursePath, moduleLink.path);
        const moduleDir = path.dirname(modulePath);
        
        try {
          const moduleContent = await fs.readFile(modulePath, 'utf-8');
          const frontmatter = this.extractFrontmatter(moduleContent);
          
          const module = {
            title: moduleLink.title,
            slug: this.generateSlug(moduleLink.title),
            path: moduleLink.path,
            directory: moduleDir,
            order: structure.modules.length,
            frontmatter,
            lessons: []
          };

          // Find all markdown files in module directory
          const moduleFiles = await this.findMarkdownFiles(moduleDir);
          
          for (const filePath of moduleFiles) {
            const relativePath = path.relative(coursePath, filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            const lessonFrontmatter = this.extractFrontmatter(content);
            
            const lesson = {
              title: this.extractTitleFromContent(content) || path.basename(filePath, '.md'),
              slug: this.generateSlug(path.basename(filePath, '.md')),
              path: relativePath,
              frontmatter: lessonFrontmatter,
              order: module.lessons.length
            };
            
            module.lessons.push(lesson);
            structure.files.push({
              name: relativePath,
              content,
              module: module.slug,
              lesson: lesson.slug
            });
          }
          
          structure.modules.push(module);
        } catch (error) {
          console.warn(`Could not process module ${moduleLink.path}:`, error.message);
        }
      }
      
      this.courseStructure = structure;
      return structure;
    } catch (error) {
      console.error('Error detecting course structure:', error);
      throw error;
    }
  }

  /**
   * Extract module links from main course markdown
   * @param {string} content - Main course markdown content
   * @returns {Array} Array of module link objects
   */
  extractModuleLinks(content) {
    const links = [];
    const linkRegex = /##\s+\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        title: match[1].trim(),
        path: match[2].trim()
      });
    }
    
    return links;
  }

  /**
   * Find all markdown files in a directory recursively
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array>} Array of markdown file paths
   */
  async findMarkdownFiles(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dirPath}:`, error.message);
    }
    
    return files;
  }

  /**
   * Extract frontmatter from markdown content
   * @param {string} content - Markdown content
   * @returns {Object} Frontmatter object
   */
  extractFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return {};
    }
    
    try {
      const frontmatterText = match[1];
      const frontmatter = {};
      
      // Simple YAML parser for basic key-value pairs
      const lines = frontmatterText.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          
          // Try to parse as number or boolean
          if (cleanValue === 'true') {
            frontmatter[key] = true;
          } else if (cleanValue === 'false') {
            frontmatter[key] = false;
          } else if (!isNaN(cleanValue) && cleanValue !== '') {
            frontmatter[key] = Number(cleanValue);
          } else {
            frontmatter[key] = cleanValue;
          }
        }
      }
      
      return frontmatter;
    } catch (error) {
      console.warn('Error parsing frontmatter:', error);
      return {};
    }
  }

  /**
   * Extract title from markdown content
   * @param {string} content - Markdown content
   * @returns {string|null} Extracted title
   */
  extractTitleFromContent(content) {
    // Remove frontmatter first
    const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    
    // Find first H1 header
    const h1Match = contentWithoutFrontmatter.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    return null;
  }

  /**
   * Resolve assets (images, videos, etc.) and create asset mappings
   * @param {string} coursePath - Base course path
   * @param {Object} parsedContent - Parsed content structure
   * @returns {Promise<void>}
   */
  async resolveAssets(coursePath, parsedContent) {
    const assetRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    for (const [fileName, sections] of parsedContent.sections) {
      const filePath = path.join(coursePath, fileName);
      const fileDir = path.dirname(filePath);
      
      for (const section of sections) {
        let match;
        while ((match = assetRegex.exec(section.content)) !== null) {
          const altText = match[1];
          const assetPath = match[2];
          
          // Resolve relative paths
          const resolvedPath = path.isAbsolute(assetPath) 
            ? assetPath 
            : path.resolve(fileDir, assetPath);
          
          const assetId = `${fileName}:${assetPath}`;
          
          try {
            // Check if asset exists
            await fs.access(resolvedPath);
            
            const asset = {
              id: assetId,
              filename: path.basename(assetPath),
              originalPath: assetPath,
              resolvedPath,
              relativePath: path.relative(coursePath, resolvedPath),
              altText,
              type: this.getAssetType(assetPath),
              sourceFile: fileName,
              sourceSection: section.id
            };
            
            // Get file stats
            const stats = await fs.stat(resolvedPath);
            asset.size = stats.size;
            asset.lastModified = stats.mtime;
            
            this.assetMap.set(assetId, asset);
          } catch (error) {
            console.warn(`Asset not found: ${resolvedPath}`);
            
            // Create placeholder for missing asset
            this.assetMap.set(assetId, {
              id: assetId,
              filename: path.basename(assetPath),
              originalPath: assetPath,
              resolvedPath,
              relativePath: path.relative(coursePath, resolvedPath),
              altText,
              type: this.getAssetType(assetPath),
              sourceFile: fileName,
              sourceSection: section.id,
              missing: true,
              error: error.message
            });
          }
        }
      }
    }
  }

  /**
   * Determine asset type from file extension
   * @param {string} assetPath - Asset file path
   * @returns {string} Asset type
   */
  getAssetType(assetPath) {
    const ext = path.extname(assetPath).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
      return 'image';
    } else if (['.mp4', '.webm', '.ogg', '.avi'].includes(ext)) {
      return 'video';
    } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      return 'audio';
    } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
      return 'document';
    }
    
    return 'unknown';
  }

  /**
   * Extract cross-references between lessons
   * @param {Object} parsedContent - Parsed content structure
   */
  extractCrossReferences(parsedContent) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    for (const [fileName, sections] of parsedContent.sections) {
      for (const section of sections) {
        let match;
        while ((match = linkRegex.exec(section.content)) !== null) {
          const linkText = match[1];
          const linkPath = match[2];
          
          // Skip external links and assets
          if (linkPath.startsWith('http') || linkPath.startsWith('#') || this.isAssetLink(linkPath)) {
            continue;
          }
          
          const crossRef = {
            fromFile: fileName,
            fromSection: section.id,
            linkText,
            linkPath,
            context: this.extractContext(section.content, match.index),
            anchor: linkPath.includes('#') ? linkPath.split('#')[1] : null
          };
          
          const refId = `${fileName}:${section.id}:${linkPath}`;
          this.crossReferences.set(refId, crossRef);
        }
      }
    }
  }

  /**
   * Check if a link is an asset link
   * @param {string} linkPath - Link path
   * @returns {boolean} True if it's an asset link
   */
  isAssetLink(linkPath) {
    const assetExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.mp4', '.webm', '.ogg', '.avi', '.mp3', '.wav', '.m4a', '.pdf', '.doc', '.docx'];
    return assetExtensions.some(ext => linkPath.toLowerCase().endsWith(ext));
  }

  /**
   * Generate slug mappings for canonical URLs
   * @param {Object} courseStructure - Course structure
   */
  generateSlugMappings(courseStructure) {
    // Course-level slug
    const courseSlug = this.generateSlug(courseStructure.title);
    this.slugMap.set('course', courseSlug);
    
    // Module-level slugs
    for (const module of courseStructure.modules) {
      const moduleSlug = `${courseSlug}/${module.slug}`;
      this.slugMap.set(`module:${module.slug}`, moduleSlug);
      
      // Lesson-level slugs
      for (const lesson of module.lessons) {
        const lessonSlug = `${moduleSlug}/${lesson.slug}`;
        this.slugMap.set(`lesson:${module.slug}:${lesson.slug}`, lessonSlug);
        
        // Also create reverse mapping for path resolution
        this.slugMap.set(`path:${lesson.path}`, lessonSlug);
      }
    }
  }

  /**
   * Generate URL-friendly slug from text
   * @param {string} text - Text to convert to slug
   * @returns {string} URL-friendly slug
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '-') // Replace special characters with hyphens
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-{3,}/g, '--')   // Replace 3+ hyphens with double hyphen
      .trim()                    // Remove leading/trailing whitespace
      .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
  }

  /**
   * Parse multiple markdown files and extract content
   * @param {Array} files - Array of {name, content, module, lesson} objects
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
        allContent.definitions.set(key, { 
          ...value, 
          sourceFile: file.name,
          module: file.module,
          lesson: file.lesson
        });
      });
      
      // Merge concepts
      parsed.concepts.forEach((value, key) => {
        allContent.concepts.set(key, { 
          ...value, 
          sourceFile: file.name,
          module: file.module,
          lesson: file.lesson
        });
      });
      
      // Merge key phrases
      parsed.keyPhrases.forEach((value, key) => {
        allContent.keyPhrases.set(key, { 
          ...value, 
          sourceFile: file.name,
          module: file.module,
          lesson: file.lesson
        });
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
    const boldDefinitionRegex = /\*\*([^*]+)\*\*[:\s]*([^.\n]+[.])/g;
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
    
    // AWS-specific and AI/ML phrases that should be preserved
    const importantPhrases = [
      // AI/ML General Terms
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
      'computer vision',
      
      // AWS AI/ML Services
      'Amazon SageMaker',
      'Amazon Bedrock',
      'Amazon Rekognition',
      'Amazon Comprehend',
      'Amazon Textract',
      'Amazon Polly',
      'Amazon Lex',
      'Amazon Kendra',
      'Amazon Personalize',
      'Amazon Forecast',
      'Amazon Transcribe',
      'Amazon Translate',
      'AWS DeepLens',
      'AWS DeepRacer',
      
      // AWS General Services
      'Amazon EC2',
      'Amazon S3',
      'Amazon RDS',
      'AWS Lambda',
      'Amazon CloudWatch',
      'AWS IAM',
      'Amazon VPC',
      
      // AI/ML Concepts
      'training data',
      'inference',
      'model deployment',
      'feature engineering',
      'data preprocessing',
      'model evaluation',
      'hyperparameter tuning',
      'overfitting',
      'underfitting',
      'bias-variance tradeoff',
      'cross-validation',
      'ensemble methods',
      'transfer learning',
      'data augmentation',
      'regularization'
    ];

    // Extract exact phrase matches
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
            importance: 'high',
            category: this.categorizePhrase(foundPhrase)
          });
        }
      }
    });

    // Extract AWS service abbreviations
    const awsServiceRegex = /\b(EC2|S3|RDS|IAM|VPC|API|SDK|CLI|ML|AI|NLP|CV|ASR|TTS|RAG|LLM|FM)\b/g;
    let match;
    
    while ((match = awsServiceRegex.exec(content)) !== null) {
      const abbreviation = match[0];
      const phraseKey = abbreviation.toLowerCase();
      
      if (!keyPhrases.has(phraseKey)) {
        keyPhrases.set(phraseKey, {
          phrase: abbreviation,
          context: this.extractContext(content, match.index),
          sourceFile: fileName,
          importance: 'medium',
          category: 'aws-abbreviation'
        });
      }
    }

    return keyPhrases;
  }

  /**
   * Categorize a phrase based on its content
   * @param {string} phrase - Phrase to categorize
   * @returns {string} Category
   */
  categorizePhrase(phrase) {
    const lowerPhrase = phrase.toLowerCase();
    
    if (lowerPhrase.includes('amazon') || lowerPhrase.includes('aws')) {
      return 'aws-service';
    } else if (lowerPhrase.includes('learning') || lowerPhrase.includes('intelligence') || lowerPhrase.includes('neural')) {
      return 'ai-ml-concept';
    } else if (lowerPhrase.includes('data') || lowerPhrase.includes('model') || lowerPhrase.includes('training')) {
      return 'ml-process';
    } else {
      return 'general-tech';
    }
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
    return term.length >= 2 && 
           term.length < 100 && 
           definition.length >= 10 && 
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
                .replace(/[^\w\s-]/g, '-')
                .replace(/\s+/g, '-')
                .replace(/-{3,}/g, '--')  // Replace 3+ hyphens with double hyphen
                .replace(/^-+|-+$/g, '');
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
    if (wordCount > 8) return 'medium';
    return 'easy';
  }

  // Getter methods
  getParsedContent() {
    return this.parsedContent;
  }

  getCourseStructure() {
    return this.courseStructure;
  }

  getAssets() {
    return this.assetMap;
  }

  getCrossReferences() {
    return this.crossReferences;
  }

  getSlugMappings() {
    return this.slugMap;
  }

  getCanonicalUrl(modulePath, lessonPath) {
    const key = `lesson:${modulePath}:${lessonPath}`;
    return this.slugMap.get(key) || null;
  }

  resolveAssetUrl(assetPath, sourceFile) {
    const assetId = `${sourceFile}:${assetPath}`;
    return this.assetMap.get(assetId) || null;
  }

  findCrossReferencesTo(targetPath) {
    const references = [];
    
    for (const [refId, crossRef] of this.crossReferences) {
      if (crossRef.linkPath === targetPath || crossRef.linkPath.startsWith(targetPath)) {
        references.push(crossRef);
      }
    }
    
    return references;
  }

  getDefinitions() {
    return this.parsedContent.definitions || new Map();
  }

  getConcepts() {
    return this.parsedContent.concepts || new Map();
  }

  getKeyPhrases() {
    return this.parsedContent.keyPhrases || new Map();
  }

  /**
   * Export parsed content for database ingestion
   * @returns {Object} Structured data for database
   */
  exportForDatabase() {
    return {
      course: {
        title: this.courseStructure?.title || 'AWS AI Practitioner',
        slug: this.slugMap.get('course') || 'aws-ai-practitioner',
        modules: this.courseStructure?.modules || []
      },
      definitions: Array.from(this.getDefinitions().entries()).map(([key, def]) => ({
        term: def.term,
        definition: def.definition,
        category: this.categorizeAWSTerm(def.term, def.definition),
        sourceFile: def.sourceFile,
        module: def.module,
        lesson: def.lesson,
        context: def.context
      })),
      assets: Array.from(this.assetMap.entries()).map(([key, asset]) => ({
        id: asset.id,
        filename: asset.filename,
        path: asset.relativePath,
        type: asset.type,
        size: asset.size,
        sourceFile: asset.sourceFile,
        missing: asset.missing || false
      })),
      crossReferences: Array.from(this.crossReferences.entries()).map(([key, ref]) => ({
        fromFile: ref.fromFile,
        fromSection: ref.fromSection,
        linkText: ref.linkText,
        linkPath: ref.linkPath,
        anchor: ref.anchor,
        context: ref.context
      })),
      slugMappings: Array.from(this.slugMap.entries()).map(([key, slug]) => ({
        key,
        slug
      }))
    };
  }

  /**
   * Categorize AWS terms
   * @param {string} term - Term to categorize
   * @param {string} definition - Term definition
   * @returns {string} Category
   */
  categorizeAWSTerm(term, definition) {
    const text = `${term} ${definition}`.toLowerCase();
    
    if (text.includes('certification') || text.includes('exam') || text.includes('practitioner')) {
      return 'certification-term';
    } else if (text.includes('service') || text.includes('aws') || text.includes('amazon')) {
      return 'aws-service';
    } else if (text.includes('ai') || text.includes('ml') || text.includes('machine learning') || text.includes('artificial intelligence')) {
      return 'ai-concept';
    } else {
      return 'technical-term';
    }
  }
}

export default ContentParser;