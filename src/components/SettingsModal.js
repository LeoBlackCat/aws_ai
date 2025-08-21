import React, { useState, useEffect } from 'react';
import { loadSettings, saveSettings, isValidApiKey, clearSettings } from '../utils/settingsManager';

const SettingsModal = ({ isOpen, onClose, onApiKeyUpdate }) => {
  const [settings, setSettings] = useState({});
  const [apiKey, setApiKey] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentSettings = loadSettings();
      setSettings(currentSettings);
      setApiKey(currentSettings.apiKey || '');
      setIsKeyValid(true);
      setSaveStatus('');
    }
  }, [isOpen]);

  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    setIsKeyValid(key.length === 0 || isValidApiKey(key));
    setSaveStatus('');
  };

  const handleSave = () => {
    if (apiKey && !isValidApiKey(apiKey)) {
      setIsKeyValid(false);
      setSaveStatus('❌ Invalid API key format');
      return;
    }

    const updatedSettings = {
      ...settings,
      apiKey: apiKey.trim(),
      autoAdvance: settings.autoAdvance,
      speechEnabled: settings.speechEnabled,
      loggingEnabled: settings.loggingEnabled
    };

    const saved = saveSettings(updatedSettings);
    if (saved) {
      setSaveStatus('✅ Settings saved successfully!');
      if (onApiKeyUpdate) {
        onApiKeyUpdate(apiKey.trim());
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setSaveStatus('❌ Failed to save settings');
    }
  };

  const handleClearSettings = () => {
    if (window.confirm('Are you sure you want to clear all settings? This will remove your API key.')) {
      clearSettings();
      setApiKey('');
      setSettings({});
      setSaveStatus('✅ Settings cleared');
      if (onApiKeyUpdate) {
        onApiKeyUpdate('');
      }
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* API Key Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20 ${
                !isKeyValid ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-2 text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              {showKey ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
          {!isKeyValid && (
            <p className="text-red-500 text-sm mt-1">
              API key must start with 'sk-' and be 48-64 characters long
            </p>
          )}
          <div className="text-xs text-gray-500 mt-2">
            <p>💡 Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenAI Platform</a></p>
            <p>🔒 Stored locally in your browser only</p>
          </div>
        </div>

        {/* App Settings */}
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">App Settings</h3>
          
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Auto-advance after correct answers</label>
            <input
              type="checkbox"
              checked={settings.autoAdvance || false}
              onChange={(e) => handleSettingChange('autoAdvance', e.target.checked)}
              className="toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Enable speech recognition</label>
            <input
              type="checkbox"
              checked={settings.speechEnabled !== false}
              onChange={(e) => handleSettingChange('speechEnabled', e.target.checked)}
              className="toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Enable API logging (for debugging)</label>
            <input
              type="checkbox"
              checked={settings.loggingEnabled || false}
              onChange={(e) => handleSettingChange('loggingEnabled', e.target.checked)}
              className="toggle"
            />
          </div>
        </div>

        {/* Status Message */}
        {saveStatus && (
          <div className={`mb-4 p-3 rounded ${
            saveStatus.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {saveStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={!isKeyValid}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

        {/* Clear Settings Button */}
        <button
          onClick={handleClearSettings}
          className="w-full mt-3 text-sm text-red-600 hover:text-red-800 py-1"
        >
          Clear All Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;