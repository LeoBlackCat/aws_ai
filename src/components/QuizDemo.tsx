/**
 * QuizDemo - Interactive demonstration of the quiz generation and assessment system
 * Shows AWS AI Practitioner quiz capabilities with real-time feedback
 */

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import QuizGenerator, { QuizQuestion, QuizGenerationOptions, UserAnswer, QuizAttempt } from '../services/QuizGenerator';
import QuizAssessment, { CertificationReadiness } from '../services/QuizAssessment';
import KnowledgeMiner from '../services/KnowledgeMiner';

interface QuizDemoProps {
  sampleContent?: string;
}

const QuizDemo: React.FC<QuizDemoProps> = ({ 
  sampleContent = `
Amazon Rekognition is a computer vision service that makes it easy to add image and video analysis to your applications. 
Amazon Comprehend is a natural language processing (NLP) service that uses machine learning to find insights and relationships in text.
Amazon SageMaker is a fully managed service that provides every developer and data scientist with the ability to build, train, and deploy machine learning models quickly.
Machine Learning is a type of artificial intelligence (AI) that enables computers to learn without being explicitly programmed.
Deep Learning is a subset of machine learning that uses neural networks with multiple layers to model and understand complex patterns.
  `
}) => {
  const [quizGenerator] = useState(() => new QuizGenerator(new KnowledgeMiner()));
  const [quizAssessment] = useState(() => new QuizAssessment());
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [gradedAttempt, setGradedAttempt] = useState<QuizAttempt | null>(null);
  const [certificationReadiness, setCertificationReadiness] = useState<CertificationReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [quizOptions, setQuizOptions] = useState<QuizGenerationOptions>({
    difficulty: 'mixed',
    questionTypes: ['multiple-choice', 'cloze-deletion', 'scenario-based'],
    count: 5
  });

  const generateNewQuiz = async () => {
    setIsLoading(true);
    try {
      const questions = await quizGenerator.generateQuiz(sampleContent, quizOptions);
      setCurrentQuiz(questions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setIsQuizComplete(false);
      setGradedAttempt(null);
      setQuizStartTime(new Date());
      setQuestionStartTime(new Date());
      setSelectedAnswer(null);
      setConfidence(3);
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || !questionStartTime) return;

    const currentQuestion = currentQuiz[currentQuestionIndex];
    const timeSpent = Date.now() - questionStartTime.getTime();

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      timeSpent: Math.floor(timeSpent / 1000),
      confidence,
      isCorrect: false // Will be determined during grading
    };

    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(new Date());
      setSelectedAnswer(null);
      setConfidence(3);
    } else {
      completeQuiz(newAnswers);
    }
  };

  const completeQuiz = (answers: UserAnswer[]) => {
    if (!quizStartTime) return;

    const totalTimeSpent = Math.floor((Date.now() - quizStartTime.getTime()) / 1000);
    
    const attempt: Omit<QuizAttempt, 'score' | 'feedback'> = {
      id: `demo_${Date.now()}`,
      userId: 'demo_user',
      quizId: `quiz_${Date.now()}`,
      questions: currentQuiz,
      answers,
      timeSpent: totalTimeSpent,
      completedAt: new Date()
    };

    const graded = quizAssessment.gradeQuizAttempt(attempt);
    setGradedAttempt(graded);
    setIsQuizComplete(true);

    // Update certification readiness
    const readiness = quizAssessment.assessCertificationReadiness('demo_user');
    setCertificationReadiness(readiness);
  };

  const resetQuiz = () => {
    setCurrentQuiz([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setIsQuizComplete(false);
    setGradedAttempt(null);
    setCertificationReadiness(null);
    setQuizStartTime(null);
    setQuestionStartTime(null);
    setSelectedAnswer(null);
    setConfidence(3);
  };

  const currentQuestion = currentQuiz[currentQuestionIndex];
  const progress = currentQuiz.length > 0 ? ((currentQuestionIndex + (selectedAnswer !== null ? 1 : 0)) / currentQuiz.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AWS AI Practitioner Quiz Demo</h1>
        <p className="text-gray-600">Experience the intelligent quiz generation and assessment system</p>
      </div>

      {/* Quiz Configuration */}
      {!isQuizComplete && currentQuiz.length === 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quiz Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select 
                value={quizOptions.difficulty}
                onChange={(e) => setQuizOptions({...quizOptions, difficulty: e.target.value as any})}
                className="w-full p-2 border rounded"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Question Count</label>
              <select 
                value={quizOptions.count}
                onChange={(e) => setQuizOptions({...quizOptions, count: parseInt(e.target.value)})}
                className="w-full p-2 border rounded"
              >
                <option value="3">3 Questions</option>
                <option value="5">5 Questions</option>
                <option value="10">10 Questions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Question Types</label>
              <div className="space-y-1">
                {['multiple-choice', 'cloze-deletion', 'scenario-based'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={quizOptions.questionTypes?.includes(type as any)}
                      onChange={(e) => {
                        const types = quizOptions.questionTypes || [];
                        if (e.target.checked) {
                          setQuizOptions({...quizOptions, questionTypes: [...types, type as any]});
                        } else {
                          setQuizOptions({...quizOptions, questionTypes: types.filter(t => t !== type)});
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button 
            onClick={generateNewQuiz} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
          </Button>
        </Card>
      )}

      {/* Quiz Progress */}
      {currentQuiz.length > 0 && !isQuizComplete && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {currentQuiz.length}
            </span>
            <Badge variant="outline">
              {currentQuestion?.difficulty} • {currentQuestion?.type}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </Card>
      )}

      {/* Current Question */}
      {currentQuestion && !isQuizComplete && (
        <Card className="p-6">
          <div className="mb-4">
            <Badge className="mb-2">{currentQuestion.category}</Badge>
            <h3 className="text-lg font-semibold mb-2">{currentQuestion.question}</h3>
            <p className="text-sm text-gray-600">
              Estimated time: {currentQuestion.estimatedTime} seconds
            </p>
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion.type === 'multiple-choice' && currentQuestion.choices && (
            <div className="space-y-3 mb-4">
              {currentQuestion.choices.map((choice, index) => (
                <label key={choice.id} className="flex items-start space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => setSelectedAnswer(index)}
                    className="mt-1"
                  />
                  <span>{choice.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* Cloze Deletion Input */}
          {currentQuestion.type === 'cloze-deletion' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter your answer..."
                value={selectedAnswer as string || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                className="w-full p-3 border rounded"
              />
            </div>
          )}

          {/* Scenario-based Options */}
          {currentQuestion.type === 'scenario-based' && currentQuestion.choices && (
            <div className="space-y-3 mb-4">
              {currentQuestion.choices.map((choice, index) => (
                <label key={choice.id} className="flex items-start space-x-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => setSelectedAnswer(index)}
                    className="mt-1"
                  />
                  <span className="font-medium">{choice.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* Confidence Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Confidence Level: {confidence}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Not confident</span>
              <span>Very confident</span>
            </div>
          </div>

          <Button 
            onClick={submitAnswer}
            disabled={selectedAnswer === null}
            className="w-full"
          >
            {currentQuestionIndex < currentQuiz.length - 1 ? 'Next Question' : 'Complete Quiz'}
          </Button>
        </Card>
      )}

      {/* Quiz Results */}
      {isQuizComplete && gradedAttempt && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{gradedAttempt.score.toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{gradedAttempt.timeSpent}s</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Object.keys(gradedAttempt.feedback.categoryScores).length}
                </div>
                <div className="text-sm text-gray-600">Categories Tested</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Performance by Category</h3>
              <div className="space-y-2">
                {Object.entries(gradedAttempt.feedback.categoryScores).map(([category, score]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="capitalize">{category.replace('-', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={score} className="w-24" />
                      <span className="text-sm font-medium w-12">{score.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-600">Strengths</h3>
                <ul className="space-y-1">
                  {gradedAttempt.feedback.strengths.map((strength, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-red-600">Areas for Improvement</h3>
                <ul className="space-y-1">
                  {gradedAttempt.feedback.weaknesses.map((weakness, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-red-500 mr-2">!</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
            <div className="space-y-2">
              {gradedAttempt.feedback.recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Next Steps */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Next Steps</h3>
            <div className="space-y-2">
              {gradedAttempt.feedback.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Certification Readiness */}
          {certificationReadiness && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-3">Certification Readiness</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold mb-2">
                    {certificationReadiness.overallReadiness.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Overall Readiness</div>
                  <Badge 
                    variant={
                      certificationReadiness.readinessLevel === 'ready' ? 'default' :
                      certificationReadiness.readinessLevel === 'almost-ready' ? 'secondary' :
                      'outline'
                    }
                  >
                    {certificationReadiness.readinessLevel.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-2">
                    {certificationReadiness.estimatedPassProbability.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Pass Probability</div>
                  <div className="text-sm">
                    Recommended study time: {certificationReadiness.recommendedStudyTime} hours
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button onClick={generateNewQuiz} className="flex-1">
              Take Another Quiz
            </Button>
            <Button onClick={resetQuiz} variant="outline" className="flex-1">
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDemo;