'use client';

export interface BackgroundAudioState {
  isPlaying: boolean;
  currentTrack: {
    id: string;
    title: string;
    url: string;
    type?: string;
    duration?: number;
  } | null;
  currentTime: number;
  volume: number;
  playbackRate: number;
  queue: AudioTrack[];
}

export interface AudioTrack {
  id: string;
  title: string;
  url: string;
  type: 'lesson-summary' | 'daily-recap' | 'custom';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface BackgroundAudioOptions {
  enableNotifications?: boolean;
  enableMediaSession?: boolean;
  autoPlayNext?: boolean;
}

class BackgroundAudioService {
  private audio: HTMLAudioElement | null = null;
  private state: BackgroundAudioState = {
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    volume: 1,
    playbackRate: 1,
    queue: [],
  };
  private listeners: Set<(state: BackgroundAudioState) => void> = new Set();
  private options: BackgroundAudioOptions = {
    enableNotifications: true,
    enableMediaSession: true,
    autoPlayNext: true,
  };

  constructor(options: BackgroundAudioOptions = {}) {
    this.options = { ...this.options, ...options };
    this.initializeAudio();
    this.setupMediaSession();
    this.setupNotifications();
  }

  private initializeAudio() {
    if (typeof window === 'undefined') return;

    this.audio = new Audio();
    this.audio.preload = 'metadata';

    // Event listeners
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.state.currentTrack && this.audio) {
        this.updateState({
          currentTrack: {
            ...this.state.currentTrack,
            duration: this.audio.duration,
          },
        });
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.updateState({ currentTime: this.audio.currentTime });
      }
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('play', () => {
      this.updateState({ isPlaying: true });
      this.updateMediaSession();
    });

    this.audio.addEventListener('pause', () => {
      this.updateState({ isPlaying: false });
      this.updateMediaSession();
    });

    this.audio.addEventListener('error', (error) => {
      console.error('Background audio error:', error);
      this.updateState({ isPlaying: false });
    });

    // Handle visibility change for background playback
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.isPlaying) {
        // Continue playing in background
        this.showNotification('Playing in background', this.state.currentTrack?.title || 'Audio');
      }
    });
  }

  private setupMediaSession() {
    if (!this.options.enableMediaSession || !('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      this.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.playNext();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      this.seek(this.state.currentTime - (details.seekOffset || 15));
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      this.seek(this.state.currentTime + (details.seekOffset || 15));
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.seek(details.seekTime);
      }
    });
  }

  private setupNotifications() {
    if (!this.options.enableNotifications || !('Notification' in window)) return;

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.state.currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.state.currentTrack.title,
      artist: 'AWS AI Practitioner Trainer',
      album: this.state.currentTrack.type?.replace('-', ' ') || 'AWS AI Training',
      artwork: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    if (this.state.currentTrack.duration) {
      navigator.mediaSession.setPositionState({
        duration: this.state.currentTrack.duration,
        playbackRate: this.state.playbackRate,
        position: this.state.currentTime,
      });
    }
  }

  private showNotification(title: string, body: string) {
    if (!this.options.enableNotifications || Notification.permission !== 'granted') return;

    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      silent: true,
    });
  }

  private handleTrackEnded() {
    if (this.options.autoPlayNext && this.state.queue.length > 0) {
      this.playNext();
    } else {
      this.updateState({ isPlaying: false });
    }
  }

  private updateState(updates: Partial<BackgroundAudioState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Public API
  subscribe(listener: (state: BackgroundAudioState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): BackgroundAudioState {
    return { ...this.state };
  }

  async loadTrack(track: AudioTrack): Promise<void> {
    if (!this.audio) return;

    this.updateState({
      currentTrack: {
        id: track.id,
        title: track.title,
        url: track.url,
        type: track.type,
        duration: track.duration,
      },
    });

    this.audio.src = track.url;
    this.audio.load();
  }

  async play(): Promise<void> {
    if (!this.audio || !this.state.currentTrack) return;

    try {
      await this.audio.play();
      this.showNotification('Now Playing', this.state.currentTrack.title);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }

  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
  }

  async togglePlayPause(): Promise<void> {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  seek(time: number): void {
    if (!this.audio || !this.state.currentTrack?.duration) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.state.currentTrack.duration));
    this.audio.currentTime = clampedTime;
    this.updateState({ currentTime: clampedTime });
  }

  setVolume(volume: number): void {
    if (!this.audio) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audio.volume = clampedVolume;
    this.updateState({ volume: clampedVolume });
  }

  setPlaybackRate(rate: number): void {
    if (!this.audio) return;
    
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    this.audio.playbackRate = clampedRate;
    this.updateState({ playbackRate: clampedRate });
    this.updateMediaSession();
  }

  addToQueue(track: AudioTrack): void {
    this.updateState({
      queue: [...this.state.queue, track],
    });
  }

  removeFromQueue(trackId: string): void {
    this.updateState({
      queue: this.state.queue.filter(track => track.id !== trackId),
    });
  }

  clearQueue(): void {
    this.updateState({ queue: [] });
  }

  playNext(): void {
    if (this.state.queue.length === 0) return;

    const nextTrack = this.state.queue[0];
    this.updateState({
      queue: this.state.queue.slice(1),
    });

    this.loadTrack(nextTrack).then(() => {
      this.play();
    });
  }

  playPrevious(): void {
    // In a more complex implementation, you might maintain a history
    // For now, just restart the current track
    this.seek(0);
  }

  async playTrackImmediately(track: AudioTrack): Promise<void> {
    await this.loadTrack(track);
    await this.play();
  }

  skip(seconds: number): void {
    this.seek(this.state.currentTime + seconds);
  }

  formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  destroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let backgroundAudioService: BackgroundAudioService | null = null;

export function getBackgroundAudioService(options?: BackgroundAudioOptions): BackgroundAudioService {
  if (!backgroundAudioService) {
    backgroundAudioService = new BackgroundAudioService(options);
  }
  return backgroundAudioService;
}

export default BackgroundAudioService;