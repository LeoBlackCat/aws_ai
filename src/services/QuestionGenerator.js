/**
 * QuestionGenerator - Creates questions from parsed content and generates new ones via OpenAI
 */
class QuestionGenerator {
  constructor(openAIService = null) {
    this.openAIService = openAIService;
    this.questionBank = [];
    this.usedQuestions = new Set();
    this.questionTypes = ['definition', 'explanation', 'comparison', 'application'];
    this.difficultyLevels = ['easy', 'medium', 'hard'];
  }

  /**
   * Generate questions from parsed content
   * @param {Object} concepts - Parsed concepts and definitions
   * @param {string} difficulty - Target difficulty level
   * @returns {Array} Array of generated questions
   */
  generateFromContent(concepts, difficulty = 'medium') {
    const questions = [];
    
    // Generate from definitions
    if (concepts.definitions) {
      concepts.definitions.forEach((def, key) => {
        if (this.matchesDifficulty(def, difficulty)) {
          questions.push(...this.createDefinitionQuestions(def));
        }
      });
    }

    // Generate from concepts
    if (concepts.concepts) {
      concepts.concepts.forEach((concept, key) => {
        if (this.matchesDifficulty(concept, difficulty)) {
          questions.push(...this.createConceptQuestions(concept));
        }
      });
    }

    // Generate comparison questions
    questions.push(...this.createComparisonQuestions(concepts, difficulty));

    // Shuffle and return
    return this.shuffleArray(questions);
  }

  /**
   * Create definition-based questions
   * @param {Object} definition - Definition object
   * @returns {Array} Array of questions
   */
  createDefinitionQuestions(definition) {
    const questions = [];
    const baseId = this.generateQuestionId(definition.term);

    // Direct definition question
    questions.push({
      id: `${baseId}_def`,
      type: 'definition',
      question: `What is ${definition.term}?`,
      expectedAnswer: definition.definition,
      term: definition.term,
      sourceFile: definition.sourceFile,
      context: definition.context,
      difficulty: this.assessDifficulty(definition.definition),
      keyPhrases: this.extractKeyPhrasesFromText(definition.definition),
      hints: this.generateHints(definition.definition)
    });

    // Explanation variant
    questions.push({
      id: `${baseId}_exp`,
      type: 'explanation',
      question: `Explain ${definition.term}.`,
      expectedAnswer: definition.definition,
      term: definition.term,
      sourceFile: definition.sourceFile,
      context: definition.context,
      difficulty: this.assessDifficulty(definition.definition),
      keyPhrases: this.extractKeyPhrasesFromText(definition.definition),
      hints: this.generateHints(definition.definition)
    });

    // Fill-in-the-blank variant
    const blankQuestion = this.createFillInBlankQuestion(definition);
    if (blankQuestion) {
      questions.push(blankQuestion);
    }

    return questions;
  }

  /**
   * Create concept-based questions
   * @param {Object} concept - Concept object
   * @returns {Array} Array of questions
   */
  createConceptQuestions(concept) {
    const questions = [];
    const baseId = this.generateQuestionId(concept.concept);

    // Open-ended concept question
    questions.push({
      id: `${baseId}_concept`,
      type: 'concept',
      question: `What can you tell me about ${concept.concept}?`,
      expectedAnswer: concept.context,
      term: concept.concept,
      sourceFile: concept.sourceFile,
      context: concept.context,
      difficulty: this.assessDifficulty(concept.context),
      keyPhrases: this.extractKeyPhrasesFromText(concept.context),
      hints: this.generateHints(concept.context)
    });

    // Application question
    questions.push({
      id: `${baseId}_app`,
      type: 'application',
      question: `How is ${concept.concept} used in practice?`,
      expectedAnswer: concept.context,
      term: concept.concept,
      sourceFile: concept.sourceFile,
      context: concept.context,
      difficulty: this.assessDifficulty(concept.context),
      keyPhrases: this.extractKeyPhrasesFromText(concept.context),
      hints: this.generateHints(concept.context)
    });

    return questions;
  }

  /**
   * Create comparison questions between related concepts
   * @param {Object} concepts - All parsed concepts
   * @param {string} difficulty - Target difficulty
   * @returns {Array} Array of comparison questions
   */
  createComparisonQuestions(concepts, difficulty) {
    const questions = [];
    const relatedPairs = this.findRelatedConcepts(concepts);

    relatedPairs.forEach(([concept1, concept2]) => {
      const questionId = this.generateQuestionId(`${concept1.term}_vs_${concept2.term}`);
      
      questions.push({
        id: `${questionId}_comp`,
        type: 'comparison',
        question: `What is the difference between ${concept1.term} and ${concept2.term}?`,
        expectedAnswer: this.generateComparisonAnswer(concept1, concept2),
        term: `${concept1.term} vs ${concept2.term}`,
        sourceFile: concept1.sourceFile,
        context: `${concept1.context}\n\n${concept2.context}`,
        difficulty: 'medium', // Comparisons are typically medium difficulty
        keyPhrases: [
          ...this.extractKeyPhrasesFromText(concept1.definition || concept1.context),
          ...this.extractKeyPhrasesFromText(concept2.definition || concept2.context)
        ],
        hints: [
          `Think about the key characteristics of ${concept1.term}`,
          `Consider how ${concept2.term} differs in purpose or implementation`
        ]
      });
    });

    return questions;
  }

  /**
   * Create fill-in-the-blank question from definition
   * @param {Object} definition - Definition object
   * @returns {Object|null} Fill-in-the-blank question or null
   */
  createFillInBlankQuestion(definition) {
    const sentences = definition.definition.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return null;

    const sentence = sentences[0].trim();
    const words = sentence.split(' ');
    
    // Find a good word to blank out (not articles, prepositions, etc.)
    const importantWords = words.filter(word => 
      word.length > 3 && 
      !/^(the|and|or|but|in|on|at|to|for|of|with|by|a|an)$/i.test(word)
    );

    if (importantWords.length === 0) return null;

    const wordToBlank = importantWords[Math.floor(Math.random() * importantWords.length)];
    const blankedSentence = sentence.replace(new RegExp(`\\b${wordToBlank}\\b`, 'i'), '______');

    return {
      id: `${this.generateQuestionId(definition.term)}_blank`,
      type: 'fill_blank',
      question: `Complete the sentence: ${blankedSentence}`,
      expectedAnswer: wordToBlank,
      fullAnswer: sentence,
      term: definition.term,
      sourceFile: definition.sourceFile,
      context: definition.context,
      difficulty: 'easy',
      keyPhrases: [wordToBlank.toLowerCase()],
      hints: [`The missing word relates to ${definition.term}`]
    };
  }

  /**
   * Generate questions using OpenAI API
   * @param {string} topic - Topic to generate questions about
   * @param {string} questionType - Type of question to generate
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of generated questions
   */
  async generateWithAI(topic, questionType = 'definition', options = {}) {
    if (!this.openAIService) {
      throw new Error('OpenAI service not configured');
    }

    const prompt = this.buildAIPrompt(topic, questionType, options);
    
    try {
      const response = await this.openAIService.generateQuestions(prompt);
      return this.parseAIResponse(response, topic, questionType);
    } catch (error) {
      console.error('Error generating questions with AI:', error);
      return [];
    }
  }

  /**
   * Build prompt for AI question generation
   * @param {string} topic - Topic for questions
   * @param {string} questionType - Type of questions
   * @param {Object} options - Additional options
   * @returns {string} Formatted prompt
   */
  buildAIPrompt(topic, questionType, options = {}) {
    const { difficulty = 'medium', count = 3, context = '' } = options;

    let prompt = `Generate ${count} ${difficulty} level ${questionType} questions about "${topic}".`;
    
    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    prompt += `\n\nFor each question, provide:
1. The question text
2. The expected answer (using precise terminology)
3. Key phrases that should be included in a correct answer
4. 2-3 hints for training mode

Format as JSON array with objects containing: question, expectedAnswer, keyPhrases, hints`;

    return prompt;
  }

  /**
   * Parse AI response into question objects
   * @param {string} response - AI response
   * @param {string} topic - Original topic
   * @param {string} questionType - Question type
   * @returns {Array} Parsed questions
   */
  parseAIResponse(response, topic, questionType) {
    try {
      const aiQuestions = JSON.parse(response);
      
      return aiQuestions.map((q, index) => ({
        id: `ai_${this.generateQuestionId(topic)}_${index}`,
        type: questionType,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        term: topic,
        sourceFile: 'ai_generated',
        context: q.expectedAnswer,
        difficulty: this.assessDifficulty(q.expectedAnswer),
        keyPhrases: q.keyPhrases || [],
        hints: q.hints || [],
        aiGenerated: true
      }));
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  /**
   * Get next question based on user progress
   * @param {Object} userProgress - User's progress data
   * @param {Object} options - Selection options
   * @returns {Object|null} Next question or null
   */
  getNextQuestion(userProgress = {}, options = {}) {
    const {
      difficulty = 'medium',
      questionType = null,
      excludeUsed = true,
      topic = null
    } = options;

    let availableQuestions = [...this.questionBank];

    // Filter by difficulty
    if (difficulty !== 'any') {
      availableQuestions = availableQuestions.filter(q => q.difficulty === difficulty);
    }

    // Filter by question type
    if (questionType) {
      availableQuestions = availableQuestions.filter(q => q.type === questionType);
    }

    // Filter by topic
    if (topic) {
      availableQuestions = availableQuestions.filter(q => 
        q.term.toLowerCase().includes(topic.toLowerCase()) ||
        q.question.toLowerCase().includes(topic.toLowerCase())
      );
    }

    // Exclude used questions
    if (excludeUsed) {
      availableQuestions = availableQuestions.filter(q => !this.usedQuestions.has(q.id));
    }

    // Prioritize questions user has struggled with
    if (userProgress.struggledTopics) {
      const struggledQuestions = availableQuestions.filter(q =>
        userProgress.struggledTopics.some(topic => 
          q.term.toLowerCase().includes(topic.toLowerCase())
        )
      );
      
      if (struggledQuestions.length > 0) {
        availableQuestions = struggledQuestions;
      }
    }

    // Select random question
    if (availableQuestions.length === 0) {
      return null;
    }

    const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    this.usedQuestions.add(selectedQuestion.id);
    
    return selectedQuestion;
  }

  /**
   * Validate a question object
   * @param {Object} question - Question to validate
   * @param {string} expectedAnswer - Expected answer
   * @returns {boolean} Whether question is valid
   */
  validateQuestion(question, expectedAnswer) {
    return !!(
      question &&
      question.id &&
      question.question &&
      question.expectedAnswer &&
      question.type &&
      this.questionTypes.includes(question.type) &&
      question.question.length > 5 &&
      question.expectedAnswer.length > 5
    );
  }

  /**
   * Find related concepts for comparison questions
   * @param {Object} concepts - All concepts
   * @returns {Array} Array of concept pairs
   */
  findRelatedConcepts(concepts) {
    const pairs = [];
    const definitionArray = Array.from(concepts.definitions?.values() || []);
    
    // Find concepts in the same domain
    const aiTerms = definitionArray.filter(def => 
      def.definition.toLowerCase().includes('artificial intelligence') ||
      def.definition.toLowerCase().includes('machine learning') ||
      def.definition.toLowerCase().includes('ai')
    );

    const mlTerms = definitionArray.filter(def =>
      def.definition.toLowerCase().includes('learning') ||
      def.definition.toLowerCase().includes('algorithm') ||
      def.definition.toLowerCase().includes('model')
    );

    // Create pairs within domains
    for (let i = 0; i < aiTerms.length - 1; i++) {
      for (let j = i + 1; j < Math.min(aiTerms.length, i + 3); j++) {
        pairs.push([aiTerms[i], aiTerms[j]]);
      }
    }

    for (let i = 0; i < mlTerms.length - 1; i++) {
      for (let j = i + 1; j < Math.min(mlTerms.length, i + 3); j++) {
        pairs.push([mlTerms[i], mlTerms[j]]);
      }
    }

    return pairs.slice(0, 5); // Limit to 5 comparison questions
  }

  /**
   * Generate comparison answer between two concepts
   * @param {Object} concept1 - First concept
   * @param {Object} concept2 - Second concept
   * @returns {string} Comparison answer
   */
  generateComparisonAnswer(concept1, concept2) {
    return `${concept1.term} ${concept1.definition || concept1.context} In contrast, ${concept2.term} ${concept2.definition || concept2.context}`;
  }

  /**
   * Extract key phrases from text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of key phrases
   */
  extractKeyPhrasesFromText(text) {
    const importantTerms = [
      'machine learning', 'artificial intelligence', 'deep learning', 'neural networks',
      'supervised learning', 'unsupervised learning', 'reinforcement learning',
      'algorithm', 'model', 'training', 'data', 'prediction', 'classification',
      'regression', 'clustering', 'optimization', 'feature', 'pattern'
    ];

    const foundPhrases = [];
    const lowerText = text.toLowerCase();

    importantTerms.forEach(term => {
      if (lowerText.includes(term)) {
        foundPhrases.push(term);
      }
    });

    return foundPhrases;
  }

  /**
   * Generate hints for a definition or concept
   * @param {string} text - Text to generate hints from
   * @returns {Array} Array of hints
   */
  generateHints(text) {
    const hints = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length > 0) {
      // First hint: partial sentence
      const firstSentence = sentences[0].trim();
      const words = firstSentence.split(' ');
      if (words.length > 5) {
        hints.push(`It starts with: "${words.slice(0, Math.ceil(words.length / 2)).join(' ')}..."`);
      }
    }

    // Second hint: key concept
    const keyPhrases = this.extractKeyPhrasesFromText(text);
    if (keyPhrases.length > 0) {
      hints.push(`Think about: ${keyPhrases[0]}`);
    }

    // Third hint: context clue
    if (text.includes('learning')) {
      hints.push('This concept relates to learning and algorithms');
    } else if (text.includes('network')) {
      hints.push('This involves networks or connections');
    } else if (text.includes('data')) {
      hints.push('This concept works with data processing');
    }

    return hints.slice(0, 3); // Maximum 3 hints
  }

  /**
   * Utility methods
   */
  generateQuestionId(term) {
    return term.toLowerCase()
               .replace(/[^\w\s-]/g, '')
               .replace(/\s+/g, '_')
               .substring(0, 50);
  }

  matchesDifficulty(item, targetDifficulty) {
    if (targetDifficulty === 'any') return true;
    const itemDifficulty = this.assessDifficulty(item.definition || item.context);
    return itemDifficulty === targetDifficulty;
  }

  assessDifficulty(text) {
    const complexWords = ['algorithm', 'architecture', 'optimization', 'implementation', 'infrastructure', 'methodology'];
    const hasComplexWords = complexWords.some(word => text.toLowerCase().includes(word));
    const wordCount = text.split(' ').length;
    
    if (hasComplexWords || wordCount > 30) return 'hard';
    if (wordCount > 15) return 'medium';
    return 'easy';
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Public methods for managing question bank
   */
  setQuestionBank(questions) {
    this.questionBank = questions;
  }

  addQuestions(questions) {
    this.questionBank.push(...questions);
  }

  getQuestionBank() {
    return this.questionBank;
  }

  resetUsedQuestions() {
    this.usedQuestions.clear();
  }

  getUsedQuestions() {
    return Array.from(this.usedQuestions);
  }
}

export default QuestionGenerator;