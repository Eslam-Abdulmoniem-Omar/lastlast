"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/hooks/useAuth";
import { Podcast } from "../lib/types";
import { updateListeningProgress } from "../lib/firebase/podcastUtils";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import YouTubeTranscript from "./YouTubeTranscript";

interface PodcastPlayerProps {
  podcast: Podcast;
  showTranscript?: boolean;
  onComplete?: () => void;
}

export default function PodcastPlayer({
  podcast,
  showTranscript = false,
  onComplete,
}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [transcriptVisible, setTranscriptVisible] = useState(showTranscript);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [showVideo, setShowVideo] = useState(!!podcast.youtubeUrl);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth();

  // Load transcript if visible
  useEffect(() => {
    if (transcriptVisible && !transcript && podcast.transcriptUrl) {
      setLoadingTranscript(true);
      fetch(podcast.transcriptUrl)
        .then((response) => response.text())
        .then((text) => {
          setTranscript(text);
          setLoadingTranscript(false);
        })
        .catch((error) => {
          console.error("Error loading transcript:", error);
          setLoadingTranscript(false);
        });
    }
  }, [transcriptVisible, transcript, podcast.transcriptUrl]);

  // Update progress when user listens to the podcast
  useEffect(() => {
    if (currentTime > 0 && currentTime / duration > 0.1 && user) {
      updateListeningProgress(user.id, podcast.id).catch((error) =>
        console.error("Error updating listening progress:", error)
      );
    }

    // Trigger onComplete when the podcast is over
    if (currentTime > 0 && duration > 0 && currentTime >= duration * 0.9) {
      onComplete?.();
    }
  }, [currentTime, duration, podcast.id, user, onComplete]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    setDuration(audio.duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = value;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentTime(value);

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    }
  };

  const toggleMediaType = () => {
    setShowVideo(!showVideo);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <h2 className="text-2xl font-bold">{podcast.title}</h2>
        <p className="text-sm opacity-80">
          {podcast.hostName} • {podcast.duration / 60} min
        </p>
      </div>

      {podcast.youtubeUrl && (
        <div className="p-4 bg-gray-100 flex justify-end">
          <button
            onClick={toggleMediaType}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            {showVideo ? "Switch to Audio Only" : "Show Video"}
          </button>
        </div>
      )}

      {showVideo && podcast.youtubeUrl ? (
        <div className="aspect-video w-full">
          <iframe
            src={podcast.youtubeUrl}
            title={podcast.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>
      ) : (
        <div className="p-4">
          <audio
            ref={audioRef}
            src={podcast.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {formatTime(currentTime)}
              </span>
              <span className="text-sm text-gray-500">
                {formatTime(duration)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={skipBackward}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
              </button>

              <button
                onClick={skipForward}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>

            <div className="flex items-center">
              <Volume2 size={20} className="text-gray-500 mr-2" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t">
        <button
          onClick={() => setTranscriptVisible(!transcriptVisible)}
          className="text-blue-500 hover:text-blue-700 text-sm font-medium"
        >
          {transcriptVisible ? "Hide Transcript" : "Show Transcript"}
        </button>

        {transcriptVisible && (
          <div className="mt-4">
            {podcast.youtubeUrl ? (
              <YouTubeTranscript
                transcriptUrl={podcast.transcriptUrl}
                youtubeUrl={podcast.youtubeUrl}
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg">
                {loadingTranscript ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {transcript}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-medium text-gray-900">About this podcast</h3>
          <p className="mt-1 text-gray-600">{podcast.description}</p>
        </div>
      </div>
    </div>
  );
}
