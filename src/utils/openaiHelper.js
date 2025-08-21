import OpenAI from 'openai';
import { getApiKey, isValidApiKey } from './settingsManager';

// OpenAI client with API key from environment or user settings
let openaiClient = null;

// Initialize OpenAI client with API key from settings
export const initializeOpenAI = (apiKey = null) => {
  // Use provided key or get from settings/environment
  const key = apiKey || getApiKey();
  
  if (!key) {
    console.warn('OpenAI API key not found in environment or user settings');
    return false;
  }
  
  if (!isValidApiKey(key)) {
    console.error('Invalid OpenAI API key format');
    return false;
  }
  
  openaiClient = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true
  });
  
  console.log('✅ OpenAI client initialized successfully');
  return true;
};

// Check if OpenAI is available
export const isOpenAIAvailable = () => {
  return openaiClient !== null;
};

// Simple text similarity calculation
const calculateTextSimilarity = (text1, text2) => {
  // Normalize texts
  const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const t1 = normalize(text1);
  const t2 = normalize(text2);
  
  // If texts are identical
  if (t1 === t2) return 1.0;
  
  // Word-based similarity
  const words1 = new Set(t1.split(/\s+/));
  const words2 = new Set(t2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  // Jaccard similarity
  const jaccard = intersection.size / union.size;
  
  // Length similarity bonus
  const lengthRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
  
  // Combined score
  return (jaccard * 0.7) + (lengthRatio * 0.3);
};

// Fallback evaluation using text similarity
const evaluateWithTextSimilarity = (userAnswer, expectedAnswer) => {
  const similarity = calculateTextSimilarity(userAnswer, expectedAnswer);
  const score = Math.round(similarity * 100);
  
  return {
    score: score,
    isCorrect: score >= 70,
    feedback: score >= 70 ? 
      `Great! ${score}% similarity to expected definition.` : 
      `Partial match (${score}%). Include more key concepts from the definition.`,
    confidence: 0.8,
    similarities: [],
    missingConcepts: [],
    suggestions: score < 70 ? 
      ['Include more key terms', 'Use terminology from the definition'] : 
      ['Well done!'],
    apiUsage: {
      model: 'text-similarity-fallback',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    }
  };
};

// Track OpenAI failures for automatic fallback
let consecutiveFailures = 0;
const MAX_FAILURES = 2;

// Reset failure counter for testing
export const resetFailureCounter = () => {
  consecutiveFailures = 0;
  console.log('🔄 OpenAI failure counter reset');
};

// Evaluate answer similarity using OpenAI with simplified approach for definitions
export const evaluateAnswer = async (userAnswer, expectedAnswer, question) => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  // If OpenAI has been failing, skip directly to text similarity
  if (consecutiveFailures >= MAX_FAILURES) {
    console.log('🔄 Bypassing OpenAI due to consecutive failures, using text similarity');
    return evaluateWithTextSimilarity(userAnswer, expectedAnswer);
  }

  // Voice-friendly prompt optimized for speech recognition errors
  const prompt = `Evaluate this SPOKEN answer from speech-to-text (0-100 points):

EXPECTED ANSWER: ${expectedAnswer}
STUDENT ANSWER: ${userAnswer}

EVALUATION CRITERIA:
- Award points for key concepts mentioned (computer systems, human-like intelligence, learning, reasoning, etc.)
- Deduct points for missing important concepts (machine learning, deep learning, generative AI)
- Ignore speech recognition errors like "abroad" instead of "broad"
- Focus on conceptual understanding, not grammar

SCORING:
- 90-100: All key concepts covered
- 70-89: Most key concepts with minor gaps  
- 50-69: Basic understanding with significant gaps
- 30-49: Limited understanding
- 0-29: Incorrect or no understanding

Return JSON format: {"score": [0-100], "isCorrect": [true/false], "feedback": "specific feedback about what was good/missing"}`;

  const requestPayload = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI tutor evaluating student answers. Provide detailed scores based on conceptual understanding. Be forgiving of speech-to-text errors but strict about missing key concepts.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 150,
    temperature: 0.3
  };

  // Log API request (console + logging panel)
  const requestLog = {
    model: requestPayload.model,
    max_completion_tokens: requestPayload.max_completion_tokens,
    question_preview: question.substring(0, 50) + '...',
    user_answer_preview: userAnswer.substring(0, 50) + '...',
    full_request: requestPayload,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔵 OpenAI API Request:', requestLog);
  
  // Emit for logging panel
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('openai-api-log', {
      detail: {
        type: 'request',
        message: `Request to ${requestPayload.model}`,
        data: requestLog
      }
    }));
  }

  try {
    const response = await openaiClient.chat.completions.create(requestPayload);
    
    // Parse JSON response with fallback handling
    let result;
    const rawContent = response.choices[0].message.content;
    
    // Log API response (console + logging panel)
    const responseLog = {
      model: response.model,
      usage: response.usage,
      finish_reason: response.choices[0].finish_reason,
      response_preview: response.choices[0].message.content.substring(0, 100) + '...',
      full_response: response,
      raw_content: rawContent,
      content_length: rawContent.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('🟢 OpenAI API Response:', responseLog);
    console.log('🔍 Raw API Response (full):', rawContent);
    console.log('🔍 Response length:', rawContent.length);
    console.log('🔍 Finish reason:', response.choices[0].finish_reason);
    
    // Emit for logging panel
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openai-api-log', {
        detail: {
          type: 'response',
          message: `Response from ${response.model} (${rawContent.length} chars, ${response.choices[0].finish_reason})`,
          data: responseLog
        }
      }));
    }
    
    try {
      result = JSON.parse(rawContent);
      // Reset failure counter on successful parse
      consecutiveFailures = 0;
    } catch (parseError) {
      console.warn('❌ JSON Parse Error, falling back to text similarity:', parseError.message);
      
      // Increment failure counter
      consecutiveFailures++;
      
      // Emit parse error log
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openai-api-log', {
          detail: {
            type: 'error',
            message: 'JSON Parse Failed - Using Text Similarity Fallback',
            data: {
              error: parseError.message,
              raw_content: rawContent,
              content_length: rawContent.length,
              consecutive_failures: consecutiveFailures
            }
          }
        }));
      }
      
      return evaluateWithTextSimilarity(userAnswer, expectedAnswer);
    }
    
    // Add metadata
    const evaluationResult = {
      ...result,
      confidence: response.choices[0].finish_reason === 'stop' ? 0.9 : 0.5,
      similarities: result.similarities || [],
      missingConcepts: result.missingConcepts || [],
      suggestions: result.suggestions || ['Try including key terms from the definition', 'Be more specific in your answer'],
      apiUsage: {
        model: response.model,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };

    console.log('✅ Evaluation Complete:', {
      score: evaluationResult.score,
      isCorrect: evaluationResult.isCorrect,
      tokens_used: evaluationResult.apiUsage.totalTokens
    });

    // Dispatch usage event for tracking component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openai-api-usage', {
        detail: { usage: evaluationResult.apiUsage }
      }));
    }

    return evaluationResult;
  } catch (error) {
    console.error('❌ OpenAI API Error:', {
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString()
    });
    
    // Increment failure counter and use fallback
    consecutiveFailures++;
    console.log('🔄 OpenAI failed, using text similarity fallback');
    
    return evaluateWithTextSimilarity(userAnswer, expectedAnswer);
  }
};

// Evaluate examples provided by user for questions with example lists
export const evaluateExamples = async (userExamples, expectedExamples, question) => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  // If OpenAI has been failing, skip directly to basic examples check
  if (consecutiveFailures >= MAX_FAILURES) {
    console.log('🔄 Bypassing OpenAI for examples evaluation, using basic matching');
    return evaluateExamplesBasic(userExamples, expectedExamples);
  }

  const prompt = `Evaluate these SPOKEN examples for AI technology:

Question: ${question}
Expected examples: ${expectedExamples.join(', ')}
User examples: ${userExamples}

SCORING GUIDELINES:
- Valid AI systems/apps (Siri, Alexa, Google Translate, Netflix recommendations): 80-100 points
- Generic tech brands without AI focus (iPhone, Microsoft, Apple): 0-15 points  
- Mix of valid AI + non-AI examples: 40-70 points
- User can provide different valid AI examples not in the expected list
- Ignore speech recognition errors (e.g. "Serie" for "Siri")

Count valid AI examples and score accordingly:
- 3+ valid AI examples: 85-100 points
- 2 valid AI examples: 70-85 points  
- 1 valid AI example: 50-70 points
- 0 valid AI examples: 0-15 points

Return JSON: {"score": number, "isCorrect": boolean, "feedback": "explanation", "validExamples": ["list"], "suggestions": ["tips"]}`;

  const requestPayload = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are evaluating AI examples. Award high scores for actual AI systems like Siri, Alexa, Google Translate. Be strict about non-AI brands but generous for valid AI examples.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 200,
    temperature: 0.2
  };

  try {
    const response = await openaiClient.chat.completions.create(requestPayload);
    const rawContent = response.choices[0].message.content;
    
    // Log for debugging
    console.log('🟢 Examples evaluation response:', rawContent);
    
    try {
      const result = JSON.parse(rawContent);
      consecutiveFailures = 0; // Reset on success
      
      return {
        ...result,
        confidence: response.choices[0].finish_reason === 'stop' ? 0.9 : 0.5,
        apiUsage: {
          model: response.model,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (parseError) {
      console.warn('❌ Examples JSON Parse Error, using basic evaluation:', parseError.message);
      consecutiveFailures++;
      return evaluateExamplesBasic(userExamples, expectedExamples);
    }
  } catch (error) {
    console.error('❌ Examples OpenAI API Error:', error.message);
    consecutiveFailures++;
    return evaluateExamplesBasic(userExamples, expectedExamples);
  }
};

// Basic examples evaluation fallback - strict AI-only scoring
const evaluateExamplesBasic = (userExamples, expectedExamples) => {
  const userText = userExamples.toLowerCase();
  
  // Count how many expected AI examples are mentioned
  let matches = 0;
  expectedExamples.forEach(example => {
    const exampleKeywords = example.toLowerCase().split(' ');
    if (exampleKeywords.some(keyword => userText.includes(keyword))) {
      matches++;
    }
  });
  
  // Check for generic non-AI terms that should get low scores
  const nonAITerms = ['iphone', 'microsoft', 'apple', 'google company', 'facebook company', 'amazon company', 'computer', 'laptop', 'phone'];
  const hasNonAITerms = nonAITerms.some(term => userText.includes(term));
  
  let score;
  if (matches === 0 && hasNonAITerms) {
    score = Math.random() * 10; // 0-10 for non-AI examples
  } else if (matches > 0) {
    score = Math.min(90, (matches / expectedExamples.length) * 80 + 20);
  } else {
    score = 20; // Some credit for trying
  }
  
  return {
    score: Math.round(score),
    isCorrect: score >= 60,
    feedback: matches > 0 ? 
      `Found ${matches} relevant AI examples. Try to provide more specific examples.` :
      'Examples must be specific AI systems or applications, not generic tech brands or devices.',
    validExamples: [],
    suggestions: ['Try Siri, Google Search, Netflix recommendations, Tesla Autopilot'],
    confidence: 0.6,
    apiUsage: {
      model: 'basic-examples-fallback',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    }
  };
};

// Generate embeddings for semantic similarity
export const getEmbedding = async (text) => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

// Calculate cosine similarity between two embeddings
export const calculateCosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Generate question variations
export const generateQuestionVariations = async (originalQuestion, context) => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized');
  }

  const prompt = `
Generate 3 different ways to ask the same question while maintaining the same learning objective.

Original Question: "${originalQuestion}"
Context: "${context}"

Return a JSON array of alternative questions:
["variation1", "variation2", "variation3"]

Keep the same difficulty level and ensure they test the same knowledge.
`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'You are an educational content creator that generates question variations for assessment purposes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 300
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error generating question variations:', error);
    throw error;
  }
};

// Realtime API Integration for voice conversations
export class RealtimeConversation {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.onMessage = null;
    this.onError = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }

  // Connect to OpenAI Realtime API
  async connect() {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03';
    
    try {
      this.websocket = new WebSocket(url, [], {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.websocket.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        this.isConnected = true;
        if (this.onConnect) this.onConnect();
        
        // Send session configuration
        this.sendMessage({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are an AI tutor helping students learn. Evaluate their spoken answers and provide feedback.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        });
      };

      this.websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received realtime message:', message);
        if (this.onMessage) this.onMessage(message);
      };

      this.websocket.onclose = () => {
        console.log('Disconnected from OpenAI Realtime API');
        this.isConnected = false;
        if (this.onDisconnect) this.onDisconnect();
      };

      this.websocket.onerror = (error) => {
        console.error('Realtime API error:', error);
        if (this.onError) this.onError(error);
      };

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      throw error;
    }
  }

  // Send message to realtime API
  sendMessage(message) {
    if (!this.isConnected || !this.websocket) {
      console.error('Not connected to Realtime API');
      return;
    }

    this.websocket.send(JSON.stringify(message));
  }

  // Send audio data for processing
  sendAudio(audioData) {
    this.sendMessage({
      type: 'input_audio_buffer.append',
      audio: audioData
    });
  }

  // Commit audio buffer for processing
  commitAudio() {
    this.sendMessage({
      type: 'input_audio_buffer.commit'
    });
  }

  // Send text message for evaluation
  sendTextForEvaluation(text, question, expectedAnswer) {
    this.sendMessage({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Please evaluate this answer:
Question: ${question}
Expected Answer: ${expectedAnswer}
Student Answer: ${text}

Provide a score (0-100), feedback, and suggestions for improvement.`
        }]
      }
    });

    // Trigger response generation
    this.sendMessage({
      type: 'response.create',
      response: {
        modalities: ['text'],
        instructions: 'Evaluate the student answer and provide constructive feedback.'
      }
    });
  }

  // Disconnect from realtime API
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance for realtime conversations
export const realtimeConversation = new RealtimeConversation();

// Note: OpenAI client will be initialized when API key becomes available
// Call initializeOpenAI() manually after API key is set
