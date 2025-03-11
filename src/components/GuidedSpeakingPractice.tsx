"use client";

import { useState, useEffect, useRef } from "react";
import { DialogueLine } from "@/lib/types";
import {
  CheckCircle,
  XCircle,
  Mic,
  Play,
  ArrowRight,
  StopCircle,
  Headphones,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDeepgram } from "@/lib/contexts/DeepgramContext";

interface GuidedSpeakingPracticeProps {
  dialogueLines: DialogueLine[];
  onSeekToTime?: (time: number) => void;
  onComplete?: () => void;
  onPauseVideo?: () => void;
  onPlayVideo?: () => void;
  currentTime?: number;
  simpleFeedback?: boolean;
}

interface CorrectionHighlight {
  original: string;
  correction: string;
  type: "grammar" | "pronunciation" | "missing" | "extra";
  explanation: string;
}

export default function GuidedSpeakingPractice({
  dialogueLines,
  onSeekToTime,
  onComplete,
  onPauseVideo,
  onPlayVideo,
  currentTime = 0,
  simpleFeedback = false,
}: GuidedSpeakingPracticeProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<
    "correct" | "incorrect" | "complete" | null
  >(null);
  const [corrections, setCorrections] = useState<CorrectionHighlight[]>([]);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [waitingForSpeech, setWaitingForSpeech] = useState(false);
  const [missingWords, setMissingWords] = useState<string[]>([]);
  const [canProceed, setCanProceed] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number>(4);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecordedOnce, setHasRecordedOnce] = useState(false);

  // Refs for direct media handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartRecordingRef = useRef<NodeJS.Timeout | null>(null);

  const { disconnectFromDeepgram, error: deepgramError } = useDeepgram();

  const currentLine = dialogueLines[currentLineIndex];

  // Handle Deepgram errors
  useEffect(() => {
    if (deepgramError) {
      // log removed
      setRecordingError(deepgramError);
      setIsRecording(false);
      setWaitingForSpeech(true);
      setIsProcessing(false);

      // Clear the error after 3 seconds
      const errorTimeout = setTimeout(() => {
        setRecordingError(null);
      }, 3000);

      return () => clearTimeout(errorTimeout);
    } else {
      setRecordingError(null);
    }
  }, [deepgramError]);

  // Cleanup effect to clear all timers when component unmounts
  useEffect(() => {
    return () => {
      stopRecording();

      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
        autoPlayTimeoutRef.current = null;
      }

      if (autoStartRecordingRef.current) {
        clearTimeout(autoStartRecordingRef.current);
        autoStartRecordingRef.current = null;
      }
    };
  }, []);

  // Start recording function using native MediaRecorder
  const startRecording = async () => {
    if (mediaRecorderRef.current && !isRecording) {
      // Reset the transcript, waiting state and errors
      setTranscript("");
      setResult(null);
      setWaitingForSpeech(true);
      setRecordingError(null);
      setIsProcessing(false);
      audioChunksRef.current = [];

      try {
        // Request microphone access
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
            // log removed
            recorder = new MediaRecorder(stream);
          }
        } catch (e) {
          // log removed
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
          // MediaRecorder stopped
          setIsRecording(false);
          setIsProcessing(true); // Show processing indicator
          setHasRecordedOnce(true); // Mark that we've recorded once

          // Process the recorded audio
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/webm",
            });
            await processAudioBlob(audioBlob);
          } else {
            // log removed
            setWaitingForSpeech(true);
            setIsProcessing(false);
          }

          // Clean up
          stopMediaTracks();
        };

        // Handle recording errors
        recorder.onerror = (event) => {
          // log removed
          setRecordingError("Recording error occurred. Please try again.");
          setIsRecording(false);
          setIsProcessing(false);
          stopMediaTracks();
        };

        // Start recording
        recorder.start(100); // Get data every 100ms to monitor speech activity
        setIsRecording(true);
        setRecordingTimeLeft(15); // Max recording time: 15 seconds
        // Recording started

        // Set up a hidden countdown timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Create an audio analyzer to detect silence
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silenceStart: number | null = null;
        const SILENCE_THRESHOLD = 10; // Adjust based on testing
        const SILENCE_DURATION = 1500; // 1.5 seconds of silence before stopping

        const startTime = Date.now();
        timerIntervalRef.current = setInterval(() => {
          // Update the hidden countdown
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 15 - Math.floor(elapsed / 1000));
          setRecordingTimeLeft(remaining);

          // Check for silence (speech ended)
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // If below threshold, mark as silence
          if (average < SILENCE_THRESHOLD) {
            if (!silenceStart) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart > SILENCE_DURATION) {
              // If silence lasts for the duration, stop recording
              // Speech ended (silence detected), stopping recording
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              stopRecording();
              return;
            }
          } else {
            // Reset silence start if sound detected
            silenceStart = null;
          }

          // Stop if max time reached
          if (remaining <= 0) {
            // Max recording time reached
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            stopRecording();
          }
        }, 100);

        // Set maximum recording time as backup
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        recordingTimerRef.current = setTimeout(() => {
          // Max recording time reached
          stopRecording();
          recordingTimerRef.current = null;
        }, 15000); // 15 seconds maximum
      } catch (error) {
        // log removed
        setRecordingError(
          "Could not access microphone. Please check your browser permissions."
        );
        setIsRecording(false);
        setIsProcessing(false);
        stopMediaTracks();
      }
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all audio tracks in the media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.stop();
        });
      }
    }

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Clean up media tracks
  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // log removed
        }
      });
      mediaStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
  };

  // Process audio blob using Deepgram API with enhanced speech quality check
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      // Processing audio blob: audioBlob.size bytes

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
        // Transcription result: result.transcript
        setTranscript(result.transcript);

        // Evaluate the transcript
        setWaitingForSpeech(false);
        // Setting waitingForSpeech to false

        if (simpleFeedback) {
          // Enhanced check: If simple feedback mode but transcript is very short or empty, prompt retry
          if (result.transcript.split(/\s+/).length < 2) {
            // Too short transcript in simple mode, prompting retry
            setResult("incorrect");
            setCanProceed(false);
          } else {
            // In simple feedback mode with enough words, set result to correct
            setResult("correct");
            setCanProceed(true);
          }
        } else {
          // In detailed feedback mode, evaluate the transcript
          evaluateTranscript(result.transcript);
        }
      } else {
        setWaitingForSpeech(true);
        setResult("incorrect");
        setCanProceed(false);
      }
    } catch (error) {
      setIsProcessing(false);
      setWaitingForSpeech(true);
      setRecordingError("Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Balanced sentence duration estimation - enough time to complete but not excessively long
  const estimateSentenceDuration = (text: string): number => {
    // Calculate based on both character count and word count
    const words = text.split(/\s+/).length;
    const characters = text.length;

    // Use reasonable speaking rates
    const wordBasedTime = words / 2.2; // Balanced rate (not too slow, not too fast)
    const characterFactor = characters / 14; // Balanced rate

    // Combine both metrics with modest buffer
    const estimatedTime = Math.max(
      (wordBasedTime + characterFactor) / 2 + 0.8, // Modest buffer
      2.5 // Minimum 2.5 seconds
    );

    // Add small buffer (10%) for safety
    const bufferedTime = estimatedTime * 1.1;

    // Round to 1 decimal place
    return parseFloat(bufferedTime.toFixed(1));
  };

  // Monitor current time to detect when to pause at the end of a sentence
  useEffect(() => {
    if (!currentLine || !autoPlaying) return;

    // Make sure we have a valid currentTime
    if (typeof currentTime !== "number" || isNaN(currentTime)) return;

    // If we've reached the end time of the current sentence
    // Use a small buffer (0.2s) to ensure the sentence completes
    if (currentLine.endTime && currentTime >= currentLine.endTime + 0.2) {
      onPauseVideo?.();
      setAutoPlaying(false);
      setWaitingForSpeech(true);
    }
  }, [currentTime, currentLine, autoPlaying, onPauseVideo]);

  // Start practicing the current sentence
  const startPractice = () => {
    if (!currentLine) return;

    // If recording is active, stop it first
    if (isRecording) {
      stopRecording();
      return;
    }

    // Reset states
    setResult(null);
    setTranscript("");
    setCorrections([]);
    setMissingWords([]);
    setWaitingForSpeech(false);
    setCanProceed(false);
    setHasRecordedOnce(false); // Reset the recording flag when starting a new practice

    // Clear any existing timers
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }

    if (autoStartRecordingRef.current) {
      clearTimeout(autoStartRecordingRef.current);
      autoStartRecordingRef.current = null;
    }

    // Play the audio for the current sentence
    if (onSeekToTime && currentLine.startTime) {
      // Use our enhanced seekToTime function
      onSeekToTime(parseFloat(currentLine.startTime.toFixed(2)));

      // Seeking to timestamp for practice

      // Apply a small offset to make sure we catch the beginning of the line
      const preciseStartTime = parseFloat(currentLine.startTime.toFixed(2));

      // Use our enhanced seekToTime function
      onSeekToTime(preciseStartTime);

      // We don't need to call playVideo here as our improved seekToTime function handles it
      setAutoPlaying(true);

      // Estimate how long this sentence will take to play, with a more accurate calculation
      const estimatedDuration = estimateSentenceDuration(currentLine.text);

      // Set a timeout to pause after the estimated duration and prepare for recording
      autoPlayTimeoutRef.current = setTimeout(() => {
        // Auto-pausing after estimated duration: 2.5s
        onPauseVideo?.();
        setAutoPlaying(false);
        setWaitingForSpeech(true);

        // Start recording after a short delay to give user time to prepare
        autoStartRecordingRef.current = setTimeout(() => {
          // Auto-starting recording after listening
          startRecording();
        }, 1500);
      }, estimatedDuration * 1000);
    } else {
      // If no start time, just start recording directly after a short delay
      setWaitingForSpeech(true);
      autoStartRecordingRef.current = setTimeout(() => {
        console.log("Starting recording directly (no audio playback)");
        startRecording();
      }, 1500);
    }
  };

  // Evaluate the transcript against the expected sentence
  const evaluateTranscript = (transcriptText = transcript) => {
    if (!currentLine || !transcriptText) {
      console.log("Cannot evaluate: missing currentLine or transcript");
      return;
    }

    console.log("Evaluating transcript:", transcriptText);
    console.log("Against expected:", currentLine.text);

    // Normalize both strings for comparison (lowercase, remove punctuation)
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .trim();
    };

    const normalizedExpected = normalizeText(currentLine.text);
    const normalizedTranscript = normalizeText(transcriptText);

    // Perform word-by-word comparison with special handling for contractions
    const {
      matchedWords,
      incorrectWords,
      missingWords: missedWords,
      extraWords,
      similarity,
      wordOrderIssues,
    } = compareTexts(normalizedTranscript, normalizedExpected);

    console.log("Evaluation results:", {
      matchedWords,
      incorrectWords,
      missedWords,
      extraWords,
      similarity,
    });

    // Update missing words state
    setMissingWords(missedWords);

    // Create corrections array for highlighting
    const corrections: CorrectionHighlight[] = [
      ...incorrectWords.map((w) => ({
        original: w.said,
        correction: w.expected,
        type: "pronunciation" as const,
        explanation: `Incorrect: "${w.said}" (should be "${w.expected}")`,
      })),
      ...missedWords.map((word) => ({
        original: "",
        correction: word,
        type: "missing" as const,
        explanation: `Missed: "${word}"`,
      })),
      ...extraWords.map((word) => ({
        original: word,
        correction: "",
        type: "extra" as const,
        explanation: `Extra: "${word}"`,
      })),
    ];

    setCorrections(corrections);

    // Determine if the answer is correct enough based on missing words count
    const tooManyMissingWords = missedWords.length > 5;

    console.log(
      "Too many missing words?",
      tooManyMissingWords,
      "Missing words count:",
      missedWords.length
    );

    if (tooManyMissingWords) {
      // Too many missing words, ask user to try again
      console.log("Setting result to incorrect");
      setResult("incorrect");
      setCanProceed(false);
    } else {
      // Few or no missing words, user can proceed
      console.log("Setting result to correct");
      setResult("correct");
      setCanProceed(true);
    }

    // Ensure waitingForSpeech is false
    setWaitingForSpeech(false);
  };

  // Compare two texts word by word with special handling for contractions
  const compareTexts = (said: string, expected: string) => {
    // Handle contractions in both the expected and said text
    const expandContractions = (text: string): string => {
      return text
        .replace(/(\w+)'s/g, "$1 is")
        .replace(/(\w+)'re/g, "$1 are")
        .replace(/(\w+)'ve/g, "$1 have")
        .replace(/(\w+)'ll/g, "$1 will")
        .replace(/(\w+)'d/g, "$1 would")
        .replace(/(\w+)n't/g, "$1 not")
        .replace(/it's/g, "it is")
        .replace(/that's/g, "that is")
        .replace(/what's/g, "what is")
        .replace(/let's/g, "let us")
        .replace(/i'm/g, "i am")
        .replace(/won't/g, "will not")
        .replace(/can't/g, "can not")
        .replace(/don't/g, "do not")
        .replace(/doesn't/g, "does not");
    };

    // Create both contracted and expanded versions for comparison
    const expandedExpected = expandContractions(expected);
    const expandedSaid = expandContractions(said);

    // Split into words
    const saidWords = said.split(/\s+/);
    const expectedWords = expected.split(/\s+/);
    const expandedSaidWords = expandedSaid.split(/\s+/);
    const expandedExpectedWords = expandedExpected.split(/\s+/);

    const matchedWords: string[] = [];
    const incorrectWords: { said: string; expected: string }[] = [];
    const missingWords: string[] = [];
    let extraWords: string[] = [...saidWords]; // Start with all words as extra
    const wordOrderIssues: {
      word: string;
      expectedIndex: number;
      actualIndex: number;
    }[] = [];

    // First, handle contractions by creating a map of expanded forms
    const expandedFormsMap = new Map<string, string[]>();

    // For each expected word, store its expanded form
    expectedWords.forEach((word) => {
      const expanded = expandContractions(word).split(/\s+/);
      if (expanded.length > 1) {
        expandedFormsMap.set(word, expanded);
      }
    });

    // Check for expanded contractions in the said text
    expandedFormsMap.forEach((expandedWords, contractedWord) => {
      // Check if all parts of the expanded form appear consecutively in the said text
      for (let i = 0; i <= saidWords.length - expandedWords.length; i++) {
        const potentialMatch = saidWords.slice(i, i + expandedWords.length);
        const isMatch = potentialMatch.every(
          (word, index) =>
            word.toLowerCase() === expandedWords[index].toLowerCase()
        );

        if (isMatch) {
          // Found an expanded contraction match
          matchedWords.push(contractedWord);
          // Remove these words from extraWords
          potentialMatch.forEach((word) => {
            extraWords = extraWords.filter((w) => w !== word);
          });
          // Remove the contracted word from further processing
          expectedWords.forEach((word, index) => {
            if (word === contractedWord) {
              expectedWords[index] = "";
            }
          });
        }
      }
    });

    // For each remaining expected word, check if it's in the said words
    expectedWords
      .filter((word) => word !== "")
      .forEach((expectedWord, expectedIndex) => {
        // Check if the word is in the said words (exact match)
        const exactMatchIndex = saidWords.findIndex(
          (word) => word.toLowerCase() === expectedWord.toLowerCase()
        );

        if (exactMatchIndex !== -1) {
          // Exact match found
          matchedWords.push(expectedWord);
          extraWords = extraWords.filter(
            (w) => w !== saidWords[exactMatchIndex]
          );
        } else {
          // No exact match - check for similar words
          let bestMatch = "";
          let bestScore = 0;
          let bestIndex = -1;

          saidWords.forEach((saidWord, index) => {
            // Skip words that are already matched
            if (!extraWords.includes(saidWord)) return;

            const similarity = calculateWordSimilarity(saidWord, expectedWord);
            if (similarity > bestScore && similarity > 0.6) {
              // 60% similarity threshold
              bestScore = similarity;
              bestMatch = saidWord;
              bestIndex = index;
            }
          });

          if (bestScore > 0.8) {
            // 80% similarity is a good match
            matchedWords.push(expectedWord);
            // Remove from extraWords
            if (bestIndex !== -1) {
              extraWords = extraWords.filter((w) => w !== bestMatch);
            }
          } else {
            // No good match found - it's a missing word
            missingWords.push(expectedWord);
          }
        }
      });

    // Calculate overall similarity
    const totalWords = expectedWords.filter((word) => word !== "").length;
    const correctWords = matchedWords.length;
    const similarity = totalWords > 0 ? correctWords / totalWords : 0;

    return {
      matchedWords,
      incorrectWords,
      missingWords,
      extraWords,
      similarity,
      wordOrderIssues,
    };
  };

  // Calculate similarity between two words using Levenshtein distance
  const calculateWordSimilarity = (word1: string, word2: string): number => {
    if (word1 === word2) return 1;
    if (word1.length === 0 || word2.length === 0) return 0;

    // Simple Levenshtein distance implementation
    const track = Array(word2.length + 1)
      .fill(null)
      .map(() => Array(word1.length + 1).fill(null));

    for (let i = 0; i <= word1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= word2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= word2.length; j += 1) {
      for (let i = 1; i <= word1.length; i += 1) {
        const indicator = word1[i - 1] === word2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = track[word2.length][word1.length];
    const maxLength = Math.max(word1.length, word2.length);
    return 1 - distance / maxLength;
  };

  // Add a manual stop recording function
  const stopRecordingIfActive = () => {
    if (isRecording) {
      console.log("Manually stopping active recording");
      stopRecording();
      return false; // Indicate recording was active and stopped
    }
    return true; // Indicate no recording was active
  };

  // Handle moving to the next sentence
  const handleNextSentence = () => {
    // Clear any existing timers
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (autoStartRecordingRef.current) {
      clearTimeout(autoStartRecordingRef.current);
      autoStartRecordingRef.current = null;
    }

    // Stop recording if active before proceeding
    const canProceedImmediately = stopRecordingIfActive();
    if (!canProceedImmediately) {
      console.log(
        "Recording was active, waiting for it to stop before proceeding"
      );
      // We'll rely on the recording stop handler to continue
      return;
    }

    if (currentLineIndex < dialogueLines.length - 1) {
      // Immediately clear all state related to the current sentence
      setTranscript("");
      setResult(null);
      setCorrections([]);
      setMissingWords([]);
      setAutoPlaying(false);
      setWaitingForSpeech(false);
      setIsRecording(false);
      setHasRecordedOnce(false);
      setIsProcessing(false);
      setCanProceed(false);

      // Move to next sentence
      setCurrentLineIndex((prev) => {
        const nextIndex = prev + 1;
        // Start practice for the next sentence after a short delay
        setTimeout(() => {
          startPractice();
        }, 500);
        return nextIndex;
      });
    } else {
      // This is the last sentence, practice is complete
      console.log("Practice complete!");

      // Show congratulations message
      setResult("complete");
      setCanProceed(true);

      // Call the onComplete callback if provided
      onComplete?.();
    }
  };

  // Debug state
  useEffect(() => {
    console.log("Current state:", {
      isRecording,
      isProcessing,
      waitingForSpeech,
      result,
      hasRecordedOnce,
      canProceed,
      recordingError,
    });
  }, [
    isRecording,
    isProcessing,
    waitingForSpeech,
    result,
    hasRecordedOnce,
    canProceed,
    recordingError,
  ]);

  return (
    <div className="bg-[#111f3d]/70 backdrop-blur-sm rounded-lg p-6 border border-[#2e3b56]/70 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">
        Guided Speaking Practice
      </h2>

      {/* Headphones recommendation note */}
      <div className="mb-4 p-3 bg-[#4d7efa]/10 border border-[#4d7efa]/20 rounded-lg flex items-start">
        <Headphones className="text-[#4d7efa] h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-white/80">
          <span className="font-medium text-white">Tip:</span> For best
          recording quality, use headphones with a microphone.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-2">
          <span className="text-sm font-medium text-gray-500 mr-2">
            Sentence {currentLineIndex + 1} of {dialogueLines.length}
          </span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-600 rounded-full"
              style={{
                width: `${
                  ((currentLineIndex + 1) / dialogueLines.length) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-lg font-medium text-[#1565C0]">
            {currentLine?.text}
          </p>
        </div>

        <div className="flex flex-col items-center mb-4">
          {!autoPlaying &&
            !isRecording &&
            !isProcessing &&
            !result &&
            !waitingForSpeech && (
              <button
                onClick={startPractice}
                className="flex items-center justify-center px-6 py-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors mb-4 shadow-md"
              >
                <Play size={20} className="mr-2" />
                <span className="font-medium">Listen</span>
              </button>
            )}

          {autoPlaying && (
            <div className="flex items-center justify-center px-6 py-3 rounded-full bg-gray-100 text-gray-500 mb-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mr-2"
              >
                <Play size={20} />
              </motion.div>
              <span className="font-medium">Playing...</span>
            </div>
          )}

          {isRecording && (
            <div className="relative mb-4">
              <div className="relative rounded-full h-20 w-20 flex items-center justify-center bg-[#e455c9]">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-[#e455c9] opacity-50"
                ></motion.div>
                <Mic size={32} className="text-white" />
              </div>
              <button
                onClick={stopRecording}
                className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#1b2b48] text-white/80 p-2 rounded-full hover:bg-[#0c1527] transition-colors"
              >
                <StopCircle size={20} />
              </button>
              {/* Timer is hidden but still active in the background */}
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mb-2"
              />
              <p className="text-sm text-gray-600">Processing your speech...</p>
            </div>
          )}

          {/* Only show waiting for speech message if we're waiting and not recording, processing, or showing results */}
          {waitingForSpeech && !isRecording && !isProcessing && !result && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 w-full max-w-md">
              <div className="text-sm text-yellow-800 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-yellow-500 rounded-full mr-2"
                />
                <span>Get ready to speak when recording starts</span>
              </div>

              {recordingError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{recordingError}</p>
                </div>
              )}

              {/* Only show Record Again button if there was a recording error or the user failed the evaluation */}
              {hasRecordedOnce &&
                (result === "incorrect" || recordingError) && (
                  <button
                    onClick={() => {
                      if (!isRecording) {
                        startRecording();
                      }
                    }}
                    className="mt-2 w-full py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium text-sm flex items-center justify-center"
                  >
                    <Mic size={16} className="mr-2" />
                    Record Again
                  </button>
                )}
            </div>
          )}
        </div>

        {/* Result feedback */}
        {result && !isProcessing && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              result === "correct" ||
              result === "complete" ||
              (result === "incorrect" && canProceed)
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {result === "complete" ? (
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center mb-2">
                  <CheckCircle size={24} className="mr-2 text-green-500" />
                  <span className="font-medium text-green-700 text-lg">
                    Congratulations!
                  </span>
                </div>
                <p className="text-center text-green-700">
                  You&apos;ve successfully completed all the speaking practice
                  sentences.
                </p>
              </div>
            ) : simpleFeedback ? (
              <div className="flex items-center justify-center">
                {canProceed ? (
                  <>
                    <CheckCircle size={20} className="mr-2 text-green-500" />
                    <span className="font-medium text-green-700">
                      Well done!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="mr-2 text-red-500" />
                    <span className="font-medium text-red-700">
                      Too many missing words. Please try again.
                    </span>
                  </>
                )}
              </div>
            ) : (
              <>
                {canProceed ? (
                  <div className="flex items-center">
                    <CheckCircle size={20} className="mr-2 text-green-500" />
                    <span className="font-medium text-green-700">
                      Well done! You can proceed to the next sentence.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <XCircle size={20} className="mr-2 text-red-500" />
                    <span className="font-medium text-red-700">
                      Too many missing words. Please try again.
                    </span>
                  </div>
                )}
              </>
            )}

            {!canProceed && (
              <button
                onClick={() => {
                  // Clear result and allow user to try again
                  setResult(null);
                  setWaitingForSpeech(true);

                  // Start recording after a short delay
                  console.log(
                    "Try Again clicked, will start recording after delay"
                  );
                  if (autoStartRecordingRef.current) {
                    clearTimeout(autoStartRecordingRef.current);
                  }

                  autoStartRecordingRef.current = setTimeout(() => {
                    console.log("Auto-starting recording after Try Again");
                    startRecording();
                  }, 1500);
                }}
                className="mt-3 w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm flex items-center justify-center"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Next button - enabled when the user can proceed */}
        <div className="flex justify-between">
          {currentLineIndex > 0 && (
            <button
              onClick={() => {
                if (currentLineIndex > 0) {
                  // Stop any active recording
                  if (isRecording) {
                    stopRecording();
                  }

                  // Clear state
                  setTranscript("");
                  setResult(null);
                  setCorrections([]);
                  setMissingWords([]);
                  setAutoPlaying(false);
                  setWaitingForSpeech(false);
                  setCanProceed(false);
                  setHasRecordedOnce(false); // Reset the recording flag when moving to previous sentence

                  // Go to previous sentence
                  setCurrentLineIndex(currentLineIndex - 1);

                  // Auto-start the previous sentence
                  setTimeout(() => {
                    startPractice();
                  }, 300);
                }
              }}
              className="flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ArrowRight size={18} className="mr-2 transform rotate-180" />
              Previous
            </button>
          )}

          <div className="flex-1"></div>

          <button
            onClick={handleNextSentence}
            disabled={!canProceed || result === "complete"}
            className={`flex items-center px-4 py-2 rounded-lg ${
              canProceed && result !== "complete"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {currentLineIndex < dialogueLines.length - 1 ? "Next" : "Finish"}
            <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
