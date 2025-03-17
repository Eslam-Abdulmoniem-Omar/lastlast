"use client";

import { useState, useRef, useEffect } from "react";
import { Podcast, DialogueSegment, DialogueLine } from "@/lib/types";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { updateListeningProgress } from "@/lib/firebase/podcastUtils";
import { motion } from "framer-motion";
import TimestampedDialogue from "./TimestampedDialogue";
import GuidedSpeakingPractice from "./GuidedSpeakingPractice";

interface YouTubeShortPlayerProps {
  podcast: Podcast;
  onComplete?: () => void;
}

// Fallback dialogue lines if podcast doesn't have dialogueSegments
const fallbackDialogueLines: DialogueLine[] = [
  { id: "1", text: "It's no use, Joe.", startTime: 0.06, endTime: 2.399 },
  {
    id: "2",
    text: "Joe, we've got to have it out.",
    startTime: 2.399,
    endTime: 4.5,
  },
  {
    id: "3",
    text: "I've loved you ever since I've known you, Joe.",
    startTime: 4.5,
    endTime: 6.6,
  },
  {
    id: "4",
    text: "I couldn't help it, and I tried to show, and you wouldn't let me.",
    startTime: 6.6,
    endTime: 7.799,
  },
  {
    id: "5",
    text: "which is fine, but I must make you hear me now and give me an answer.",
    startTime: 7.799,
    endTime: 12.0,
  },
  {
    id: "6",
    text: "because I cannot go on like this any longer.",
    startTime: 12.0,
    endTime: 14.16,
  },
  {
    id: "7",
    text: "Even Billiards, I gave up everything you didn't like.",
    startTime: 14.16,
    endTime: 17.0,
  },
  {
    id: "8",
    text: "I'm happy I did, it's fine and I waited, and I never complained.",
    startTime: 17.0,
    endTime: 22.02,
  },
  {
    id: "9",
    text: "because, you know, I figured you'd love me, Joe.",
    startTime: 22.02,
    endTime: 25.0,
  },
];

export default function YouTubeShortPlayer({
  podcast,
  onComplete,
}: YouTubeShortPlayerProps) {
  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const playerRef = useRef<YT.Player | null>(null);

  // Content states
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isPracticeMode, setPracticeMode] = useState(false);
  const [guidedPracticeMode, setGuidedPracticeMode] = useState(false);

  // Speech recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [recordingFeedback, setRecordingFeedback] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null
  );
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [missingWords, setMissingWords] = useState<string[]>([]);

  // Refs for media handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();

  // Extract and prepare dialogue lines from podcast data
  const dialogueLines: DialogueLine[] = podcast.dialogueSegments
    ? podcast.dialogueSegments.map((segment) => ({
        id: segment.id,
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
      }))
    : fallbackDialogueLines;

  // Get current sentence based on current index
  const currentSentences = dialogueLines;
  const currentSentence =
    currentSentenceIndex < currentSentences.length
      ? currentSentences[currentSentenceIndex].text
      : "";

  // Initialize YouTube player
  useEffect(() => {
    if (typeof window !== "undefined" && !playerRef.current) {
      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      (window as any).onYouTubeIframeAPIReady = initializePlayer;

      // If the API is already loaded, initialize directly
      if ((window as any).YT && (window as any).YT.Player) {
        initializePlayer();
      }
    }

    return () => {
      cleanupRecording();
    };
  }, []);

  // Initialize the YouTube player
  const initializePlayer = () => {
    if (playerRef.current) return;

    try {
      // Extract video ID from YouTube URL
      const videoUrl = podcast.youtubeUrl || "";
      const match = videoUrl.match(/(?:embed\/|v=|\/)([\w-]{11})/);
      const videoId = match ? match[1] : "";

      if (!videoId) {
        console.error("Invalid YouTube URL:", videoUrl);
        return;
      }

      playerRef.current = new (window as any).YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: videoId,
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
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
    }
  };

  const onPlayerReady = (event: YT.PlayerEvent) => {
    setPlayerReady(true);
    setDuration(playerRef.current?.getDuration() || 0);
  };

  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    setIsPlaying(event.data === (window as any).YT.PlayerState.PLAYING);
  };

  // Update current time while playing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && playerRef.current) {
      interval = setInterval(() => {
        try {
          const currentTime = playerRef.current?.getCurrentTime() || 0;
          setCurrentTime(currentTime);
        } catch (error) {
          console.error("Error getting current time:", error);
        }
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Player controls
  const playVideo = () => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing video:", error);
      }
    }
  };

  const pauseVideo = () => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }
  };

  const seekToTime = (time: number) => {
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.seekTo(time, true);
        setCurrentTime(time);
      } catch (error) {
        console.error("Error seeking to time:", error);
      }
    }
  };

  const nextSentence = () => {
    if (currentSentenceIndex < currentSentences.length - 1) {
      const nextIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(nextIndex);

      if (currentSentences[nextIndex].startTime) {
        seekToTime(currentSentences[nextIndex].startTime);
      }

      // Reset recording states
      setRecordingTranscript("");
      setRecordingFeedback("");
      setFeedbackType(null);
      setSimilarityScore(null);
      setMissingWords([]);
    }
  };

  const previousSentence = () => {
    if (currentSentenceIndex > 0) {
      const prevIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(prevIndex);

      if (currentSentences[prevIndex].startTime) {
        seekToTime(currentSentences[prevIndex].startTime);
      }

      // Reset recording states
      setRecordingTranscript("");
      setRecordingFeedback("");
      setFeedbackType(null);
      setSimilarityScore(null);
      setMissingWords([]);
    }
  };

  // Update listening progress
  useEffect(() => {
    const updateProgress = async () => {
      if (user && currentTime > 0) {
        try {
          await updateListeningProgress(user.id, podcast.id);
        } catch (error) {
          console.error("Error updating listening progress:", error);
        }
      }
    };

    const debounced = setTimeout(updateProgress, 5000);
    return () => clearTimeout(debounced);
  }, [currentTime, user, podcast.id]);

  // Cleanup function for recording resources
  const cleanupRecording = () => {
    // Stop and clean up MediaRecorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
      mediaRecorderRef.current = null;
    }

    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping media track:", e);
        }
      });
      mediaStreamRef.current = null;
    }

    // Clear timers
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Reset recording states
    setIsRecording(false);
    setIsProcessing(false);
  };

  // Start recording function
  const startRecording = async () => {
    try {
      // Clean up any existing recording resources
      cleanupRecording();

      // Reset recording states
      setRecordingTranscript("");
      setRecordingFeedback("");
      setFeedbackType(null);
      setSimilarityScore(null);
      setMissingWords([]);
      setIsProcessing(false);
      audioChunksRef.current = [];

      // Request microphone access
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Store the stream reference
      mediaStreamRef.current = stream;

      // Create MediaRecorder
      let recorder;
      try {
        // Check if the browser supports the specified MIME type
        const mimeType = "audio/webm;codecs=opus";
        if (MediaRecorder.isTypeSupported(mimeType)) {
          recorder = new MediaRecorder(stream, { mimeType });
        } else {
          console.warn("Opus codec not supported, falling back to default");
          recorder = new MediaRecorder(stream);
        }
      } catch (e) {
        console.error(
          "Error creating MediaRecorder, falling back to default:",
          e
        );
        recorder = new MediaRecorder(stream);
      }

      // Store the recorder reference
      mediaRecorderRef.current = recorder;

      // Set up data handling
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      recorder.onstop = async () => {
        console.log("MediaRecorder stopped");
        setIsRecording(false);
        setIsProcessing(true);

        // Process the recorded audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          await processAudioBlob(audioBlob);
        } else {
          console.warn("No audio data captured");
          setRecordingFeedback("No audio data captured. Please try again.");
          setFeedbackType("error");
          setIsProcessing(false);
        }
      };

      // Handle recording errors
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setRecordingFeedback("Recording error occurred. Please try again.");
        setFeedbackType("error");
        setIsRecording(false);
        setIsProcessing(false);
        cleanupRecording();
      };

      // Start recording
      recorder.start();
      setIsRecording(true);
      console.log("Recording started");

      // Set timeout to stop recording after 4 seconds
      recordingTimerRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          console.log("Auto-stopping recording after 4 seconds");
          mediaRecorderRef.current.stop();
        }
        recordingTimerRef.current = null;
      }, 4000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingFeedback(
        "Could not access microphone. Please check your browser permissions."
      );
      setFeedbackType("error");
      setIsRecording(false);
      setIsProcessing(false);
      cleanupRecording();
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
        setIsProcessing(false);
      }
    }

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
  };

  // Process audio blob using Deepgram API
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      console.log("Processing audio blob:", audioBlob.size, "bytes");

      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Send the audio to a server endpoint for transcription
      const response = await fetch("/api/deepgram/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.transcript && result.transcript.trim() !== "") {
        console.log("Transcription result:", result.transcript);
        setRecordingTranscript(result.transcript);

        // Compare with original sentence
        compareWithOriginal(result.transcript);
      } else {
        console.warn("No transcript returned from API");
        setRecordingFeedback("No speech detected. Please try again.");
        setFeedbackType("error");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setRecordingFeedback("Error processing your speech. Please try again.");
      setFeedbackType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Compare transcribed text with original sentence
  const compareWithOriginal = (transcribedText: string) => {
    if (!currentSentence) {
      setRecordingFeedback("No sentence to compare with.");
      setFeedbackType("error");
      return;
    }

    // Normalize both strings for comparison (lowercase, remove punctuation)
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();
    };

    const normalizedExpected = normalizeText(currentSentence);
    const normalizedTranscript = normalizeText(transcribedText);

    console.log("Comparing:", normalizedTranscript);
    console.log("With:", normalizedExpected);

    // Calculate similarity score using Levenshtein distance
    const similarityResult = calculateTextSimilarity(
      normalizedTranscript,
      normalizedExpected
    );
    setSimilarityScore(similarityResult.similarity);
    setMissingWords(similarityResult.missingWords);

    // Determine feedback based on similarity score
    if (similarityResult.similarity >= 0.8) {
      setRecordingFeedback("Excellent! Your pronunciation is very accurate.");
      setFeedbackType("success");
    } else if (similarityResult.similarity >= 0.6) {
      setRecordingFeedback(
        "Good attempt! Try to pronounce these words more clearly: " +
          similarityResult.missingWords.join(", ")
      );
      setFeedbackType("success");
    } else {
      setRecordingFeedback(
        "Let's practice more. Try again and focus on these words: " +
          similarityResult.missingWords.join(", ")
      );
      setFeedbackType("error");
    }
  };

  // Calculate text similarity using Levenshtein distance
  const calculateTextSimilarity = (text1: string, text2: string) => {
    // Split into words
    const text1Words = text1.split(/\s+/);
    const text2Words = text2.split(/\s+/);

    // Words from the original text that don't appear in the transcript
    const missingWords: string[] = [];

    // Find words that appear in text2 but not in text1
    text2Words.forEach((word) => {
      if (!text1Words.includes(word)) {
        missingWords.push(word);
      }
    });

    // Calculate character-level Levenshtein distance
    const levenshteinDistance = (str1: string, str2: string): number => {
      const track = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(null));

      for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
      }

      for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
      }

      for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          track[j][i] = Math.min(
            track[j][i - 1] + 1, // deletion
            track[j - 1][i] + 1, // insertion
            track[j - 1][i - 1] + indicator // substitution
          );
        }
      }

      return track[str2.length][str1.length];
    };

    const distance = levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    const similarity = maxLength > 0 ? 1 - distance / maxLength : 1;

    return {
      similarity,
      missingWords: missingWords.length > 0 ? missingWords : ["None"],
    };
  };

  // Toggle practice mode
  const togglePracticeMode = () => {
    const newMode = !isPracticeMode;
    setPracticeMode(newMode);

    if (newMode) {
      // Turn off guided practice mode if turning on practice mode
      setGuidedPracticeMode(false);
      setRecordingFeedback(
        "Practice mode activated. Listen to the sentence, then press 'Record' to practice speaking."
      );
    } else {
      setRecordingFeedback("");
    }

    // Reset states
    setRecordingTranscript("");
    setFeedbackType(null);
    setSimilarityScore(null);
    setMissingWords([]);
    cleanupRecording();
  };

  // Toggle guided practice mode
  const toggleGuidedPracticeMode = () => {
    const newMode = !guidedPracticeMode;
    setGuidedPracticeMode(newMode);

    if (newMode) {
      // Turn off regular practice mode if turning on guided practice mode
      setPracticeMode(false);
    }

    // Reset states
    setRecordingTranscript("");
    setRecordingFeedback("");
    setFeedbackType(null);
    setSimilarityScore(null);
    setMissingWords([]);
    cleanupRecording();
  };

  // Determine the current segment based on time
  useEffect(() => {
    if (!isPlaying || guidedPracticeMode) return;

    const currentSegmentIndex = dialogueLines.findIndex(
      (segment) =>
        currentTime >= segment.startTime &&
        currentTime < (segment.endTime || Infinity)
    );

    if (
      currentSegmentIndex !== -1 &&
      currentSegmentIndex !== currentSentenceIndex
    ) {
      setCurrentSentenceIndex(currentSegmentIndex);
    }
  }, [
    currentTime,
    dialogueLines,
    isPlaying,
    currentSentenceIndex,
    guidedPracticeMode,
  ]);

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative pb-[56.25%] w-full h-0">
        <div
          id="youtube-player"
          className="absolute top-0 left-0 w-full h-full"
        ></div>
      </div>

      {/* Player Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <button
              onClick={previousSentence}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              title="Previous Sentence"
              disabled={currentSentenceIndex === 0}
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={isPlaying ? pauseVideo : playVideo}
              className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={nextSentence}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              title="Next Sentence"
              disabled={currentSentenceIndex === currentSentences.length - 1}
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={togglePracticeMode}
              className={`p-2 rounded-full ${
                isPracticeMode
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              title="Practice Mode - Speak the sentences"
            >
              <Mic size={20} />
            </button>

            <button
              onClick={toggleGuidedPracticeMode}
              className={`p-2 rounded-full ${
                guidedPracticeMode
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              title="Guided Practice Mode - Step by step practice with corrections"
            >
              <BookOpen size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
        {/* Left Column: Current Sentence & Practice */}
        <div className={`md:w-1/2 ${guidedPracticeMode ? "md:w-full" : ""}`}>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">{podcast.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{podcast.description}</p>

            {/* Current Sentence */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Current Sentence
              </h4>
              <p className="text-base">
                {currentSentence || "No sentence available"}
              </p>
            </div>

            {/* Practice Mode UI */}
            {isPracticeMode && !guidedPracticeMode && (
              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-1">
                  Practice Mode {isRecording ? "- Recording" : ""}
                </h4>
                <p className="text-sm text-green-700 font-medium mb-2">
                  Sentence {currentSentenceIndex + 1} of{" "}
                  {currentSentences.length}
                </p>

                {/* Recording controls */}
                <div className="flex flex-col items-center mb-4">
                  {!isRecording && !isProcessing && (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2 bg-red-500 text-white rounded-full flex items-center"
                    >
                      <Mic size={18} className="mr-2" />
                      Start Recording
                    </button>
                  )}

                  {isRecording && (
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
                        onClick={stopRecording}
                      >
                        <MicOff size={24} className="text-white" />
                      </motion.div>
                      <p className="text-center text-sm text-gray-600 mt-2">
                        Recording... (tap to stop)
                      </p>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex flex-col items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mb-2"
                      />
                      <p className="text-sm text-gray-600">
                        Processing your speech...
                      </p>
                    </div>
                  )}
                </div>

                {/* Transcript and feedback */}
                {recordingTranscript && !isRecording && !isProcessing && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">
                      You said:
                    </h5>
                    <p className="text-sm bg-white p-2 rounded border border-gray-200">
                      {recordingTranscript}
                    </p>
                  </div>
                )}

                {feedbackType && !isRecording && !isProcessing && (
                  <div
                    className={`p-3 rounded-lg mb-3 ${
                      feedbackType === "success"
                        ? "bg-green-100 border-green-200"
                        : "bg-red-100 border-red-200"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      {feedbackType === "success" ? (
                        <CheckCircle
                          size={18}
                          className="text-green-500 mr-2"
                        />
                      ) : (
                        <XCircle size={18} className="text-red-500 mr-2" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          feedbackType === "success"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {recordingFeedback}
                      </p>
                    </div>

                    {similarityScore !== null && (
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-600 mr-2">
                          Accuracy:
                        </span>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              similarityScore >= 0.8
                                ? "bg-green-500"
                                : similarityScore >= 0.6
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.round(similarityScore * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-xs ml-2 font-mono">
                          {Math.round(similarityScore * 100)}%
                        </span>
                      </div>
                    )}

                    {missingWords &&
                      missingWords.length > 0 &&
                      missingWords[0] !== "None" && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">
                            Words to practice:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {missingWords.map((word, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <button
                      onClick={startRecording}
                      className="mt-3 w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-xs flex items-center justify-center"
                    >
                      <Mic size={14} className="mr-1" />
                      Try Again
                    </button>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={previousSentence}
                    disabled={currentSentenceIndex === 0}
                    className={`flex items-center px-3 py-1 rounded ${
                      currentSentenceIndex === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <ArrowRight
                      size={16}
                      className="mr-1 transform rotate-180"
                    />
                    Previous
                  </button>
                  <button
                    onClick={nextSentence}
                    disabled={
                      currentSentenceIndex === currentSentences.length - 1
                    }
                    className={`flex items-center px-3 py-1 rounded ${
                      currentSentenceIndex === currentSentences.length - 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Next
                    <ArrowRight size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Simple feedback when not in practice mode */}
            {recordingFeedback && !isPracticeMode && !guidedPracticeMode && (
              <div className="mt-2 text-sm text-center text-gray-600">
                {recordingFeedback}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dialogue and Vocabulary */}
        {!guidedPracticeMode && (
          <div className="md:w-1/2">
            <div className="p-4">
              <h4 className="font-medium text-lg mb-3">Full Dialogue</h4>
              <TimestampedDialogue
                dialogueLines={dialogueLines}
                currentTime={currentTime}
                onLineClick={seekToTime}
                activeLineId={currentSentences[currentSentenceIndex]?.id}
              />
            </div>
          </div>
        )}

        {/* Guided Practice Mode */}
        {guidedPracticeMode && (
          <div className="w-full p-4">
            <GuidedSpeakingPractice
              dialogueLines={dialogueLines}
              onSeekToTime={seekToTime}
              onComplete={() => {
                setGuidedPracticeMode(false);
                setRecordingFeedback("Guided practice completed! Great job!");
                if (onComplete) onComplete();
              }}
              onPauseVideo={pauseVideo}
              onPlayVideo={() => {
                if (playerRef.current && playerReady) {
                  console.log("Playing video");
                  playerRef.current.playVideo();
                }
              }}
              currentTime={currentTime}
              simpleFeedback={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
