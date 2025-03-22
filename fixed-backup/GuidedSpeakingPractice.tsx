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

  const currentLine = dialogueLines[currentLineIndex];

  // Simplified record functionality
  const startRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setTranscript("This is a simulated transcript for testing");
      setCanProceed(true);
      setResult("correct");
    }, 3000);
  };

  // Start practice function
  const startPractice = () => {
    setAutoPlaying(true);

    // Play the current segment
    if (onSeekToTime && currentLine) {
      onSeekToTime(currentLine.startTime);
    }

    // Simulate listening completion and transition to recording
    setTimeout(() => {
      setAutoPlaying(false);
      setWaitingForSpeech(true);
    }, 3000);
  };

  // Handle moving to next sentence
  const handleNextSentence = () => {
    if (currentLineIndex < dialogueLines.length - 1) {
      // Move to next sentence
      setCurrentLineIndex((prev) => prev + 1);

      // Reset state
      setTranscript("");
      setResult(null);
      setAutoPlaying(false);
      setWaitingForSpeech(false);
      setCanProceed(false);

      // Auto-start practice for next sentence
      setTimeout(startPractice, 500);
    } else {
      // Practice complete
      setResult("complete");
      onComplete?.();
    }
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
                    Great job! You can proceed to the next sentence.
                  </span>
                </div>
              )}

              {result === "incorrect" && (
                <div className="flex items-center mb-2">
                  <XCircle size={20} className="mr-2 text-red-500" />
                  <span className="font-medium text-red-700">
                    Try again. Some words were not pronounced correctly.
                  </span>
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
