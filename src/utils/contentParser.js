import { marked } from 'marked';

// Parse markdown content to extract Q&A pairs
export const parseMarkdownContent = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const markdownText = await response.text();
    
    return extractQAPairs(markdownText, filePath);
  } catch (error) {
    console.error(`Error loading markdown file ${filePath}:`, error);
    return [];
  }
};

// Extract question-answer pairs from markdown text
export const extractQAPairs = (markdownText, source = 'unknown') => {
  const qaPairs = [];
  
  // Parse markdown to tokens
  const tokens = marked.lexer(markdownText);
  
  let currentQuestion = null;
  let currentAnswer = '';
  let currentTopic = 'General';
  let questionCounter = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Track current topic from headers
    if (token.type === 'heading') {
      if (token.depth <= 2) {
        currentTopic = token.text;
      }
      
      // Look for question patterns in headers
      if (isQuestionText(token.text)) {
        // Save previous Q&A if exists
        if (currentQuestion && currentAnswer.trim()) {
          qaPairs.push(createQAPair(currentQuestion, currentAnswer.trim(), currentTopic, source, questionCounter++));
        }
        
        currentQuestion = token.text;
        currentAnswer = '';
      }
    }
    
    // Check for question patterns in paragraphs
    else if (token.type === 'paragraph') {
      const text = token.text;
      
      if (isQuestionText(text)) {
        // Save previous Q&A if exists
        if (currentQuestion && currentAnswer.trim()) {
          qaPairs.push(createQAPair(currentQuestion, currentAnswer.trim(), currentTopic, source, questionCounter++));
        }
        
        currentQuestion = text;
        currentAnswer = '';
      } else if (currentQuestion) {
        // This is part of the answer
        currentAnswer += text + '\n';
      }
    }
    
    // Handle lists as part of answers
    else if (token.type === 'list' && currentQuestion) {
      const listText = formatListAsText(token);
      currentAnswer += listText + '\n';
    }
    
    // Handle code blocks as part of answers
    else if (token.type === 'code' && currentQuestion) {
      currentAnswer += `Code example: ${token.text}\n`;
    }
    
    // Handle blockquotes
    else if (token.type === 'blockquote' && currentQuestion) {
      currentAnswer += token.text + '\n';
    }
  }
  
  // Don't forget the last Q&A pair
  if (currentQuestion && currentAnswer.trim()) {
    qaPairs.push(createQAPair(currentQuestion, currentAnswer.trim(), currentTopic, source, questionCounter++));
  }
  
  return qaPairs;
};

// Check if text looks like a question
const isQuestionText = (text) => {
  const questionIndicators = [
    /^what\s+is/i,
    /^what\s+are/i,
    /^how\s+does/i,
    /^how\s+do/i,
    /^why\s+is/i,
    /^why\s+are/i,
    /^when\s+is/i,
    /^when\s+do/i,
    /^where\s+is/i,
    /^where\s+are/i,
    /^which/i,
    /^who/i,
    /^define/i,
    /^explain/i,
    /^describe/i,
    /\?$/,
    /^.*\s+definition$/i,
    /^.*\s+meaning$/i
  ];
  
  return questionIndicators.some(pattern => pattern.test(text.trim()));
};

// Format list items as readable text
const formatListAsText = (listToken) => {
  let text = '';
  
  if (listToken.items) {
    listToken.items.forEach((item, index) => {
      const itemText = item.text || '';
      text += `${index + 1}. ${itemText}\n`;
    });
  }
  
  return text;
};

// Create a structured Q&A pair object
const createQAPair = (question, answer, topic, source, id) => {
  return {
    id: `${source}_${id}`,
    question: cleanText(question),
    answer: cleanText(answer),
    topic,
    source,
    difficulty: estimateDifficulty(question, answer),
    keywords: extractKeywords(answer),
    createdAt: new Date().toISOString()
  };
};

// Clean and normalize text
const cleanText = (text) => {
  return text
    .replace(/^\s*#+\s*/, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/`(.*?)`/g, '$1') // Remove inline code formatting
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

// Estimate difficulty based on content
const estimateDifficulty = (question, answer) => {
  const complexWords = answer.toLowerCase().match(/\b\w{10,}\b/g)?.length || 0;
  const sentenceCount = answer.split(/[.!?]+/).length;
  const technicalTerms = countTechnicalTerms(answer);
  
  let score = 0;
  score += Math.min(complexWords * 2, 20);
  score += Math.min(sentenceCount, 20);
  score += Math.min(technicalTerms * 10, 30);
  
  if (score < 20) return 'beginner';
  if (score < 40) return 'intermediate';
  return 'advanced';
};

// Count technical terms (common in AI/ML content)
const countTechnicalTerms = (text) => {
  const technicalTerms = [
    'machine learning', 'artificial intelligence', 'neural network', 'algorithm',
    'model', 'training', 'validation', 'overfitting', 'underfitting',
    'supervised learning', 'unsupervised learning', 'deep learning',
    'fine-tuning', 'embeddings', 'transformer', 'attention', 'gradient',
    'optimization', 'hyperparameter', 'feature', 'dataset', 'bias', 'variance'
  ];
  
  const lowerText = text.toLowerCase();
  return technicalTerms.reduce((count, term) => {
    return count + (lowerText.includes(term) ? 1 : 0);
  }, 0);
};

// Extract key terms from answer text
const extractKeywords = (text) => {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Simple keyword extraction - get most frequent words
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
};

// Load JSON Q&A data
export const loadJSONContent = async (filePath) => {
  try {
    // Add cache-busting parameter to force fresh load
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(filePath + cacheBuster);
    const jsonData = await response.json();
    
    // Convert JSON format to our internal format
    const questions = jsonData.questions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      examples: q.examples || [], // Include examples field
      topic: q.category,
      source: jsonData.metadata?.source || filePath,
      difficulty: q.difficulty,
      keywords: q.keywords || [],
      createdAt: new Date().toISOString()
    }));
    
    // Debug log for first few questions
    console.log('Loaded questions with examples:', questions.slice(0, 4).map(q => ({
      id: q.id,
      question: q.question.substring(0, 50) + '...',
      hasExamples: !!q.examples && q.examples.length > 0,
      exampleCount: q.examples ? q.examples.length : 0,
      examples: q.examples
    })));
    
    return questions;
  } catch (error) {
    console.error(`Error loading JSON file ${filePath}:`, error);
    return [];
  }
};

// Load all content - prioritize JSON definitions, fallback to markdown
export const loadAllContent = async () => {
  let allContent = [];
  
  // First try to load the new definition-based JSON
  try {
    const definitionContent = await loadJSONContent('/introduction_definitions_qa.json');
    if (definitionContent.length > 0) {
      allContent.push(...definitionContent);
      console.log(`Loaded ${definitionContent.length} definition-based Q&A pairs from JSON`);
    }
  } catch (error) {
    console.warn('Failed to load definition JSON, falling back to markdown:', error);
  }
  
  // If no JSON content loaded, fallback to markdown files
  if (allContent.length === 0) {
    const dataFiles = [
      '/data/introduction.md',
      '/data/usecases.md', 
      '/data/responsiblepractices.md'
    ];
    
    for (const filePath of dataFiles) {
      try {
        const qaPairs = await parseMarkdownContent(filePath);
        allContent.push(...qaPairs);
      } catch (error) {
        console.warn(`Failed to load ${filePath}:`, error);
      }
    }
    console.log(`Loaded ${allContent.length} Q&A pairs from ${dataFiles.length} markdown files`);
  }
  
  return allContent;
};

// Filter content by topic or difficulty
export const filterContent = (content, filters = {}) => {
  let filtered = [...content];
  
  if (filters.topic) {
    filtered = filtered.filter(item => 
      item.topic.toLowerCase().includes(filters.topic.toLowerCase())
    );
  }
  
  if (filters.difficulty) {
    filtered = filtered.filter(item => item.difficulty === filters.difficulty);
  }
  
  if (filters.keywords && filters.keywords.length > 0) {
    filtered = filtered.filter(item =>
      filters.keywords.some(keyword =>
        item.keywords.includes(keyword.toLowerCase()) ||
        item.question.toLowerCase().includes(keyword.toLowerCase()) ||
        item.answer.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }
  
  return filtered;
};

// Shuffle content array
export const shuffleContent = (content) => {
  const shuffled = [...content];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get random sample of content
export const getRandomSample = (content, count = 10) => {
  const shuffled = shuffleContent(content);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};
