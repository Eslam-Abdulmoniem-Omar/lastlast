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
} from "lucide-react";
import { motion } from "framer-motion";

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
  type: "grammar" | "pronunciation" | "missing" | "extra" | "correct";
  explanation: string;
}

// First, update the ResultType to include the error state
type ResultType = "correct" | "incorrect" | "complete" | "error" | null;

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
  const [result, setResult] = useState<ResultType>(null);
  const [corrections, setCorrections] = useState<CorrectionHighlight[]>([]);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [waitingForSpeech, setWaitingForSpeech] = useState(false);
  const [missingWords, setMissingWords] = useState<string[]>([]);
  const [canProceed, setCanProceed] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState<number>(4);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRecordedOnce, setHasRecordedOnce] = useState(false);
  const [highConfidence, setHighConfidence] = useState(false);

  // Refs for direct media handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartRecordingRef = useRef<NodeJS.Timeout | null>(null);

  const currentLine = dialogueLines[currentLineIndex];

  // Stop media tracks helper function
  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
  };

  // Process audio blob using Google Cloud Speech-to-Text API
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      console.log("Processing audio blob:", audioBlob.size, "bytes");
      setIsProcessing(true);

      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Try the Google Cloud Speech-to-Text API first
      try {
        console.log("Sending audio to Google Cloud Speech API");
        // Send the audio to our Google Cloud Speech-to-Text API endpoint
        const response = await fetch("/api/google-speech/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(
            `Google API error: ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        console.log("Google Cloud Speech API result:", result);

        if (result.transcript && result.transcript.trim() !== "") {
          console.log("Transcription result:", result.transcript);

          // Extract alternative transcripts if available
          const alternatives = result.alternatives || [];
          const confidence = result.confidence || 0;

          // Set primary transcript
          const trimmedTranscript = result.transcript.trim();
          setTranscript(trimmedTranscript);
          setWaitingForSpeech(false);

          // STRONGER VALIDATION: Check if transcript is empty or too short
          if (!trimmedTranscript || trimmedTranscript.length < 3) {
            console.log("Empty or extremely short transcript detected");
            setResult("error");
            setRecordingError("No speech was detected. Please try again.");
            setWaitingForSpeech(true);
            return;
          }

          // Check if transcript is too short in terms of words
          const words = trimmedTranscript.split(/\s+/);
          if (words.length < 2) {
            console.log("Too few words detected:", trimmedTranscript);
            setResult("error");
            setRecordingError("Not enough words detected. Please try speaking the full sentence.");
            setWaitingForSpeech(true);
            return;
          }

          // COMPARE: Verify the transcript contains at least one word from the expected sentence
          const expectedWords = currentLine.text.toLowerCase().split(/\s+/);
          const hasMatchingWord = words.some((word: string) => 
            expectedWords.some((expected: string) => expected.includes(word) || word.includes(expected))
          );
          
          if (!hasMatchingWord && words.length < 4) {
            console.log("No matching words found in the transcript");
            setResult("error");
            setRecordingError("Your speech didn't match the sentence. Please try again.");
            setWaitingForSpeech(true);
            return;
          }

          // If confidence is high enough (0.85 or higher), immediately set as correct
          if (confidence >= 0.85) {
            console.log(
              `High confidence score (${confidence}): setting result to correct`
            );
            setResult("correct");
            setCanProceed(true);
            setHighConfidence(true);
            return;
          }

          // Otherwise, proceed with normal evaluation
          if (simpleFeedback) {
            // In simple feedback mode, just set result to correct and allow proceeding
            console.log("Simple feedback mode: setting result to correct");
            setResult("correct");
            setCanProceed(true);
          } else {
            // In detailed feedback mode, evaluate the transcript with alternatives
            console.log(
              "Detailed feedback mode: evaluating transcript with alternatives"
            );
            evaluateTranscript(result.transcript, alternatives);
          }
          return;
        } else {
          console.warn(
            "Google Cloud Speech API returned empty transcript, falling back to backup API"
          );
        }
      } catch (googleApiError) {
        console.error("Error with Google Cloud Speech API:", googleApiError);
        console.log("Falling back to backup speech-to-text API...");
      }

      // Fall back to test API if Google Cloud API fails
      console.log("Trying backup speech API endpoint");
      const fallbackResponse = await fetch("/api/speech-test", {
        method: "POST",
        body: formData,
      });

      if (!fallbackResponse.ok) {
        throw new Error(
          `Server responded with ${fallbackResponse.status}: ${fallbackResponse.statusText}`
        );
      }

      const fallbackResult = await fallbackResponse.json();

      if (
        fallbackResult.transcript &&
        fallbackResult.transcript.trim() !== ""
      ) {
        console.log(
          "Fallback transcription result:",
          fallbackResult.transcript
        );

        // Extract alternative transcripts and confidence if available
        const fallbackAlternatives = fallbackResult.alternatives || [];
        const fallbackConfidence = fallbackResult.confidence || 0;

        // Set primary transcript
        const trimmedTranscript = fallbackResult.transcript.trim();
        setTranscript(trimmedTranscript);
        setWaitingForSpeech(false);

        // STRONGER VALIDATION: Check if transcript is empty or too short
        if (!trimmedTranscript || trimmedTranscript.length < 3) {
          console.log("Empty or extremely short transcript detected");
          setResult("error");
          setRecordingError("No speech was detected. Please try again.");
          setWaitingForSpeech(true);
          return;
        }

        // Check if transcript is too short in terms of words
        const words = trimmedTranscript.split(/\s+/);
        if (words.length < 2) {
          console.log("Too few words detected:", trimmedTranscript);
          setResult("error");
          setRecordingError("Not enough words detected. Please try speaking the full sentence.");
          setWaitingForSpeech(true);
          return;
        }

        // COMPARE: Verify the transcript contains at least one word from the expected sentence
        const expectedWords = currentLine.text.toLowerCase().split(/\s+/);
        const hasMatchingWord = words.some((word: string) => 
          expectedWords.some((expected: string) => expected.includes(word) || word.includes(expected))
        );
        
        if (!hasMatchingWord && words.length < 4) {
          console.log("No matching words found in the transcript");
          setResult("error");
          setRecordingError("Your speech didn't match the sentence. Please try again.");
          setWaitingForSpeech(true);
          return;
        }

        // If confidence is high enough (0.85 or higher), immediately set as correct
        if (fallbackConfidence >= 0.85) {
          console.log(
            `High confidence score (${fallbackConfidence}): setting result to correct`
          );
          setResult("correct");
          setCanProceed(true);
          setHighConfidence(true);
          return;
        }

        // Otherwise, proceed with normal evaluation
        if (simpleFeedback) {
          // In simple feedback mode, just set result to correct and allow proceeding
          console.log("Simple feedback mode: setting result to correct");
          setResult("correct");
          setCanProceed(true);
        } else {
          // In detailed feedback mode, evaluate the transcript with alternatives
          console.log(
            "Detailed feedback mode: evaluating transcript with alternatives"
          );
          evaluateTranscript(fallbackResult.transcript, fallbackAlternatives);
        }
      } else {
        throw new Error("No transcription result from either API");
      }
    } catch (error) {
      console.error("Error processing speech:", error);
      setRecordingError("Error processing your speech. Please try again.");
      setWaitingForSpeech(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Evaluate the transcript against the expected sentence
  const evaluateTranscript = (
    userTranscript: string,
    alternativeTranscripts?: string[]
  ) => {
    if (!currentLine) return;

    // Normalize the expected text (keep contractions, remove other punctuation)
    const normalizedExpected = currentLine.text
      .toLowerCase()
      .replace(/[.,?!;:]/g, "") // Remove punctuation except apostrophes
      .trim();

    const expectedWords = normalizedExpected.split(/\s+/).filter(Boolean);

    // Process all transcripts (main + alternatives) for the best match
    const allTranscripts = [userTranscript];
    if (alternativeTranscripts?.length) {
      allTranscripts.push(...alternativeTranscripts);
    }

    let bestMatchScore = 0;
    let bestMatchTranscript = userTranscript;
    let bestCorrections: CorrectionHighlight[] = [];
    let bestMissingWords: string[] = [];

    // At the beginning of the evaluateTranscript function, add this check:
    // Check if the transcript is empty or just whitespace
    if (!userTranscript || !userTranscript.trim()) {
      console.log("Empty transcript in evaluateTranscript");
      setRecordingError("No speech was detected. Please try again.");
      setWaitingForSpeech(true);
      return;
    }

    // Also check if there are too few words
    const wordsInTranscript = userTranscript.trim().split(/\s+/).length;
    const minRequiredWords = Math.max(
      1,
      Math.floor(expectedWords.length * 0.2)
    );

    if (wordsInTranscript < minRequiredWords) {
      console.log(
        `Too few words detected (${wordsInTranscript}/${expectedWords.length})`
      );
      setRecordingError(
        "Too few words detected. Please try speaking the full sentence."
      );
      setWaitingForSpeech(true);
      return;
    }

    for (const transcript of allTranscripts) {
      const normalizedTranscript = transcript
        .toLowerCase()
        .replace(/[.,?!;:]/g, "")
        .trim();
      const transcriptWords = normalizedTranscript.split(/\s+/).filter(Boolean);

      // Align words using a simple dynamic matching approach
      const corrections: CorrectionHighlight[] = [];
      const missing: string[] = [];
      let matchCount = 0;
      let i = 0; // Index for expectedWords
      let j = 0; // Index for transcriptWords

      while (i < expectedWords.length || j < transcriptWords.length) {
        const expectedWord = expectedWords[i] || "";
        const spokenWord = transcriptWords[j] || "";

        if (!expectedWord && spokenWord) {
          // Extra word spoken
          corrections.push({
            original: spokenWord,
            correction: "",
            type: "extra",
            explanation: "You added an extra word.",
          });
          j++;
        } else if (!spokenWord && expectedWord) {
          // Missing word
          corrections.push({
            original: "",
            correction: expectedWord,
            type: "missing",
            explanation: "You missed this word.",
          });
          missing.push(expectedWord);
          i++;
        } else {
          // Compare words
          const distance = levenshteinDistance(expectedWord, spokenWord);
          const isContraction = expectedWord.includes("'");

          if (
            expectedWord === spokenWord ||
            (distance <= (isContraction ? 2 : 1) && // More leniency for contractions
              spokenWord.length >= expectedWord.length * 0.7) // Avoid over-matching short words
          ) {
            matchCount++;
            corrections.push({
              original: spokenWord,
              correction: expectedWord,
              type: "correct",
              explanation: "Good job!",
            });
            i++;
            j++;
          } else {
            // Check if it's a pronunciation error or mismatch
            if (spokenWord && distance <= 3) {
              corrections.push({
                original: spokenWord,
                correction: expectedWord,
                type: "pronunciation",
                explanation: "Check your pronunciation.",
              });
            } else {
              corrections.push({
                original: "",
                correction: expectedWord,
                type: "missing",
                explanation: "You missed this word.",
              });
              missing.push(expectedWord);
            }
            i++;
            j++;
          }
        }
      }

      // Calculate score (percentage of expected words matched)
      const matchPercentage =
        expectedWords.length > 0
          ? (matchCount / expectedWords.length) * 100
          : 0;

      if (matchPercentage > bestMatchScore) {
        bestMatchScore = matchPercentage;
        bestMatchTranscript = transcript;
        bestCorrections = corrections;
        bestMissingWords = missing;
      }
    }

    // Update state with best match
    setTranscript(bestMatchTranscript);
    setCorrections(bestCorrections);
    setMissingWords(bestMissingWords);

    // UPDATED LOGIC: Determine if we should show positive feedback
    const tooManyMissingWords = bestMissingWords.length > 3;

    // Adjust threshold based on mode
    const threshold = simpleFeedback ? 40 : 70; // Higher threshold for detailed mode

    // Give positive feedback if score is above threshold OR if there are 3 or fewer missing words
    if (bestMatchScore >= threshold || !tooManyMissingWords) {
      setResult("correct");
      setCanProceed(true);

      // Set high confidence for positive reinforcement when 3 or fewer missing words
      if (!tooManyMissingWords && bestMissingWords.length > 0) {
        setHighConfidence(true);
      }
    } else {
      // Only show negative feedback if there are more than 3 missing words
      setResult("incorrect");
      setCanProceed(false);
    }

    console.log("Evaluation:", {
      expected: normalizedExpected,
      transcript: bestMatchTranscript,
      score: bestMatchScore,
      corrections: bestCorrections,
      missing: bestMissingWords,
      tooManyMissingWords,
      showPositiveFeedback: bestMatchScore >= threshold || !tooManyMissingWords,
    });
  };

  // Start practice function
  const startPractice = () => {
    setAutoPlaying(true);

    // Play the current segment
    if (onSeekToTime && currentLine) {
      onSeekToTime(currentLine.startTime);
      onPlayVideo?.();
    }

    // After 3 seconds (or a calculated duration based on sentence length), switch to recording mode
    const playDuration = Math.max(3000, currentLine?.text.length * 80 || 3000);

    autoPlayTimeoutRef.current = setTimeout(() => {
      setAutoPlaying(false);
      setWaitingForSpeech(true);
      onPauseVideo?.();

      // Optionally auto-start recording after a delay
      if (autoStartRecordingRef.current) {
        clearTimeout(autoStartRecordingRef.current);
      }

      autoStartRecordingRef.current = setTimeout(() => {
        if (waitingForSpeech && !isRecording && !result) {
          startRecording();
        }
      }, 1500);
    }, playDuration);
  };

  // Record functionality
  const startRecording = async () => {
    // Stop any active recording first
    stopRecordingIfActive();

    // Reset state
    audioChunksRef.current = [];
    setTranscript("");
    setCanProceed(false);
    setResult(null);
    setCorrections([]);
    setMissingWords([]);

    try {
      console.log("Requesting media permissions...");

      // Request permissions to record audio
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
        setIsProcessing(true); // Show processing indicator
        setHasRecordedOnce(true); // Mark that we've recorded once

        // Process the recorded audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          await processAudioBlob(audioBlob);
        } else {
          console.warn("No audio data captured");
          setWaitingForSpeech(true);
          setIsProcessing(false);
        }

        // Clean up
        stopMediaTracks();
      };

      // Handle recording errors
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setRecordingError("Recording error occurred. Please try again.");
        setIsRecording(false);
        setIsProcessing(false);
        stopMediaTracks();
      };

      // Start recording
      recorder.start();
      setIsRecording(true);
      setRecordingTimeLeft(4);
      console.log("Recording started");

      // Set up countdown timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Automatically stop recording after a timeout
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }

      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 4000); // 4 seconds

      // Update the countdown timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError(
        "Could not access microphone. Please check permissions."
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");

    try {
      // Stop the media recorder if active
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        console.log("MediaRecorder stopped by user");
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

      // Update UI state
      setIsRecording(false);
    } catch (error) {
      console.error("Error stopping recording:", error);
      setIsRecording(false);
    }
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

  // Handle moving to next sentence
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
    stopRecordingIfActive();

    if (currentLineIndex < dialogueLines.length - 1) {
      // Move to next sentence
      setCurrentLineIndex((prev) => prev + 1);

      // Reset state
      setTranscript("");
      setResult(null);
      setCorrections([]);
      setMissingWords([]);
      setAutoPlaying(false);
      setWaitingForSpeech(false);
      setCanProceed(false);
      setHasRecordedOnce(false);
      setIsProcessing(false);
      setHighConfidence(false);

      // Auto-start practice for next sentence
      setTimeout(startPractice, 500);
    } else {
      // Practice complete
      setResult("complete");
      onComplete?.();
    }
  };

  // Cleanup effect to clear all timers when component unmounts
  useEffect(() => {
    return () => {
      stopRecording();
      stopMediaTracks();

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

  // Add the levenshteinDistance function
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Guided Speaking Practice</h2>

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

        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <p className="text-lg">{currentLine?.text || "No line available"}</p>
        </div>

        <div className="flex flex-col items-center mb-4">
          {!autoPlaying && !isRecording && !result && !waitingForSpeech && (
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
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Mic size={32} className="text-white" />
              </motion.div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow text-xs font-medium text-gray-700">
                Recording... {recordingTimeLeft || 0}s
              </div>
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

              <button
                onClick={() => {
                  if (!isRecording) {
                    startRecording();
                  }
                }}
                className="mt-2 w-full py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium text-sm flex items-center justify-center"
              >
                <Mic size={16} className="mr-2" />
                Record Now
              </button>
            </div>
          )}

          {result && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4 w-full max-w-md">
              {result === "correct" && (
                <div className="flex items-center mb-2">
                  <CheckCircle size={20} className="mr-2 text-green-500" />
                  <span className="font-medium text-green-700">
                    {highConfidence
                      ? "Well done! Your pronunciation was excellent!"
                      : "Well done! You can continue to the next sentence."}
                  </span>
                </div>
              )}

              {result === "incorrect" && (
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <XCircle size={20} className="mr-2 text-red-500" />
                    <span className="font-medium text-red-700">
                      Try again. Some words were not pronounced correctly.
                    </span>
                  </div>

                  {missingWords.length > 0 && missingWords.length <= 3 && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-700 mb-1">
                        Missing or mispronounced words:
                      </p>
                      <p className="text-sm text-gray-700">
                        {missingWords.join(", ")}
                      </p>
                    </div>
                  )}

                  <div className="flex mt-3 gap-2">
                    <button
                      onClick={() => {
                        setWaitingForSpeech(true);
                        setResult(null);
                        // Auto-start recording after delay
                        setTimeout(() => {
                          startRecording();
                        }, 1000);
                      }}
                      className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm flex items-center justify-center"
                    >
                      Try Again
                    </button>

                    {missingWords.length <= 3 && (
                      <button
                        onClick={handleNextSentence}
                        className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm flex items-center justify-center"
                      >
                        Continue Anyway
                      </button>
                    )}
                  </div>
                </div>
              )}

              {result === "complete" && (
                <div className="flex items-center mb-2">
                  <CheckCircle size={24} className="mr-2 text-green-500" />
                  <span className="font-medium text-green-700 text-lg">
                    Practice complete! You've finished all sentences.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          {currentLineIndex > 0 && (
            <button
              onClick={() => {
                // Go to previous sentence
                setCurrentLineIndex((prev) => prev - 1);
                // Reset state
                setTranscript("");
                setResult(null);
                setAutoPlaying(false);
                setWaitingForSpeech(false);
                setCanProceed(false);
                // Auto-start practice
                setTimeout(startPractice, 300);
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
