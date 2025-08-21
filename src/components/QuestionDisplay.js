import React from 'react';

const QuestionDisplay = ({ 
  question, 
  onReadQuestion, 
  questionIndex, 
  totalQuestions, 
  mode 
}) => {
  if (!question) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-500">Loading question...</div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm opacity-90">
            {mode === 'training' ? '📚 Training' : '📊 Assessment'}
          </span>
          <span className="text-sm opacity-90">
            {questionIndex} / {totalQuestions}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={'px-2 py-1 rounded-full text-xs font-medium ' + getDifficultyColor(question.difficulty)}>
            {question.difficulty}
          </span>
          
          {question.topic && (
            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium">
              {question.topic}
            </span>
          )}
          
          <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium">
            {question.source}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 leading-relaxed">
            {question.question}
          </h2>
          
          <button
            onClick={onReadQuestion}
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <span className="mr-2">🔊</span>
            Listen to Question
          </button>
        </div>

        {question.keywords && question.keywords.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Key concepts to include:</h3>
            <div className="flex flex-wrap gap-2">
              {question.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {mode === 'training' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                <span className="select-none">💡 Show Expected Answer</span>
              </summary>
              <div className="mt-2 pt-2 border-t text-sm text-gray-700 leading-relaxed">
                {question.answer}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay;
