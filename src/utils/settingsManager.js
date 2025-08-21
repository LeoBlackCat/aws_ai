// Settings management for storing user preferences and API keys
const SETTINGS_KEY = 'aitutor_settings';

// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  theme: 'light',
  autoAdvance: true,
  speechEnabled: true,
  loggingEnabled: false
};

// Simple encryption for localStorage (not cryptographically secure, but better than plain text)
const encodeData = (data) => {
  try {
    return btoa(JSON.stringify(data));
  } catch (error) {
    console.error('Failed to encode settings:', error);
    return null;
  }
};

const decodeData = (encodedData) => {
  try {
    return JSON.parse(atob(encodedData));
  } catch (error) {
    console.error('Failed to decode settings:', error);
    return null;
  }
};

// Load settings from localStorage
export const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (!savedSettings) {
      return { ...DEFAULT_SETTINGS };
    }
    
    const decodedSettings = decodeData(savedSettings);
    if (!decodedSettings) {
      return { ...DEFAULT_SETTINGS };
    }
    
    // Merge with defaults to handle new settings
    return { ...DEFAULT_SETTINGS, ...decodedSettings };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

// Save settings to localStorage
export const saveSettings = (settings) => {
  try {
    const encodedData = encodeData(settings);
    if (encodedData) {
      localStorage.setItem(SETTINGS_KEY, encodedData);
      console.log('Settings saved successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
};

// Update specific setting
export const updateSetting = (key, value) => {
  const currentSettings = loadSettings();
  const updatedSettings = { ...currentSettings, [key]: value };
  return saveSettings(updatedSettings);
};

// Get specific setting
export const getSetting = (key, defaultValue = null) => {
  const settings = loadSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
};

// Clear all settings
export const clearSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    console.log('Settings cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear settings:', error);
    return false;
  }
};

// Check if API key is available (from env or settings)
export const getApiKey = () => {
  // First try environment variables (for local development)
  const envKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (envKey && envKey !== 'undefined' && envKey.trim()) {
    return envKey.trim();
  }
  
  // Then try user settings (for GitHub Pages)
  const userKey = getSetting('apiKey', '');
  if (userKey && userKey.trim()) {
    return userKey.trim();
  }
  
  return null;
};

// Validate API key format
export const isValidApiKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  
  // OpenAI API keys start with 'sk-' and can be:
  // - Legacy keys: 48-64 characters (sk-...)
  // - Project keys: up to 200 characters (sk-proj-...)
  const trimmedKey = key.trim();
  return trimmedKey.startsWith('sk-') && trimmedKey.length >= 48 && trimmedKey.length <= 200;
};

// Export current settings for debugging
export const exportSettings = () => {
  const settings = loadSettings();
  // Don't export the API key for security
  const { apiKey, ...safeSettings } = settings;
  return {
    ...safeSettings,
    hasApiKey: !!apiKey && apiKey.length > 0
  };
};