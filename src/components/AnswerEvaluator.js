import React from 'react';

const AnswerEvaluator = ({ evaluation, expectedAnswer, mode }) => {
  if (!evaluation) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return '✅';
    if (score >= 60) return '⚠️';
    return '❌';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Answer Evaluation</h3>
      
      {/* Score Display */}
      <div className={'p-4 rounded-lg border mb-4 ' + getScoreColor(evaluation.score)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold">
            {getScoreIcon(evaluation.score)} Score: {evaluation.score}/100
          </span>
          <span className="text-sm font-medium">
            {evaluation.isCorrect ? 'Correct' : 'Needs Improvement'}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={'h-2 rounded-full transition-all duration-300 ' + 
              (evaluation.score >= 80 ? 'bg-green-500' : 
               evaluation.score >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
            style={{ width: evaluation.score + '%' }}
          ></div>
        </div>
      </div>

      {/* Feedback */}
      {evaluation.feedback && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Feedback:</h4>
          <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded">
            {evaluation.feedback}
          </p>
        </div>
      )}

      {/* Similarities */}
      {evaluation.similarities && evaluation.similarities.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-green-700 mb-2">✓ What you got right:</h4>
          <ul className="text-sm text-green-600 space-y-1">
            {evaluation.similarities.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Concepts */}
      {evaluation.missingConcepts && evaluation.missingConcepts.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-orange-700 mb-2">⚠️ Missing concepts:</h4>
          <ul className="text-sm text-orange-600 space-y-1">
            {evaluation.missingConcepts.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {evaluation.suggestions && evaluation.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-blue-700 mb-2">💡 Suggestions for improvement:</h4>
          <ul className="text-sm text-blue-600 space-y-1">
            {evaluation.suggestions.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Answer (Assessment Mode) */}
      {mode === 'assessment' && expectedAnswer && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-2">Expected Answer:</h4>
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded leading-relaxed">
            {expectedAnswer}
          </div>
        </div>
      )}

      {/* Confidence Indicator */}
      {evaluation.confidence && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center text-xs text-gray-500">
            <span>Evaluation confidence: </span>
            <div className="ml-2 flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full"
                style={{ width: (evaluation.confidence * 100) + '%' }}
              ></div>
            </div>
            <span className="ml-2">{Math.round(evaluation.confidence * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerEvaluator;
