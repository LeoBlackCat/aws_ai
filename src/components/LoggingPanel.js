import React, { useState, useEffect } from 'react';

const LoggingPanel = () => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const handleAPILog = (event) => {
      if (event.detail) {
        const newLog = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: event.detail.type || 'info',
          data: event.detail.data || event.detail,
          message: event.detail.message || ''
        };
        
        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
      }
    };

    // Listen for custom logging events
    window.addEventListener('openai-api-log', handleAPILog);
    
    return () => {
      window.removeEventListener('openai-api-log', handleAPILog);
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogsToClipboard = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}\n${JSON.stringify(log.data, null, 2)}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      alert('Logs copied to clipboard!');
    });
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}\n${JSON.stringify(log.data, null, 2)}`
    ).join('\n\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openai-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'request': return 'text-blue-600 bg-blue-50';
      case 'response': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'fallback': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'request': return '🔵';
      case 'response': return '🟢';
      case 'error': return '❌';
      case 'fallback': return '🔄';
      default: return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-gray-800 hover:text-gray-600"
          >
            <span className="text-lg">
              {isExpanded ? '📋' : '📋'}
            </span>
            <h3 className="text-lg font-semibold">
              OpenAI Logs ({logs.length})
            </h3>
            <span className="text-sm text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
          </button>
        </div>
        
        {isExpanded && (
          <div className="flex space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 rounded text-xs ${
                autoScroll ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Auto-scroll
            </button>
            <button
              onClick={copyLogsToClipboard}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
            >
              📋 Copy
            </button>
            <button
              onClick={downloadLogs}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
            >
              💾 Download
            </button>
            <button
              onClick={clearLogs}
              className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
            >
              🗑 Clear
            </button>
          </div>
        )}
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div className="p-4">
          <div 
            className="max-h-96 overflow-y-auto space-y-2" 
            style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Make an API call to see logs here.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border-l-4 ${getLogColor(log.type)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getLogIcon(log.type)}</span>
                      <span className="font-medium text-sm">
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {log.message && (
                    <div className="text-sm font-medium mb-2">
                      {log.message}
                    </div>
                  )}
                  
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-800 text-gray-100 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoggingPanel;