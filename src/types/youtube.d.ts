// Type definitions for YouTube IFrame API
interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: (() => void) | null;
}

declare namespace YT {
  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent {
    target: Player;
    data: number;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    videoId?: string;
    width?: number | string;
    height?: number | string;
    playerVars?: {
      autoplay?: 0 | 1;
      cc_load_policy?: 1;
      color?: "red" | "white";
      controls?: 0 | 1 | 2;
      disablekb?: 0 | 1;
      enablejsapi?: 0 | 1;
      end?: number;
      fs?: 0 | 1;
      hl?: string;
      iv_load_policy?: 1 | 3;
      list?: string;
      listType?: "playlist" | "search" | "user_uploads";
      loop?: 0 | 1;
      modestbranding?: 1;
      origin?: string;
      playlist?: string;
      playsinline?: 0 | 1;
      rel?: 0 | 1;
      start?: number;
      widget_referrer?: string;
    };
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onPlaybackQualityChange?: (event: PlayerEvent) => void;
      onPlaybackRateChange?: (event: PlayerEvent) => void;
      onError?: (event: PlayerEvent) => void;
      onApiChange?: (event: PlayerEvent) => void;
    };
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getVideoLoadedFraction(): number;
    cueVideoById(
      videoId: string,
      startSeconds?: number,
      suggestedQuality?: string
    ): void;
    loadVideoById(
      videoId: string,
      startSeconds?: number,
      suggestedQuality?: string
    ): void;
    cueVideoByUrl(
      mediaContentUrl: string,
      startSeconds?: number,
      suggestedQuality?: string
    ): void;
    loadVideoByUrl(
      mediaContentUrl: string,
      startSeconds?: number,
      suggestedQuality?: string
    ): void;
    getPlayerState(): number;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoUrl(): string;
    getVideoEmbedCode(): string;
    getOptions(): string[];
    getOption(option: string): any;
    setOption(option: string, value: any): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    setSize(width: number, height: number): object;
    getIframe(): HTMLIFrameElement;
    destroy(): void;
  }
}
