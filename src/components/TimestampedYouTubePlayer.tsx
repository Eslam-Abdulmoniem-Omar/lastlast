"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Podcast, DialogueLine } from "@/lib/types";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Headphones,
  Mic,
  BookOpen,
  X,
  Globe,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { updateListeningProgress } from "@/lib/firebase/podcastUtils";
import { motion } from "framer-motion";
import SpeechRecorder from "./SpeechRecorder";
import GuidedSpeakingPractice from "./GuidedSpeakingPractice";
import VocabularyTest from "./VocabularyTest";

interface TimestampedYouTubePlayerProps {
  podcast: Podcast;
  onComplete?: () => void;
}

// Define a type for the practice modes
type PracticeMode = "listening" | "vocabulary" | "speaking" | "test";

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
    text: "Which is fine, but I must make you hear me now and give me an answer.",
    startTime: 7.799,
    endTime: 9.9,
  },
  {
    id: "6",
    text: "Because I cannot go on like this any longer.",
    startTime: 9.9,
    endTime: 12.0,
  },
  {
    id: "7",
    text: "Even Billiards, I gave up everything you didn't like.",
    startTime: 12.0,
    endTime: 14.16,
  },
  {
    id: "8",
    text: "I'm happy I did, it's fine.",
    startTime: 14.16,
    endTime: 15.599,
  },
  {
    id: "9",
    text: "And I waited, and I never complained because I...",
    startTime: 15.599,
    endTime: 19.5,
  },
  {
    id: "10",
    text: "You know, I figured you'd love me, Joe.",
    startTime: 19.5,
    endTime: 22.0,
  },
];

export default function TimestampedYouTubePlayer({
  podcast,
  onComplete,
}: TimestampedYouTubePlayerProps) {
  // Generate dialogue lines from podcast dialogueSegments if available
  const dialogueLines = podcast.dialogueSegments
    ? podcast.dialogueSegments.map((segment, index) => ({
        id: segment.id,
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
      }))
    : fallbackDialogueLines;

  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("listening");
  const [recordingFeedback, setRecordingFeedback] = useState<string>("");
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineId, setActiveLineId] = useState<string | undefined>(
    dialogueLines.length > 0 ? dialogueLines[0].id : undefined
  );
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    base_word?: string;
    general_translation?: string[];
    is_phrasal?: boolean;
    phrasal_form?: string;
    contextual_translation?: {
      full_phrase: string;
      translation: string;
      explanation: string;
    } | null;
    meaning_comparison?: string;
    additional_example?: {
      english: string;
      arabic: string;
    };
    isLoading?: boolean;
  } | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<{
    original_text: string;
    translation: string;
    is_sentence: boolean;
    contextual_elements?: Array<{
      element: string;
      translation: string;
      explanation: string;
    }>;
    isLoading?: boolean;
    explanation?: string;
  } | null>(null);
  const [struggledWords, setStruggledWords] = useState<string[]>([]);

  const playerRef = useRef<YT.Player | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Current sentences for practice mode
  const currentSentences = dialogueLines.map((line) => line.text);
  const currentSentence = currentSentences[currentSentenceIndex] || "";

  const startTimeTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

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
  }, [dialogueLines, isPlaying]);

  const stopTimeTracking = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

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
  }, [podcast.youtubeUrl, onComplete, startTimeTracking, stopTimeTracking]);

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

  // Auto-activate the first dialogue line when component mounts
  useEffect(() => {
    if (dialogueLines.length > 0 && practiceMode === "listening") {
      // Set the first line as active
      setActiveLineId(dialogueLines[0].id);
      // Set the current sentence index to 0
      setCurrentSentenceIndex(0);
    }
  }, [dialogueLines, practiceMode]);

  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const seekToTime = (time: number) => {
    if (!playerRef.current || !playerReady) {
      console.error("Player not ready for seeking");
      return;
    }

    try {
      // Convert time to a precise value with 2 decimal places
      const preciseTime = parseFloat(time.toFixed(2));

      // Remove the offset that was causing misalignment - seek to the exact time
      const seekPosition = preciseTime;

      console.log(
        `Attempting to seek to position: ${seekPosition}s (original: ${time}s)`
      );

      // Force pause first to ensure reliable seeking
      playerRef.current?.pauseVideo();

      // Use setTimeout to allow the pause to take effect
      setTimeout(() => {
        if (!playerRef.current) {
          console.error("Player reference lost during seeking timeout");
          return;
        }

        // Seek to position with exact seconds
        playerRef.current.seekTo(seekPosition, true);

        // Short delay before playing to ensure the seek completes
        setTimeout(() => {
          if (!playerRef.current) {
            console.error("Player reference lost during play timeout");
            return;
          }

          playerRef.current.playVideo();
          setIsPlaying(true);
          console.log(`Playback started at position: ${seekPosition}s`);

          // Find the line that corresponds to this time
          const activeLine = dialogueLines.find(
            (line) =>
              preciseTime >= line.startTime &&
              (!line.endTime || preciseTime < line.endTime)
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
        }, 100);
      }, 50);
    } catch (error) {
      console.error("Error seeking to timestamp:", error);
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

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
  };

  const togglePracticeMode = (mode: PracticeMode) => {
    // Remove the redirection for speaking mode
    setPracticeMode(mode);

    // If switching to speaking mode, pause the video
    if (mode === "speaking") {
      pauseVideo();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Function to handle word click
  const handleWordClick = async (word: string) => {
    // Pause the video when a word is clicked
    pauseVideo();

    // Clean the word for lookup (lowercase and remove punctuation)
    const cleanWord = word
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    // Set loading state
    setSelectedWord({
      word: word,
      general_translation: ["جاري التحميل..."],
      isLoading: true,
    });

    try {
      // Get the full dialogue context for better contextual understanding
      const fullContext = dialogueLines.map((line) => line.text).join(" ");

      // Call the OpenAI API for translation
      const response = await fetch("/api/openai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: cleanWord,
          context: fullContext, // Use the full dialogue context
          isFullSentence: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Update the selected word state with the API response
      setSelectedWord({
        word: word,
        base_word: data.base_word || word,
        general_translation: data.general_translation || ["ترجمة غير متوفرة"],
        is_phrasal: data.is_phrasal || false,
        phrasal_form: data.phrasal_form,
        contextual_translation: data.contextual_translation || null,
        meaning_comparison: data.meaning_comparison,
        additional_example: data.additional_example,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching translation:", error);
      // Set error state
      setSelectedWord({
        word: word,
        general_translation: ["حدث خطأ في الترجمة"],
        isLoading: false,
      });
    }
  };

  // Function to close the word details popup
  const closeWordDetails = () => {
    setSelectedWord(null);
    // We don't resume the video on close - user must click resume button
  };

  // Function to resume video after viewing translation
  const resumeVideoPlayback = () => {
    closeWordDetails();
    if (playerRef.current && playerReady) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Add a function to handle clicking on a segment in vocabulary mode
  const handleVocabularySegmentPlay = (startTime: number) => {
    console.log(`Vocabulary segment play clicked, seeking to: ${startTime}s`);

    // Use our improved seeking function
    seekToTime(startTime);
  };

  // Update the renderClickableWords function for better word click handling
  const renderClickableWords = (text: string) => {
    // Split the text into words, preserving spaces and punctuation
    const words = text.match(/\S+|\s+/g) || [];

    return words.map((word, index) => {
      if (word.trim() === "") {
        return <span key={index}>{word}</span>;
      }

      // Clean the word for comparison (removing punctuation)
      const cleanWord = word.replace(/[^\w\s']|_/g, "").toLowerCase();

      return (
        <button
          key={index}
          onClick={() => handleWordClick(word)}
          className={`inline relative px-0.5 mx-0 py-0.5 rounded transition-all duration-200 ${
            selectedWord?.word.toLowerCase() === cleanWord
              ? "bg-primary/30 text-primary-light font-medium shadow-sm"
              : "hover:bg-[#4d7efa]/30 hover:text-white hover:scale-110 hover:shadow-sm"
          }`}
          style={{ marginRight: "0px" }}
        >
          {word}
        </button>
      );
    });
  };

  // Function to close the sentence details popup
  const closeSentenceDetails = () => {
    setSelectedSentence(null);
  };

  // Add a function to handle translating all dialogue lines
  const handleTranslateAll = async () => {
    // Combine all dialogue lines into a single text
    const allText = dialogueLines.map((line) => line.text).join(" ");

    // Call the sentence translation function with the combined text
    handleSentenceTranslate(allText);
  };

  // Add the handleSentenceTranslate function
  const handleSentenceTranslate = async (sentence: string) => {
    // Set loading state
    setSelectedSentence({
      original_text: sentence,
      translation: "جاري التحميل...",
      is_sentence: true,
      contextual_elements: [],
      isLoading: true,
    });

    try {
      // Get the full dialogue context
      const fullContext = dialogueLines.map((line) => line.text).join(" ");

      // Call the OpenAI API for translation instead of Gemini
      const response = await fetch("/api/openai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: sentence,
          context: fullContext, // Send the full dialogue context
          isFullSentence: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API error response:", data);
        throw new Error(
          `API request failed with status ${response.status}: ${
            data.error || "Unknown error"
          }`
        );
      }

      if (data.error) {
        console.error("API returned error:", data.error);
        throw new Error(data.error);
      }

      console.log("Sentence translation received from OpenAI:", data);

      // Update the selected sentence with the API response
      setSelectedSentence({
        original_text: data.original_text || sentence,
        translation: data.translation || "الترجمة غير متوفرة",
        is_sentence: true,
        contextual_elements: data.contextual_elements || [],
        isLoading: false,
        explanation: data.explanation,
      });
    } catch (error) {
      console.error("Error fetching sentence translation:", error);

      // Show error state
      setSelectedSentence({
        original_text: sentence,
        translation: "خطأ في الترجمة. يرجى المحاولة مرة أخرى.",
        is_sentence: true,
        contextual_elements: [],
        isLoading: false,
      });
    }
  };

  // Add a function to directly handle clicking on a dialogue line in listening mode
  const handleDialogueLineClick = (line: DialogueLine) => {
    console.log(
      `Line clicked, seeking to: ${line.startTime}s - "${line.text.substring(
        0,
        20
      )}..."`
    );

    // Set the active line ID immediately for better UI feedback
    setActiveLineId(line.id);

    // Update current sentence index for practice mode
    const lineIndex = dialogueLines.findIndex((l) => l.id === line.id);
    if (lineIndex !== -1) {
      setCurrentSentenceIndex(lineIndex);
    }

    // Seek to the timestamp with our improved seeking function
    seekToTime(line.startTime);
  };

  // In the renderListeningMode function (or wherever you render the listening mode UI)
  const renderListeningMode = () => {
    return (
      <div className="space-y-4 pt-4">
        {dialogueLines.map((line) => (
          <div
            key={line.id}
            className={`p-3 rounded-md transition-colors cursor-pointer ${
              activeLineId === line.id
                ? "bg-primary/20 border-l-4 border-primary"
                : "bg-white/5 hover:bg-white/10 border-l-4 border-transparent"
            }`}
            onClick={() => handleDialogueLineClick(line)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-white/70">
                {formatTime(line.startTime)}
                {line.endTime && ` - ${formatTime(line.endTime)}`}
              </span>

              {activeLineId === line.id && (
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary/40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            <p className="text-white">{line.text}</p>
          </div>
        ))}
      </div>
    );
  };

  // Add a new render function for the test mode
  const renderTestMode = () => {
    return (
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vocabulary Test</h3>
          <button
            onClick={() => togglePracticeMode("listening")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Return to Listening
          </button>
        </div>

        <VocabularyTest
          struggledWords={
            struggledWords.length > 0
              ? struggledWords
              : getCommonWordsFromDialogue()
          }
          videoContext={podcast.title}
          onComplete={() => {
            // Optionally do something when test is completed
            console.log("Test completed");
          }}
        />
      </div>
    );
  };

  // Add a helper function to extract common words from dialogue if no struggled words yet
  const getCommonWordsFromDialogue = (): string[] => {
    // Extract some common words from the dialogue lines
    const allText = dialogueLines.map((line) => line.text).join(" ");
    const words = allText.toLowerCase().match(/\b\w+\b/g) || [];

    // Filter out common words and get unique ones
    const commonWords = words
      .filter(
        (word) =>
          word.length > 3 &&
          !["this", "that", "with", "from", "have", "your"].includes(word)
      )
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 5); // Take first 5 unique words

    return commonWords;
  };

  // Add a function to collect struggled words
  const addStruggledWords = (words: string[]) => {
    const newWords = words.filter(
      (word) => !struggledWords.includes(word.toLowerCase())
    );
    if (newWords.length > 0) {
      setStruggledWords((prev) => [
        ...prev,
        ...newWords.map((w) => w.toLowerCase()),
      ]);
    }
  };

  return (
    <div className="w-full bg-[#1b2b48]/80 backdrop-blur-sm rounded-lg shadow-xl border border-[#2e3b56]/50 overflow-hidden">
      <style jsx global>{`
        /* Custom scrollbar for the component */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(27, 43, 72, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(77, 126, 250, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(77, 126, 250, 0.7);
        }

        /* Animation for popup */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }

        /* Word details popup positioning */
        #word-details-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }
      `}</style>

      {/* Header with practice mode tabs */}
      <div className="bg-gradient-to-r from-[#0c1527] to-[#111f3d]">
        <div className="container mx-auto">
          <div className="flex flex-col p-4">
            <h2 className="text-2xl font-bold text-white">{podcast.title}</h2>
            <p className="text-sm text-white/70">
              {podcast.hostName} • {Math.ceil(podcast.duration / 60)} min
            </p>
          </div>

          {/* Practice mode tabs */}
          <div className="flex bg-[#1b2b48] text-white mt-2 border-t border-[#2e3b56]/50">
            <button
              onClick={() => togglePracticeMode("listening")}
              className={`flex-1 p-3 flex items-center justify-center space-x-2 transition-all duration-200 ${
                practiceMode === "listening"
                  ? "bg-[#0c1527] text-[#4d7efa] font-bold border-b-2 border-[#4d7efa]"
                  : "hover:bg-[#0c1527] hover:text-[#4d7efa]"
              }`}
            >
              <Headphones
                size={20}
                className={practiceMode === "listening" ? "text-[#4d7efa]" : ""}
              />
              <span className="font-medium">Listening</span>
            </button>
            <button
              onClick={() => togglePracticeMode("vocabulary")}
              className={`flex-1 p-3 flex items-center justify-center space-x-2 transition-all duration-200 ${
                practiceMode === "vocabulary"
                  ? "bg-[#0c1527] text-[#4d7efa] font-bold border-b-2 border-[#4d7efa]"
                  : "hover:bg-[#0c1527] hover:text-[#4d7efa]"
              }`}
            >
              <BookOpen
                size={20}
                className={
                  practiceMode === "vocabulary" ? "text-[#4d7efa]" : ""
                }
              />
              <span className="font-medium">Vocabulary</span>
            </button>
            {/* Re-enable Speaking mode */}
            <button
              onClick={() => togglePracticeMode("speaking")}
              className={`flex-1 p-3 flex items-center justify-center space-x-2 transition-all duration-200 ${
                practiceMode === "speaking"
                  ? "bg-[#0c1527] text-[#4d7efa] font-bold border-b-2 border-[#4d7efa]"
                  : "hover:bg-[#0c1527] hover:text-[#4d7efa]"
              }`}
            >
              <Mic
                size={20}
                className={practiceMode === "speaking" ? "text-[#4d7efa]" : ""}
              />
              <span className="font-medium">Speaking</span>
            </button>
            {/* Add a Test button to the mode selection */}
            <button
              onClick={() => togglePracticeMode("test")}
              className={`flex items-center justify-center py-2 px-3 text-sm rounded-md ${
                practiceMode === "test"
                  ? "bg-purple-100 text-purple-700 border border-purple-300"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <BookOpen size={16} className="mr-1" />
              <span>Test</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[520px]">
        {/* Video Player */}
        <div
          className={`md:w-1/2 ${
            practiceMode === "speaking" ? "md:w-full" : ""
          }`}
        >
          <div className="relative w-full" style={{ aspectRatio: "10/9" }}>
            <div id="youtube-player" className="w-full h-full"></div>

            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1b2b48]/50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}
          </div>

          {/* Player Controls */}
          <div className="p-4 bg-[#1b2b48]/50 backdrop-blur-sm border-b border-[#2e3b56]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
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
          <div className="md:w-1/2 bg-[#1b2b48]/50 backdrop-blur-sm border-l border-[#2e3b56]/50 p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Dialogue</h3>
              <button
                onClick={handleTranslateAll}
                className="flex items-center space-x-1 text-sm px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary-light rounded-md transition"
              >
                <Globe size={16} />
                <span>Translate All</span>
              </button>
            </div>

            <div className="space-y-4">{renderListeningMode()}</div>

            {recordingFeedback && (
              <div className="mt-4 p-3 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-lg">
                <p className="text-white">{recordingFeedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Vocabulary Mode */}
        {practiceMode === "vocabulary" && (
          <div className="md:w-1/2 bg-[#1b2b48]/50 backdrop-blur-sm border-l border-[#2e3b56]/50 p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Vocabulary</h3>
              <div className="text-sm text-white/70">
                <span className="font-medium">English → Arabic</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Display sentences with clickable words - NO POPUP here */}
              <div className="bg-[#111f3d]/70 backdrop-blur-sm rounded-lg p-6 border border-[#2e3b56]/70 shadow-lg">
                <h4 className="text-white font-medium mb-4">
                  Sentences with Clickable Words
                </h4>
                <p className="text-white/70 text-sm mb-4">
                  Click on any word to see its translation and contextual
                  meaning
                </p>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {dialogueLines.map((line) => (
                    <div
                      key={line.id}
                      className={`p-3 rounded-lg transition-all cursor-pointer border ${
                        activeLineId === line.id
                          ? "bg-primary/20 border-primary/30"
                          : "bg-white/5 hover:bg-white/10 border-[#2e3b56]/30"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs bg-[#0c1527] px-2 py-0.5 rounded text-white/70">
                          {formatTime(line.startTime)}
                        </span>
                        <button
                          className="text-xs bg-primary/20 text-primary-light px-2 py-1 rounded hover:bg-primary/30 transition-colors"
                          onClick={() =>
                            handleVocabularySegmentPlay(line.startTime)
                          }
                        >
                          Play
                        </button>
                      </div>
                      <p className="text-white leading-relaxed text-[0.95rem] tracking-tight">
                        {renderClickableWords(line.text)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guided Speaking Practice for Speaking mode */}
        {practiceMode === "speaking" && (
          <div className="w-full p-4">
            <GuidedSpeakingPractice
              dialogueLines={dialogueLines}
              onSeekToTime={seekToTime}
              onPauseVideo={pauseVideo}
              onPlayVideo={() => {
                if (playerRef.current && playerReady) {
                  playerRef.current.playVideo();
                  setIsPlaying(true);
                }
              }}
              onComplete={() => {
                togglePracticeMode("listening");
                setRecordingFeedback("Guided practice completed! Great job!");
              }}
              currentTime={currentTime}
              simpleFeedback={false}
              onMissingWords={addStruggledWords}
            />
          </div>
        )}
      </div>

      {/* Sentence translation popup */}
      {selectedSentence && (
        <div
          id="sentence-details-popup"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close popup when clicking on the backdrop (outside the popup content)
            if (e.target === e.currentTarget) {
              closeSentenceDetails();
            }
          }}
        >
          <div className="bg-[#1b2b48]/90 backdrop-blur-sm rounded-lg shadow-xl max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh] border border-[#2e3b56]/50">
            <button
              onClick={closeSentenceDetails}
              className="absolute top-3 right-3 text-white/50 hover:text-white bg-[#1b2b48]/60 hover:bg-[#1b2b48] p-2 rounded-full transition-all duration-200 group"
              aria-label="Close sentence details"
            >
              <X
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              Sentence Translation
            </h3>

            {selectedSentence.isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-white/70">جاري الحصول على الترجمة...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 border-b border-[#2e3b56]/50 pb-4">
                  <h4 className="text-lg font-medium text-white/90 mb-3">
                    Original Text
                  </h4>
                  <p className="text-white">{selectedSentence.original_text}</p>
                </div>

                <div className="mb-6 border-b border-[#2e3b56]/50 pb-4">
                  <h4 className="text-lg font-medium text-white/90 mb-3">
                    Arabic Translation
                  </h4>
                  <p
                    className="text-2xl font-bold text-primary-light mb-1 text-right"
                    dir="rtl"
                  >
                    {selectedSentence.translation}
                  </p>
                </div>

                {/* Contextual Elements Section */}
                {selectedSentence.contextual_elements &&
                  selectedSentence.contextual_elements.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-white/90 mb-3">
                        Key Phrases & Expressions
                      </h4>
                      <div className="space-y-4">
                        {selectedSentence.contextual_elements.map(
                          (element, index) => (
                            <div
                              key={index}
                              className="bg-primary/10 p-4 rounded-lg border border-primary/20"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-primary-light">
                                  {element.element}
                                </span>
                                <span
                                  className="font-bold text-primary-light text-right"
                                  dir="rtl"
                                >
                                  {element.translation}
                                </span>
                              </div>
                              <p className="text-white/70 text-right" dir="rtl">
                                {element.explanation}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Word details popup */}
      {selectedWord && (
        <div
          id="word-details-popup"
          className="animate-fadeIn fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center"
          onClick={(e) => {
            // Close popup when clicking on the backdrop (outside the popup content)
            if (e.target === e.currentTarget) {
              closeWordDetails();
            }
          }}
        >
          <div
            className="bg-gradient-to-b from-[#1b2b48]/95 to-[#0c1527]/95 backdrop-blur-lg rounded-xl shadow-2xl max-w-2xl w-[95%] md:w-[85%] p-6 border border-[#4d7efa]/30 overflow-y-auto max-h-[90vh] animate-scaleIn relative"
            style={{
              boxShadow: "0 0 30px rgba(77, 126, 250, 0.2)",
            }}
          >
            {/* Close button */}
            <button
              onClick={closeWordDetails}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-[#1b2b48]/60 hover:bg-[#1b2b48] p-2 rounded-full transition-all duration-200 group"
              aria-label="Close word details"
            >
              <X
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
            </button>

            {/* Word header */}
            <div className="mb-6 pb-4 border-b border-[#4d7efa]/20">
              <div className="flex items-center">
                <div className="mr-3 p-2 rounded-lg bg-[#4d7efa]/20 text-[#4d7efa]">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {selectedWord.word}
                </h3>
              </div>

              {selectedWord.is_phrasal && selectedWord.phrasal_form && (
                <div className="mt-2 pl-10 text-sm text-white/70">
                  {selectedWord.base_word &&
                  selectedWord.base_word !== selectedWord.word ? (
                    <>
                      Phrasal verb from{" "}
                      <span className="font-medium text-white/90">
                        &quot;{selectedWord.base_word}&quot;
                      </span>
                    </>
                  ) : (
                    <>
                      Phrasal verb:{" "}
                      <span className="font-medium text-white/90 italic">
                        &quot;{selectedWord.phrasal_form}&quot;
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedWord.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-14 w-14 border-3 border-[#4d7efa]/20 border-t-[#4d7efa] mb-6"></div>
                <p className="text-white/80 text-lg">
                  جاري الحصول على الترجمة...
                </p>
              </div>
            ) : (
              <>
                {/* General Translation Section */}
                <div className="mb-8">
                  <div className="flex items-center mb-3">
                    <h4 className="text-lg font-medium text-white/90">
                      {selectedWord.is_phrasal
                        ? `معنى "${
                            selectedWord.base_word || selectedWord.word
                          }" الأساسية`
                        : "معنى عام"}
                    </h4>
                    <div className="h-px flex-grow bg-[#4d7efa]/20 ml-3"></div>
                  </div>

                  <div className="bg-[#4d7efa]/10 rounded-lg p-4 border border-[#4d7efa]/20">
                    <p
                      className="text-2xl font-bold text-[#4d7efa] text-right"
                      dir="rtl"
                    >
                      {selectedWord.general_translation?.join(", ")}
                    </p>
                  </div>
                </div>

                {/* Contextual Meaning Section */}
                {selectedWord.contextual_translation && (
                  <div className="mb-8">
                    <div className="flex items-center mb-3">
                      <h4 className="text-lg font-medium text-white/90">
                        {selectedWord.is_phrasal
                          ? `معنى "${
                              selectedWord.phrasal_form || selectedWord.word
                            }" في السياق`
                          : "معنى فى النص"}
                      </h4>
                      <div className="h-px flex-grow bg-[#4d7efa]/20 ml-3"></div>
                    </div>

                    <div className="mb-4 p-3 bg-white/5 rounded-lg">
                      <div className="font-medium text-white/80 text-sm mb-1">
                        {selectedWord.is_phrasal
                          ? "Phrasal Expression:"
                          : "In Context:"}
                      </div>
                      <p className="text-white font-medium">
                        &quot;
                        {selectedWord.contextual_translation.full_phrase}
                        &quot;
                      </p>
                      <p
                        className="text-2xl font-bold text-[#4d7efa] text-right"
                        dir="rtl"
                      >
                        {selectedWord.contextual_translation.translation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Meaning Comparison Section - for all words */}
                {selectedWord.meaning_comparison && (
                  <div className="mb-8">
                    <div className="flex items-center mb-3">
                      <h4 className="text-lg font-medium text-white/90">
                        مقارنة المعاني
                      </h4>
                      <div className="h-px flex-grow bg-[#4d7efa]/20 ml-3"></div>
                    </div>

                    <div className="bg-[#e455c9]/10 p-4 rounded-lg border border-[#e455c9]/20">
                      <p
                        className="text-white/90 text-right leading-relaxed"
                        dir="rtl"
                      >
                        {selectedWord.meaning_comparison}
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional Example Section */}
                {selectedWord.additional_example && (
                  <div className="mb-8">
                    <div className="flex items-center mb-3">
                      <h4 className="text-lg font-medium text-white/90">
                        مثال اخر
                      </h4>
                      <div className="h-px flex-grow bg-[#4d7efa]/20 ml-3"></div>
                    </div>

                    <div className="bg-[#111f3d]/70 backdrop-blur-sm p-4 rounded-lg border border-[#4d7efa]/20">
                      <p className="text-white mb-3 italic">
                        &quot;{selectedWord.additional_example.english}&quot;
                      </p>
                      <p
                        className="text-[#4d7efa] text-right font-medium text-lg"
                        dir="rtl"
                      >
                        {selectedWord.additional_example.arabic}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resume video button at bottom of popup */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={resumeVideoPlayback}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center transition-all group"
                  >
                    <PlayCircle
                      size={20}
                      className="mr-2 group-hover:scale-110 transition-transform"
                    />
                    Resume Video
                  </button>
                </div>
              </>
            )}

            {/* Add animated accent elements for visual appeal */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4d7efa]/50 to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4d7efa]/50 to-transparent"></div>
          </div>
        </div>
      )}

      {/* Test mode */}
      {practiceMode === "test" && renderTestMode()}
    </div>
  );
}
