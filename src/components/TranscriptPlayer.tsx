"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Podcast, DialogueLine } from "@/lib/types";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Mic,
  BookOpen,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { updateListeningProgress } from "@/lib/firebase/podcastUtils";
import { motion } from "framer-motion";
import SpeechRecorder from "./SpeechRecorder";
import GuidedSpeakingPractice from "./GuidedSpeakingPractice";

interface TranscriptPlayerProps {
  podcast: Podcast;
  onComplete?: () => void;
  transcript: string; // Raw transcript with timestamps
}

// Define a type for the practice modes
type PracticeMode = "listening" | "speaking";

export default function TranscriptPlayer({
  podcast,
  onComplete,
  transcript,
}: TranscriptPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("listening");
  const [recordingFeedback, setRecordingFeedback] = useState<string>("");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineId, setActiveLineId] = useState<string | undefined>(
    undefined
  );
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const playerRef = useRef<YT.Player | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Parse transcript on component mount
  useEffect(() => {
    const parsedLines = parseTranscript(transcript);
    setDialogueLines(parsedLines);
  }, [transcript]);

  // Parse the transcript into dialogue lines with timestamps
  const parseTranscript = (rawTranscript: string): DialogueLine[] => {
    const lines = rawTranscript.split("\n\n");
    const dialogueLines: DialogueLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split("\n");
      if (parts.length < 2) continue;

      const timePart = parts[0];
      const textPart = parts.slice(1).join(" ").trim();

      const timeMatch = timePart.match(
        /(\d+):(\d+):(\d+)\.(\d+)\s+-->\s+(\d+):(\d+):(\d+)\.(\d+)/
      );
      if (!timeMatch) continue;

      const [
        ,
        startHour,
        startMin,
        startSec,
        startMs,
        endHour,
        endMin,
        endSec,
        endMs,
      ] = timeMatch;

      const startTime =
        parseInt(startHour) * 3600 +
        parseInt(startMin) * 60 +
        parseInt(startSec) +
        parseInt(startMs) / 1000;

      const endTime =
        parseInt(endHour) * 3600 +
        parseInt(endMin) * 60 +
        parseInt(endSec) +
        parseInt(endMs) / 1000;

      dialogueLines.push({
        id: `line-${i}`,
        text: textPart,
        startTime,
        endTime,
      });
    }

    return dialogueLines;
  };

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Current sentences for practice mode
  const currentSentences = dialogueLines.map((line) => line.text);
  const currentSentence = currentSentences[currentSentenceIndex] || "";

  // Initialize YouTube player
  const initializePlayer = useCallback(() => {
    if (!podcast.youtubeUrl) return;

    const videoId = extractVideoId(podcast.youtubeUrl);
    if (!videoId) return;

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    const onPlayerReady = (event: YT.PlayerEvent) => {
      setPlayerReady(true);
      setIsLoading(false);
      event.target.setVolume(70);
    };

    const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
      if (event.data === YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        startTimeTracking();
      } else if (event.data === YT.PlayerState.PAUSED) {
        setIsPlaying(false);
        stopTimeTracking();
      } else if (event.data === YT.PlayerState.ENDED) {
        setIsPlaying(false);
        stopTimeTracking();
        onComplete?.();
      }
    };

    playerRef.current = new YT.Player("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });
  }, [podcast.youtubeUrl, onComplete]);

  const pauseVideo = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
  }, []);

  // Load YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      window.onYouTubeIframeAPIReady = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initializePlayer]);

  // Pause video when recording starts
  useEffect(() => {
    if (isRecording) {
      pauseVideo();
    }
  }, [isRecording, pauseVideo]);

  const onPlayerReady = (event: YT.PlayerEvent) => {
    setPlayerReady(true);

    // Start a timer to update current time
    timerRef.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        const currentTime = playerRef.current.getCurrentTime();
        setCurrentTime(currentTime);

        // Find the active line based on current time
        const activeLine = dialogueLines.find(
          (line) =>
            currentTime >= line.startTime &&
            (!line.endTime || currentTime < line.endTime)
        );

        if (activeLine) {
          setActiveLineId(activeLine.id);
          // Update current sentence index for practice mode
          const lineIndex = dialogueLines.findIndex(
            (line) => line.id === activeLine.id
          );
          if (lineIndex !== -1) {
            setCurrentSentenceIndex(lineIndex);
          }
        }
      }
    }, 100); // Update every 100ms
  };

  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (
      event.data === YT.PlayerState.PAUSED ||
      event.data === YT.PlayerState.ENDED
    ) {
      setIsPlaying(false);
    }

    // Update progress when user watches the video
    if (user && event.data === YT.PlayerState.PLAYING) {
      updateListeningProgress(user.uid, podcast.id).catch((error) =>
        console.error("Error updating listening progress:", error)
      );
    }

    // Trigger onComplete when the video is over
    if (event.data === YT.PlayerState.ENDED) {
      onComplete?.();
    }
  };

  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const seekToTime = (time: number) => {
    if (!playerRef.current || !playerReady) return;

    playerRef.current.seekTo(time, true);
    playerRef.current.playVideo();
    setIsPlaying(true);

    // Find the line that corresponds to this time
    const activeLine = dialogueLines.find(
      (line) => time >= line.startTime && (!line.endTime || time < line.endTime)
    );

    if (activeLine) {
      setActiveLineId(activeLine.id);
      // Update current sentence index for practice mode
      const lineIndex = dialogueLines.findIndex(
        (line) => line.id === activeLine.id
      );
      if (lineIndex !== -1) {
        setCurrentSentenceIndex(lineIndex);
      }
    }
  };

  const togglePlayPause = () => {
    if (!playerRef.current || !playerReady) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const nextSegment = () => {
    const nextIndex = currentSentenceIndex + 1;
    if (nextIndex < dialogueLines.length) {
      setCurrentSentenceIndex(nextIndex);
      seekToTime(dialogueLines[nextIndex].startTime);
    }
  };

  const previousSegment = () => {
    const prevIndex = currentSentenceIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSentenceIndex(prevIndex);
      seekToTime(dialogueLines[prevIndex].startTime);
    }
  };

  const handleTranscriptChange = (transcript: string) => {
    setRecordingTranscript(transcript);
  };

  const togglePracticeMode = (mode: PracticeMode) => {
    setPracticeMode(mode);

    // If switching to speaking mode, pause the video
    if (mode === "speaking") {
      pauseVideo();
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with practice mode tabs */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500">
        <div className="container mx-auto">
          <div className="flex flex-col p-4">
            <h2 className="text-2xl font-bold text-white">{podcast.title}</h2>
            <p className="text-sm text-white opacity-80">
              {podcast.hostName} • {Math.ceil(podcast.duration / 60)} min
            </p>
          </div>

          {/* Practice mode tabs */}
          <div className="flex bg-blue-600 text-white mt-2">
            <button
              onClick={() => togglePracticeMode("listening")}
              className={`flex-1 p-3 flex items-center justify-center space-x-2 transition ${
                practiceMode === "listening"
                  ? "bg-white text-blue-600"
                  : "hover:bg-blue-700"
              }`}
            >
              <Headphones size={20} />
              <span className="font-medium">Listening</span>
            </button>
            <button
              onClick={() => togglePracticeMode("speaking")}
              className={`flex-1 p-3 flex items-center justify-center space-x-2 transition ${
                practiceMode === "speaking"
                  ? "bg-white text-blue-600"
                  : "hover:bg-blue-700"
              }`}
            >
              <Mic size={20} />
              <span className="font-medium">Guided Practice</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-96">
        {/* Video Player */}
        <div
          className={`md:w-1/2 ${
            practiceMode === "speaking" ? "md:w-full" : ""
          }`}
        >
          <div className="aspect-video w-full bg-black relative">
            <div id="youtube-player" className="w-full h-full"></div>

            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <button
                  onClick={previousSegment}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
                  aria-label="Previous segment"
                >
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={nextSegment}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
                  aria-label="Next segment"
                >
                  <SkipForward size={20} />
                </button>
              </div>

              {/* Current time display */}
              <div className="text-gray-600 font-medium">
                {formatTime(currentTime)} / {formatTime(podcast.duration)}
              </div>
            </div>
          </div>
        </div>

        {/* Transcript view for Listening mode */}
        {practiceMode === "listening" && (
          <div className="md:w-1/2 p-4 max-h-[500px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Transcript</h3>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showTranscript ? "Hide" : "Show"} Transcript
              </button>
            </div>

            {showTranscript && (
              <div className="space-y-4">
                {dialogueLines.map((line) => (
                  <div
                    key={line.id}
                    className={`p-3 rounded-lg transition-colors ${
                      activeLineId === line.id
                        ? "bg-blue-100 border-l-4 border-blue-500"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => seekToTime(line.startTime)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {formatTime(line.startTime)}
                      </span>
                    </div>
                    <p className="text-gray-800">{line.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guided Speaking Practice for Speaking mode */}
        {practiceMode === "speaking" && (
          <div className="w-full p-4">
            <GuidedSpeakingPractice
              dialogueLines={dialogueLines}
              onSeekToTime={seekToTime}
              onComplete={() => {
                togglePracticeMode("listening");
                setRecordingFeedback("Guided practice completed! Great job!");
              }}
              onPauseVideo={pauseVideo}
              onPlayVideo={() => {
                if (playerRef.current && playerReady) {
                  playerRef.current.playVideo();
                  setIsPlaying(true);
                }
              }}
              currentTime={currentTime}
            />
          </div>
        )}
      </div>
    </div>
  );
}
