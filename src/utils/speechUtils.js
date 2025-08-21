// Speech recognition and text-to-speech utilities
class SpeechManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isRecording = false;
    this.isSupported = this.checkSupport();
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
  }

  // Check browser support for speech APIs
  checkSupport() {
    const recognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const synthesis = 'speechSynthesis' in window;
    
    console.log('Speech API support:', { recognition, synthesis });
    return { recognition, synthesis };
  }

  // Initialize speech recognition
  initializeRecognition() {
    if (!this.isSupported.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition settings
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = 'en-US';

    // Event handlers
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isRecording = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isRecording = false;
      if (this.onEnd) this.onEnd();
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isRecording = false;
      
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error during speech recognition.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      if (this.onError) this.onError(errorMessage);
    };

    this.recognition.onresult = (event) => {
      console.log('Speech recognition result:', event);
      
      const results = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          for (let j = 0; j < result.length; j++) {
            results.push({
              transcript: result[j].transcript.trim(),
              confidence: result[j].confidence || 0,
              isFinal: true
            });
          }
        } else {
          // Interim results
          for (let j = 0; j < result.length; j++) {
            results.push({
              transcript: result[j].transcript.trim(),
              confidence: result[j].confidence || 0,
              isFinal: false
            });
          }
        }
      }
      
      if (this.onResult && results.length > 0) {
        this.onResult(results);
      }
    };

    return this.recognition;
  }

  // Start speech recognition
  startRecognition() {
    if (!this.recognition) {
      this.initializeRecognition();
    }

    if (this.isRecording) {
      console.log('Recognition already in progress');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (this.onError) {
        this.onError('Failed to start speech recognition. Please try again.');
      }
    }
  }

  // Stop speech recognition
  stopRecognition() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  // Speak text using text-to-speech
  speak(text, options = {}) {
    if (!this.isSupported.synthesis) {
      console.warn('Text-to-speech not supported');
      return Promise.reject(new Error('Text-to-speech not supported'));
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.lang || 'en-US';
      
      // Select voice
      if (options.voice) {
        const voices = this.synthesis.getVoices();
        const selectedVoice = voices.find(voice => 
          voice.name === options.voice || voice.lang === options.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        console.log('Text-to-speech finished');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Text-to-speech error:', event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      utterance.onstart = () => {
        console.log('Text-to-speech started');
      };

      this.synthesis.speak(utterance);
    });
  }

  // Get available voices
  getVoices() {
    if (!this.isSupported.synthesis) {
      return [];
    }

    return this.synthesis.getVoices();
  }

  // Stop current speech
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synthesis && this.synthesis.speaking;
  }
}

// Create global speech manager instance
export const speechManager = new SpeechManager();

// Audio recording utilities for realtime API
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.onDataAvailable = null;
    this.onStart = null;
    this.onStop = null;
    this.onError = null;
  }

  // Request microphone access
  async requestMicrophoneAccess() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      return true;
    } catch (error) {
      console.error('Microphone access denied:', error);
      if (this.onError) {
        this.onError('Microphone access required for voice interaction');
      }
      return false;
    }
  }

  // Start recording audio
  async startRecording() {
    if (!this.stream) {
      const hasAccess = await this.requestMicrophoneAccess();
      if (!hasAccess) return false;
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data);
          }
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('Audio recording started');
        this.isRecording = true;
        if (this.onStart) this.onStart();
      };

      this.mediaRecorder.onstop = () => {
        console.log('Audio recording stopped');
        this.isRecording = false;
        if (this.onStop) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.onStop(audioBlob);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.isRecording = false;
        if (this.onError) {
          this.onError('Audio recording failed');
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      return true;
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      if (this.onError) {
        this.onError('Failed to start audio recording');
      }
      return false;
    }
  }

  // Stop recording audio
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  // Convert audio blob to base64 for API transmission
  async blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  // Clean up resources
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }
}

// Helper functions
export const checkSpeechSupport = () => {
  return speechManager.checkSupport();
};

export const speakText = (text, options) => {
  return speechManager.speak(text, options);
};

export const startListening = (onResult, onError) => {
  speechManager.onResult = onResult;
  speechManager.onError = onError;
  speechManager.startRecognition();
};

export const stopListening = () => {
  speechManager.stopRecognition();
};

export const getAvailableVoices = () => {
  return speechManager.getVoices();
};

export const stopSpeaking = () => {
  speechManager.stopSpeaking();
};

// Initialize voices when available (Chrome requires this)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    console.log('Available voices:', speechManager.getVoices().map(v => `${v.name} (${v.lang})`));
  };
}
