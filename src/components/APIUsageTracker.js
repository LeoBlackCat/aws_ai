import React, { useState, useEffect } from 'react';

const APIUsageTracker = () => {
  const [usage, setUsage] = useState({
    totalRequests: 0,
    totalTokens: 0,
    lastRequest: null,
    sessionStart: new Date().toISOString()
  });

  useEffect(() => {
    // Listen for API usage events from OpenAI helper
    const handleAPIUsage = (event) => {
      if (event.detail && event.detail.usage) {
        setUsage(prev => ({
          totalRequests: prev.totalRequests + 1,
          totalTokens: prev.totalTokens + event.detail.usage.totalTokens,
          lastRequest: new Date().toISOString(),
          sessionStart: prev.sessionStart
        }));
      }
    };

    window.addEventListener('openai-api-usage', handleAPIUsage);
    return () => window.removeEventListener('openai-api-usage', handleAPIUsage);
  }, []);

  const resetUsage = () => {
    setUsage({
      totalRequests: 0,
      totalTokens: 0,
      lastRequest: null,
      sessionStart: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">API Usage</h3>
        <button 
          onClick={resetUsage}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Requests:</span>
          <span className="font-medium">{usage.totalRequests}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Tokens:</span>
          <span className="font-medium">{usage.totalTokens.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Model:</span>
          <span className="font-medium text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            GPT-5 nano
          </span>
        </div>
        
        {usage.lastRequest && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Last request: {new Date(usage.lastRequest).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIUsageTracker;