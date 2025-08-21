import React from 'react';

const ProgressTracker = ({ stats, mode, totalQuestions }) => {
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return hours + 'h ' + (minutes % 60) + 'm';
    }
    if (minutes > 0) {
      return minutes + 'm ' + (seconds % 60) + 's';
    }
    return seconds + 's';
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const accuracy = stats.questionsAnswered > 0 ? 
    Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0;

  const completionPercentage = Math.round((stats.questionsAnswered / totalQuestions) * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Progress Tracker</h3>
      
      {/* Mode Indicator */}
      <div className="mb-4 text-center">
        <span className={'inline-block px-3 py-1 rounded-full text-sm font-medium ' + 
          (mode === 'training' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')}>
          {mode === 'training' ? '📚 Training Session' : '📊 Assessment Session'}
        </span>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.questionsAnswered}</div>
          <div className="text-sm text-gray-600">Questions</div>
        </div>
        
        <div className="text-center">
          <div className={'text-2xl font-bold ' + getAccuracyColor(accuracy)}>
            {accuracy}%
          </div>
          <div className="text-sm text-gray-600">Accuracy</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.correctAnswers}</div>
          <div className="text-sm text-gray-600">Correct</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">
            {formatTime(stats.timeSpent)}
          </div>
          <div className="text-sm text-gray-600">Time</div>
        </div>
      </div>

      {/* Average Score */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Average Score</span>
          <span className="text-sm font-bold text-gray-800">
            {Math.round(stats.averageScore)}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={'h-2 rounded-full transition-all duration-300 ' + getProgressColor(stats.averageScore)}
            style={{ width: Math.min(stats.averageScore, 100) + '%' }}
          ></div>
        </div>
      </div>

      {/* Session Progress */}
      {mode === 'assessment' && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Session Progress</span>
            <span className="text-sm font-bold text-gray-800">
              {stats.questionsAnswered}/{totalQuestions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: completionPercentage + '%' }}
            ></div>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-3">📈 Insights</h4>
        
        {stats.questionsAnswered === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">
            Start answering questions to see your progress insights!
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {accuracy >= 80 && (
              <div className="flex items-center text-green-600">
                <span className="mr-2">🎯</span>
                <span>Excellent performance! You're mastering this topic.</span>
              </div>
            )}
            
            {accuracy >= 60 && accuracy < 80 && (
              <div className="flex items-center text-yellow-600">
                <span className="mr-2">📈</span>
                <span>Good progress! Keep practicing to improve further.</span>
              </div>
            )}
            
            {accuracy < 60 && stats.questionsAnswered >= 3 && (
              <div className="flex items-center text-blue-600">
                <span className="mr-2">💪</span>
                <span>Learning in progress. Focus on understanding key concepts.</span>
              </div>
            )}
            
            {stats.questionsAnswered >= 5 && stats.averageScore > 70 && (
              <div className="flex items-center text-purple-600">
                <span className="mr-2">🚀</span>
                <span>Ready for more challenging questions!</span>
              </div>
            )}
            
            {mode === 'training' && stats.questionsAnswered >= 3 && (
              <div className="flex items-center text-gray-600">
                <span className="mr-2">🔄</span>
                <span>Training mode: Focus on learning from feedback.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Goals */}
      {mode === 'assessment' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">🎯 Session Goals</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div className={'flex items-center ' + (accuracy >= 70 ? 'line-through opacity-60' : '')}>
              <span className="mr-2">{accuracy >= 70 ? '✅' : '🔲'}</span>
              <span>Achieve 70%+ accuracy</span>
            </div>
            <div className={'flex items-center ' + (completionPercentage >= 80 ? 'line-through opacity-60' : '')}>
              <span className="mr-2">{completionPercentage >= 80 ? '✅' : '🔲'}</span>
              <span>Complete 80% of questions</span>
            </div>
            <div className={'flex items-center ' + (stats.averageScore >= 75 ? 'line-through opacity-60' : '')}>
              <span className="mr-2">{stats.averageScore >= 75 ? '✅' : '🔲'}</span>
              <span>Average score above 75</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
