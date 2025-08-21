import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadAllContent, filterContent, shuffleContent, getRandomSample } from './utils/contentParser';
import { evaluateAnswer, evaluateExamples, realtimeConversation, isOpenAIAvailable, resetFailureCounter, initializeOpenAI } from './utils/openaiHelper';
import { speakText } from './utils/speechUtils';
import { getApiKey, getSetting } from './utils/settingsManager';
import QuestionDisplay from './components/QuestionDisplay';
import AnswerEvaluator from './components/AnswerEvaluator';
import FeedbackSystem from './components/FeedbackSystem';
import ProgressTracker from './components/ProgressTracker';
import APIUsageTracker from './components/APIUsageTracker';
import LoggingPanel from './components/LoggingPanel';
import SettingsModal from './components/SettingsModal';

const App = () => {
  // Core app state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState('training'); // 'training' or 'assessment'
  
  // Speech and interaction state
  const [isListening, setIsListening] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Evaluation and feedback
  const [evaluation, setEvaluation] = useState(null);
  const [examplesEvaluation, setExamplesEvaluation] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    averageScore: 0,
    timeSpent: 0,
    startTime: Date.now()
  });

  // Two-step process for questions with examples
  const [currentStep, setCurrentStep] = useState('definition'); // 'definition' or 'examples'
  const [definitionAnswer, setDefinitionAnswer] = useState('');
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  
  // Realtime conversation state
  const [useRealtimeAPI, setUseRealtimeAPI] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // API Key and Settings Management
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  
  // Refs
  const sessionStartTime = useRef(Date.now());
  const [recognition, setRecognition] = useState(null);

  // Simple fallback scoring function
  const calculateSimpleScore = useCallback((userAnswer, expectedAnswer) => {
    const userWords = userAnswer.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const expectedWords = expectedAnswer.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    let matches = 0;
    userWords.forEach(word => {
      if (expectedWords.some(expected => expected.includes(word) || word.includes(expected))) {
        matches++;
      }
    });
    
    return Math.round((matches / expectedWords.length) * 100);
  }, []);

  const evaluateWithRealtimeAPI = useCallback(async (answer) => {
    return new Promise((resolve) => {
      realtimeConversation.onMessage = (message) => {
        if (message.type === 'response.done' && message.response) {
          const content = message.response.output?.[0]?.content?.[0]?.text;
          if (content) {
            try {
              const result = JSON.parse(content);
              resolve(result);
            } catch {
              resolve({
                score: 50,
                isCorrect: false,
                feedback: content,
                suggestions: []
              });
            }
          }
        }
      };
      
      realtimeConversation.sendTextForEvaluation(
        answer,
        currentQuestion.question,
        currentQuestion.answer
      );
    });
  }, [currentQuestion]);

  const updateSessionStats = useCallback((result) => {
    setSessionStats(prev => {
      const newStats = {
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1,
        correctAnswers: prev.correctAnswers + (result.isCorrect ? 1 : 0),
        timeSpent: Date.now() - sessionStartTime.current
      };
      
      newStats.averageScore = prev.questionsAnswered > 0 ? 
        ((prev.averageScore * prev.questionsAnswered) + result.score) / newStats.questionsAnswered : 
        result.score;
      
      return newStats;
    });
  }, []);

  // Evaluate user's answer
  const evaluateCurrentAnswer = useCallback(async (answer) => {
    if (!currentQuestion || !answer.trim()) return;
    
    console.log('Evaluating answer:', answer);
    console.log('Current step:', currentStep);
    console.log('Question has examples:', !!currentQuestion.examples);
    
    setIsProcessing(true);
    
    try {
      let result;
      
      // Check if this is the examples step
      if (currentStep === 'examples' && currentQuestion.examples) {
        console.log('Evaluating examples:', answer);
        console.log('Against expected examples:', currentQuestion.examples);
        
        try {
          result = await evaluateExamples(answer, currentQuestion.examples, currentQuestion.question);
          console.log('Examples evaluation result:', result);
          setExamplesEvaluation(result);
        } catch (examplesError) {
          console.warn('Examples evaluation failed, using basic evaluation:', examplesError);
          result = {
            score: 60,
            isCorrect: true,
            feedback: 'Basic examples evaluation - provided some relevant examples',
            validExamples: [],
            suggestions: ['Try to provide more specific technology examples'],
            confidence: 0.5
          };
          setExamplesEvaluation(result);
        }
        
        // Provide audio feedback for examples
        const feedbackText = result.isCorrect ? 
          `Good examples! ${result.feedback}` : 
          `Examples need improvement. ${result.feedback}`;
        
        try {
          await speakText(feedbackText, { rate: 1.1 });
        } catch (speechError) {
          console.warn('Text-to-speech failed:', speechError);
        }
        
        // Complete the two-step process
        updateSessionStats(result);
        
      } else {
        // Regular definition evaluation
        console.log('Evaluating definition against expected answer:', currentQuestion.answer);
        
        if (useRealtimeAPI && realtimeConnected) {
          console.log('Using Realtime API for evaluation');
          result = await evaluateWithRealtimeAPI(answer);
        } else {
          console.log('Using regular OpenAI API for evaluation');
          try {
            result = await evaluateAnswer(answer, currentQuestion.answer, currentQuestion.question);
            console.log('OpenAI evaluation result:', result);
          } catch (openaiError) {
            console.warn('OpenAI evaluation failed, using fallback:', openaiError);
            // Fallback to simple text comparison
            result = {
              score: calculateSimpleScore(answer, currentQuestion.answer),
              isCorrect: calculateSimpleScore(answer, currentQuestion.answer) >= 70,
              feedback: 'Basic evaluation - OpenAI API not available',
              similarities: [],
              missingConcepts: [],
              suggestions: ['Try to include key terms from the expected answer'],
              confidence: 0.5
            };
          }
        }
        
        console.log('Final evaluation result:', result);
        setEvaluation(result);
        setDefinitionAnswer(answer);
        
        // Provide audio feedback
        const feedbackText = result.isCorrect ? 
          `Correct! ${result.feedback}` : 
          `Not quite right. ${result.feedback}`;
        
        try {
          await speakText(feedbackText, { rate: 1.1 });
        } catch (speechError) {
          console.warn('Text-to-speech failed:', speechError);
        }
        
        // If this question has examples, move to examples step
        if (currentQuestion.examples && currentQuestion.examples.length > 0) {
          console.log('Question has examples, moving to examples step');
          setCurrentStep('examples');
          setUserAnswer('');
          setTranscriptBuffer('');
          setIsProcessing(false); // Reset processing state for examples step
          
          // Announce the examples step
          try {
            await speakText('Now provide some examples of this technology.', { rate: 1.1 });
          } catch (speechError) {
            console.warn('Text-to-speech failed:', speechError);
          }
        } else {
          // No examples, complete normally
          updateSessionStats(result);
        }
      }
      
      // Auto-advance after delay in training mode
      // Only auto-advance if this is NOT a multi-step question, OR if we're completing the final step
      const shouldAutoAdvance = mode === 'training' && result.score >= 70 && (
        !currentQuestion.examples || 
        currentQuestion.examples.length === 0 || 
        currentStep === 'examples'
      );
      
      if (shouldAutoAdvance) {
        setTimeout(() => {
          nextQuestion();
        }, 3000);
      }
      
    } catch (err) {
      console.error('Evaluation failed completely:', err);
      
      // Ultimate fallback - just show that we got the answer
      const fallbackResult = {
        score: 50,
        isCorrect: false,
        feedback: `I heard: "${answer}". Please check if this matches the expected answer.`,
        similarities: [],
        missingConcepts: [],
        suggestions: ['Try again or check the expected answer'],
        confidence: 0.3
      };
      
      setEvaluation(fallbackResult);
      setError('Evaluation system temporarily unavailable. Please check your OpenAI API key.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentQuestion, currentStep, useRealtimeAPI, realtimeConnected, mode, evaluateWithRealtimeAPI, calculateSimpleScore, updateSessionStats]);

  // Handle speech recognition results
  const handleSpeechResult = useCallback((results) => {
    console.log('Speech results received:', results);
    console.log('Results length:', results.length);
    
    if (!results || results.length === 0) {
      console.log('No speech results received');
      setEvaluation({
        score: 0,
        isCorrect: false,
        feedback: 'No speech detected. Please try speaking again.',
        similarities: [],
        missingConcepts: [],
        suggestions: ['Speak louder and clearer', 'Check your microphone'],
        confidence: 0
      });
      return;
    }
    
    const finalResults = results.filter(r => r.isFinal);
    const interimResults = results.filter(r => !r.isFinal);
    
    console.log('Final results:', finalResults.length, 'Interim results:', interimResults.length);
    
    if (finalResults.length > 0) {
      const bestResult = finalResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      console.log('Final transcription:', bestResult.transcript);
      console.log('Confidence:', bestResult.confidence);
      
      setUserAnswer(bestResult.transcript);
      setTranscriptBuffer('');
      
      // Show immediate feedback that we got the transcription
      setEvaluation({
        score: 0,
        isCorrect: false,
        feedback: `I heard: "${bestResult.transcript}". Evaluating...`,
        similarities: [],
        missingConcepts: [],
        suggestions: [],
        confidence: bestResult.confidence || 0
      });
      
      // Then evaluate the answer
      console.log('About to call evaluateCurrentAnswer with:', bestResult.transcript);
      setTimeout(() => evaluateCurrentAnswer(bestResult.transcript), 100);
      
    } else if (interimResults.length > 0) {
      // Show interim results
      const interimText = interimResults[0].transcript;
      console.log('Interim transcription:', interimText);
      setTranscriptBuffer(interimText);
    } else {
      console.log('Results exist but no final or interim results found');
      setEvaluation({
        score: 0,
        isCorrect: false,
        feedback: 'Speech detected but could not be transcribed clearly. Please try again.',
        similarities: [],
        missingConcepts: [],
        suggestions: ['Speak more clearly', 'Reduce background noise'],
        confidence: 0
      });
    }
  }, [evaluateCurrentAnswer]);

  const handleSpeechError = useCallback((error) => {
    console.error('Speech recognition error:', error);
    setIsListening(false);
    
    // Show the error in the evaluation UI
    setEvaluation({
      score: 0,
      isCorrect: false,
      feedback: `Speech recognition error: ${error}. Please try again.`,
      similarities: [],
      missingConcepts: [],
      suggestions: ['Check your microphone permissions', 'Speak clearly and try again'],
      confidence: 0
    });
    
    setError(`Speech recognition error: ${error}`);
  }, []);

  // Navigation functions
  const nextQuestion = useCallback(() => {
    const nextIndex = (currentIndex + 1) % questions.length;
    setCurrentIndex(nextIndex);
    setCurrentQuestion(questions[nextIndex]);
    setUserAnswer('');
    setTranscriptBuffer('');
    setEvaluation(null);
    setExamplesEvaluation(null);
    setCurrentStep('definition');
    setDefinitionAnswer('');
  }, [currentIndex, questions]);

  const previousQuestion = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : questions.length - 1;
    setCurrentIndex(prevIndex);
    setCurrentQuestion(questions[prevIndex]);
    setUserAnswer('');
    setTranscriptBuffer('');
    setEvaluation(null);
    setExamplesEvaluation(null);
    setCurrentStep('definition');
    setDefinitionAnswer('');
  }, [currentIndex, questions]);

  const shuffleQuestions = useCallback(() => {
    const shuffled = shuffleContent(questions);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setCurrentQuestion(shuffled[0]);
    setUserAnswer('');
    setTranscriptBuffer('');
    setEvaluation(null);
  }, [questions]);

  const resetToStart = useCallback(() => {
    setCurrentIndex(0);
    setCurrentQuestion(questions[0]);
    setUserAnswer('');
    setTranscriptBuffer('');
    setEvaluation(null);
    setExamplesEvaluation(null);
    setCurrentStep('definition');
    setDefinitionAnswer('');
  }, [questions]);

  // Force reload content data
  const reloadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const content = await loadAllContent();
      if (content.length > 0) {
        setQuestions(content);
        setCurrentQuestion(content[0]);
        setCurrentIndex(0);
        setUserAnswer('');
        setTranscriptBuffer('');
        setEvaluation(null);
        setExamplesEvaluation(null);
        setCurrentStep('definition');
        setDefinitionAnswer('');
        setError(null);
        console.log('Content reloaded:', content.length, 'questions');
        console.log('First question:', content[0]);
        console.log('First question examples:', content[0].examples);
        console.log('Questions with examples:', content.filter(q => q.examples && q.examples.length > 0).length);
      }
    } catch (error) {
      setError('Failed to reload content');
      console.error('Content reload error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      handleSpeechError(event.error);
    };
    
    recognition.onresult = (event) => {
      console.log('Raw speech recognition event:', event);
      
      // Convert browser event to our expected format
      const results = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          for (let j = 0; j < result.length; j++) {
            results.push({
              transcript: result[j].transcript.trim(),
              confidence: result[j].confidence || 0,
              isFinal: true
            });
          }
        } else {
          for (let j = 0; j < result.length; j++) {
            results.push({
              transcript: result[j].transcript.trim(),
              confidence: result[j].confidence || 0,
              isFinal: false
            });
          }
        }
      }
      
      handleSpeechResult(results);
    };
    
    return recognition;
  }, [handleSpeechResult, handleSpeechError]);

  // Speech interaction
  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognition) {
        recognition.stop();
      }
    } else {
      setUserAnswer('');
      setTranscriptBuffer('');
      setEvaluation(null);
      
      const newRecognition = initSpeechRecognition();
      if (newRecognition) {
        setRecognition(newRecognition);
        newRecognition.start();
      }
    }
  }, [isListening, recognition, initSpeechRecognition]);

  const readQuestion = useCallback(async () => {
    if (currentQuestion) {
      await speakText(currentQuestion.question, { rate: 1.0 });
    }
  }, [currentQuestion]);

  // Realtime API connection
  const toggleRealtimeAPI = useCallback(async () => {
    if (!useRealtimeAPI) {
      try {
        await realtimeConversation.connect();
        
        realtimeConversation.onConnect = () => {
          setRealtimeConnected(true);
          console.log('Connected to OpenAI Realtime API');
        };
        
        realtimeConversation.onDisconnect = () => {
          setRealtimeConnected(false);
          console.log('Disconnected from OpenAI Realtime API');
        };
        
        setUseRealtimeAPI(true);
      } catch (err) {
        console.error('Failed to connect to Realtime API:', err);
        setError('Failed to connect to OpenAI Realtime API. Using standard API instead.');
      }
    } else {
      realtimeConversation.disconnect();
      setUseRealtimeAPI(false);
      setRealtimeConnected(false);
    }
  }, [useRealtimeAPI]);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
    return () => cleanup();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // Reset OpenAI failure counter on app start
      resetFailureCounter();
      
      // Try to initialize OpenAI with available API key
      const apiKey = getApiKey();
      if (apiKey) {
        const initialized = initializeOpenAI(apiKey);
        setHasApiKey(initialized);
        if (!initialized) {
          setShowApiKeyPrompt(true);
        }
      } else {
        setHasApiKey(false);
        setShowApiKeyPrompt(true);
      }
      
      // Load content from markdown files
      console.log('Loading content...');
      const content = await loadAllContent();
      
      if (content.length === 0) {
        throw new Error('No content found. Please check your markdown files in the /data directory.');
      }
      
      // Set questions in order, starting with first question (AI definition)
      setQuestions(content);
      setCurrentQuestion(content[0]);
      setIsContentLoaded(true);
      
      // Set up direct speech recognition (bypassing speechManager wrapper for now)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log('Setting up direct speech recognition');
      } else {
        console.warn('Speech recognition not supported');
      }
      
      console.log(`App initialized with ${content.length} questions`);
      
    } catch (err) {
      console.error('App initialization failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanup = () => {
    if (recognition) {
      recognition.stop();
    }
    if (realtimeConversation.isConnected) {
      realtimeConversation.disconnect();
    }
  };

  // Handle API key updates
  const handleApiKeyUpdate = (newApiKey) => {
    if (newApiKey && newApiKey.trim()) {
      const initialized = initializeOpenAI(newApiKey);
      setHasApiKey(initialized);
      if (initialized) {
        setShowApiKeyPrompt(false);
        setShowSettings(false);
        resetFailureCounter();
        console.log('✅ API key updated and OpenAI initialized');
      }
    } else {
      setHasApiKey(false);
      setShowApiKeyPrompt(true);
    }
  };

  // Check if we should show API key prompt
  const shouldShowApiKeyPrompt = !hasApiKey && (showApiKeyPrompt || !getApiKey());

  // Render API key prompt
  if (shouldShowApiKeyPrompt) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <div className="text-blue-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3c0-.267.11-.52.293-.707L11.586 8.586A2 2 0 0113 8a2 2 0 012 2z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">OpenAI API Key Required</h2>
            <p className="text-gray-600 mb-4">
              This app needs an OpenAI API key to evaluate your answers. 
              Your key is stored securely in your browser only.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Enter API Key
              </button>
              <p className="text-xs text-gray-500 text-center">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenAI Platform</a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Settings Modal - always render so it can open */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onApiKeyUpdate={handleApiKeyUpdate}
        />
      </>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading AI Tutor...</h2>
          <p className="text-gray-500 mt-2">Preparing your learning experience</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Setup Required</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Assessment Trainer</h1>
          <p className="text-gray-600">Practice and improve with voice-powered learning</p>
          
          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button
              onClick={() => setMode(mode === 'training' ? 'assessment' : 'training')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'training' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {mode === 'training' ? '📚 Training Mode' : '📊 Assessment Mode'}
            </button>
            
            <button
              onClick={toggleRealtimeAPI}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                useRealtimeAPI && realtimeConnected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {useRealtimeAPI ? '🔗 Realtime API' : '🔌 Standard API'}
            </button>
            
            <button
              onClick={shuffleQuestions}
              className="px-4 py-2 rounded-lg font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
            >
              🔀 Shuffle Questions
            </button>
            
            <button
              onClick={resetToStart}
              className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            >
              🏠 Reset to Start
            </button>
            
            <button
              onClick={reloadContent}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              🔄 Reload Content
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>
        </header>

        <div className="space-y-6">
          {/* Question Display */}
          <div>
            <QuestionDisplay
              question={currentQuestion}
              onReadQuestion={readQuestion}
              questionIndex={currentIndex + 1}
              totalQuestions={questions.length}
              mode={mode}
            />

            {/* Speech Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Voice Interaction</h3>
              
              {/* Step indicator for questions with examples */}
              {currentQuestion?.examples && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-800">
                      {currentStep === 'definition' ? 'Step 1: Definition' : 'Step 2: Examples'}
                    </h4>
                    <div className="flex space-x-1">
                      <div className={`w-3 h-3 rounded-full ${currentStep === 'definition' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      <div className={`w-3 h-3 rounded-full ${currentStep === 'examples' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>
                  <p className="text-sm text-blue-600">
                    {currentStep === 'definition' 
                      ? 'First, provide the definition of the concept'
                      : 'Now, provide some examples of this technology in action'
                    }
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium text-lg transition-all ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                      : currentStep === 'examples'
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening 
                    ? '🎤 Stop Recording' 
                    : currentStep === 'examples'
                      ? '🎤 Record Examples'
                      : '🎤 Record Definition'
                  }
                </button>
                
                <button
                  onClick={readQuestion}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  🔊 Read Question
                </button>
              </div>

              {/* Transcript Display */}
              {(userAnswer || transcriptBuffer) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Your Answer:</h4>
                  <p className="text-gray-800">
                    {userAnswer || transcriptBuffer}
                    {transcriptBuffer && <span className="text-gray-400"> (speaking...)</span>}
                  </p>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-600">Evaluating your answer...</span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <div className="flex justify-between">
                <button
                  onClick={previousQuestion}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Previous
                </button>
                
                <span className="text-gray-600 font-medium">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Definition Evaluation */}
          {evaluation && (
            <AnswerEvaluator
              evaluation={evaluation}
              expectedAnswer={currentQuestion?.answer}
              mode={mode}
              title="Definition Evaluation"
            />
          )}

          {/* Examples Evaluation */}
          {examplesEvaluation && (
            <AnswerEvaluator
              evaluation={examplesEvaluation}
              expectedAnswer={currentQuestion?.examples?.join(', ')}
              mode={mode}
              title="Examples Evaluation"
            />
          )}

          {/* Feedback System */}
          <FeedbackSystem
            evaluation={currentStep === 'examples' ? examplesEvaluation : evaluation}
            mode={mode}
          />

          {/* Progress Tracker */}
          <ProgressTracker
            stats={sessionStats}
            mode={mode}
            totalQuestions={questions.length}
          />

          {/* API Usage Tracker */}
          <APIUsageTracker />

          {/* OpenAI Logging Panel */}
          <LoggingPanel />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onApiKeyUpdate={handleApiKeyUpdate}
      />
    </div>
  );
};

export default App;