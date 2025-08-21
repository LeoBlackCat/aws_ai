import React, { useState, useEffect } from 'react';

const FeedbackSystem = ({ evaluation, mode }) => {
  const [showEncouragement, setShowEncouragement] = useState(false);

  useEffect(() => {
    if (evaluation) {
      setShowEncouragement(true);
      const timer = setTimeout(() => setShowEncouragement(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [evaluation]);

  const getEncouragementMessage = (score, isCorrect) => {
    if (isCorrect) {
      const messages = [
        "Excellent work! 🎉",
        "Perfect answer! 🌟",
        "Outstanding! 🚀",
        "Brilliant! 💯",
        "You nailed it! 🎯"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    if (score >= 70) {
      return "Very close! Keep going! 💪";
    }
    
    if (score >= 50) {
      return "Good effort! You're on the right track! 📈";
    }
    
    return "Don't give up! Every attempt helps you learn! 🌱";
  };

  const getTips = (evaluation) => {
    const tips = [];
    
    if (evaluation?.score < 50) {
      tips.push("Try breaking down the question into smaller parts");
      tips.push("Focus on the key concepts mentioned in the question");
    }
    
    if (evaluation?.missingConcepts?.length > 0) {
      tips.push("Make sure to mention all important concepts");
      tips.push("Use specific terminology when possible");
    }
    
    if (evaluation?.score >= 70 && evaluation?.score < 90) {
      tips.push("Great job! Try to be more specific in your explanations");
      tips.push("Consider adding examples to strengthen your answer");
    }
    
    return tips;
  };

  if (!evaluation) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Ready to Learn</h3>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-600">
            Record your answer to get instant feedback and improve your understanding!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Feedback & Encouragement</h3>
      
      {/* Encouragement Message */}
      {showEncouragement && (
        <div className={'p-4 rounded-lg mb-4 transition-all duration-300 ' + 
          (evaluation.isCorrect ? 'bg-green-100 border border-green-200' : 'bg-blue-100 border border-blue-200')}>
          <div className="text-center">
            <div className="text-2xl mb-2">
              {evaluation.isCorrect ? '🎉' : '💪'}
            </div>
            <p className={'font-medium ' + (evaluation.isCorrect ? 'text-green-800' : 'text-blue-800')}>
              {getEncouragementMessage(evaluation.score, evaluation.isCorrect)}
            </p>
          </div>
        </div>
      )}

      {/* Learning Tips */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-3">💡 Learning Tips:</h4>
        <div className="space-y-2">
          {getTips(evaluation).map((tip, index) => (
            <div key={index} className="flex items-start text-sm text-gray-600">
              <span className="mr-2 text-blue-500">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Motivation */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-800 mb-2">Keep Growing! 🌱</h4>
        <p className="text-sm text-purple-700">
          {evaluation.score >= 80 ? 
            "You're mastering this topic! Ready for more challenging questions?" :
            "Every attempt makes you stronger. The key is consistent practice!"
          }
        </p>
        
        {mode === 'training' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
              📚 Training Mode
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
              🔄 Immediate Feedback
            </span>
          </div>
        )}
      </div>

      {/* Study Suggestions */}
      {evaluation.score < 70 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">📖 Study Suggestions:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Review the expected answer carefully</li>
            <li>• Practice explaining concepts in your own words</li>
            <li>• Try to identify the key points you missed</li>
            {mode === 'training' && <li>• Use the "Show Expected Answer" feature</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FeedbackSystem;
