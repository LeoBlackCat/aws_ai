/**
 * AITutor - Interactive AI tutoring interface component
 * Provides chat interface with Socratic questioning, answer evaluation, and citations
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  followUpQuestions?: string[];
  confidence?: number;
  mode?: string;
  suggestedActions?: SuggestedAction[];
}

interface Citation {
  id: string;
  source: string;
  module: string;
  lesson: string;
  section?: string;
  relevanceScore: number;
  excerpt: string;
  url?: string;
}

interface SuggestedAction {
  type: 'review_lesson' | 'take_quiz' | 'practice_cards' | 'explore_topic';
  title: string;
  description: string;
  url?: string;
  priority: 'low' | 'medium' | 'high';
}

interface AITutorProps {
  userId: string;
  courseId?: string;
  currentLesson?: string;
  initialMode?: 'answer' | 'socratic' | 'drill' | 'explain';
  onLessonNavigate?: (lessonUrl: string) => void;
  onQuizRequest?: () => void;
  onCardsRequest?: () => void;
}

const AITutor: React.FC<AITutorProps> = ({
  userId,
  courseId = 'aws-ai-practitioner',
  currentLesson,
  initialMode = 'answer',
  onLessonNavigate,
  onQuizRequest,
  onCardsRequest
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(mode),
      timestamp: new Date(),
      followUpQuestions: [
        'What AWS AI service would you like to learn about?',
        'Can you explain the difference between supervised and unsupervised learning?',
        'How does Amazon SageMaker help with machine learning workflows?'
      ]
    };
    setMessages([welcomeMessage]);
  };

  const getWelcomeMessage = (currentMode: string): string => {
    switch (currentMode) {
      case 'socratic':
        return "Hi! I'm your AI tutor in Socratic mode. I'll guide your learning through thoughtful questions rather than direct answers. What would you like to explore?";
      case 'drill':
        return "Ready for some practice? I'm in drill mode and will give you quick questions to test your AWS AI knowledge. What topic should we focus on?";
      case 'explain':
        return "I'm here to provide detailed explanations of AWS AI concepts. What would you like me to explain in depth?";
      default:
        return "Hello! I'm your AWS AI Practitioner tutor. I can answer questions, provide explanations, and help you prepare for certification. What would you like to know?";
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          message: inputValue,
          userId,
          courseId,
          currentLesson,
          mode,
          sessionId
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date(),
          citations: result.data.citations,
          followUpQuestions: result.data.followUpQuestions,
          confidence: result.data.confidence,
          mode: result.data.mode,
          suggestedActions: result.data.suggestedActions
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (result.data.sessionId && !sessionId) {
          setSessionId(result.data.sessionId);
        }
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const handleSuggestedAction = (action: SuggestedAction) => {
    switch (action.type) {
      case 'review_lesson':
        if (action.url && onLessonNavigate) {
          onLessonNavigate(action.url);
        }
        break;
      case 'take_quiz':
        if (onQuizRequest) {
          onQuizRequest();
        }
        break;
      case 'practice_cards':
        if (onCardsRequest) {
          onCardsRequest();
        }
        break;
      case 'explore_topic':
        if (action.url && onLessonNavigate) {
          onLessonNavigate(action.url);
        }
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getModeColor = (currentMode: string) => {
    switch (currentMode) {
      case 'socratic': return 'bg-purple-100 text-purple-800';
      case 'drill': return 'bg-orange-100 text-orange-800';
      case 'explain': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8 bg-blue-500">
            <span className="text-white text-sm font-medium">AI</span>
          </Avatar>
          <div>
            <h2 className="font-semibold">AWS AI Tutor</h2>
            <Badge className={getModeColor(mode)}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="answer">Answer Mode</option>
            <option value="socratic">Socratic Mode</option>
            <option value="drill">Drill Mode</option>
            <option value="explain">Explain Mode</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCitations(!showCitations)}
          >
            {showCitations ? 'Hide' : 'Show'} Citations
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Confidence indicator */}
              {message.confidence !== undefined && (
                <div className="mt-2 text-xs opacity-70">
                  Confidence: {Math.round(message.confidence * 100)}%
                </div>
              )}

              {/* Citations */}
              {message.citations && message.citations.length > 0 && showCitations && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium mb-2">Sources:</div>
                  <div className="space-y-2">
                    {message.citations.map((citation, index) => (
                      <div key={citation.id} className="text-xs bg-white p-2 rounded border">
                        <div className="font-medium">
                          [{index + 1}] {citation.module} → {citation.lesson}
                          {citation.section && ` → ${citation.section}`}
                        </div>
                        <div className="text-gray-600 mt-1">{citation.excerpt}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-gray-500">
                            Relevance: {Math.round(citation.relevanceScore * 100)}%
                          </span>
                          {citation.url && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => onLessonNavigate?.(citation.url!)}
                              className="h-auto p-0 text-xs"
                            >
                              View Source
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up questions */}
              {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium mb-2">Follow-up questions:</div>
                  <div className="space-y-1">
                    {message.followUpQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleFollowUpQuestion(question)}
                        className="text-xs h-auto py-1 px-2 mr-2 mb-1"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested actions */}
              {message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium mb-2">Suggested actions:</div>
                  <div className="space-y-2">
                    {message.suggestedActions.map((action, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">{action.title}</span>
                              <Badge className={getPriorityColor(action.priority)}>
                                {action.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSuggestedAction(action)}
                            className="ml-2"
                          >
                            Go
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 max-w-3xl">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask me anything about AWS AI (${mode} mode)...`}
            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
          >
            Send
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default AITutor;