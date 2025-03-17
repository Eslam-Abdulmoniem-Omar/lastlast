"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Info, AlertCircle } from "lucide-react";
import { useDeepgram } from "@/lib/contexts/DeepgramContext";
import { motion } from "framer-motion";

interface SpeechRecorderProps {
  onTranscriptChange?: (transcript: string) => void;
  onTranscriptionComplete?: (transcription: string, accuracy: number) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  className?: string;
  iconSize?: number;
  showTranscript?: boolean;
  buttonStyle?: "circle" | "pill";
  showModelInfo?: boolean;
  showDetailedConfig?: boolean;
  disabled?: boolean;
  maxRecordingTime?: number;
  referenceSentence?: string;
  showComparison?: boolean;
}

export default function SpeechRecorder({
  onTranscriptChange,
  onTranscriptionComplete,
  onRecordingStateChange,
  className = "",
  iconSize = 24,
  showTranscript = true,
  buttonStyle = "circle",
  showModelInfo = false,
  showDetailedConfig = false,
  disabled = false,
  maxRecordingTime = 10000, // Default 10 seconds max recording time
  referenceSentence = "",
  showComparison = false,
}: SpeechRecorderProps) {
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [recordingFailed, setRecordingFailed] = useState(false);

  const {
    connectToDeepgram,
    disconnectFromDeepgram,
    realtimeTranscript,
    connectionState,
    error,
    config,
    isRecording,
  } = useDeepgram();

  // Update parent component with transcript changes
  useEffect(() => {
    if (realtimeTranscript) {
      onTranscriptChange?.(realtimeTranscript);
    }
  }, [realtimeTranscript, onTranscriptChange]);

  // Notify parent component of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  // Add a useImperativeHandle to expose methods to parent components
  useEffect(() => {
    // Force stop recording if the disabled prop changes to true while recording
    if (disabled && isRecording) {
      console.log("Component disabled while recording, forcing stop");
      disconnectFromDeepgram();
    }
  }, [disabled, isRecording, disconnectFromDeepgram]);

  // Add a useEffect to handle the maxRecordingTime prop
  useEffect(() => {
    if (isRecording) {
      // Start countdown timer for max recording time
      let remainingTime = maxRecordingTime;
      setTimeRemaining(remainingTime);

      const timerInterval = setInterval(() => {
        remainingTime -= 1000;
        setTimeRemaining(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(timerInterval);
          console.log("Max recording time reached, stopping recording");
          disconnectFromDeepgram();
        }
      }, 1000);

      setRecordingTimer(
        window.setTimeout(() => {
          console.log("Recording timeout reached, stopping recording");
          disconnectFromDeepgram();
        }, maxRecordingTime)
      );

      return () => {
        clearInterval(timerInterval);
        if (recordingTimer) {
          clearTimeout(recordingTimer);
        }
      };
    } else {
      setTimeRemaining(null);
      if (recordingTimer) {
        clearTimeout(recordingTimer);
        setRecordingTimer(null);
      }
    }
  }, [
    isRecording,
    maxRecordingTime,
    disconnectFromDeepgram,
    recordingTimer,
    setRecordingTimer,
    setTimeRemaining,
  ]);

  // Reset recording failed state when error changes
  useEffect(() => {
    if (error) {
      setRecordingFailed(true);
    } else {
      setRecordingFailed(false);
    }
  }, [error]);

  const toggleRecording = async () => {
    if (disabled) return;

    try {
      if (isRecording) {
        console.log("Stopping recording...");
        // Stop recording
        disconnectFromDeepgram();
        // Ensure parent components are notified immediately
        onRecordingStateChange?.(false);
      } else {
        console.log("Starting recording...");
        // Reset states before starting a new recording
        setRecordingFailed(false);

        // Start recording
        await connectToDeepgram();
        // Ensure parent components are notified immediately
        onRecordingStateChange?.(true);
      }
    } catch (err) {
      console.error("Error toggling recording:", err);
      setRecordingFailed(true);
      // Ensure parent components are notified of failure
      onRecordingStateChange?.(false);
    }
  };

  // Format remaining time as MM:SS
  const formatTimeRemaining = (milliseconds: number): string => {
    if (!milliseconds) return "0s";
    const seconds = Math.floor(milliseconds / 1000);
    return `${seconds}s`;
  };

  // Button styles based on the buttonStyle prop
  const getButtonClasses = () => {
    const baseClasses = `flex items-center justify-center transition-colors duration-200 ${className}`;

    if (buttonStyle === "pill") {
      return `${baseClasses} px-4 py-2 rounded-full ${
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : recordingFailed
          ? "bg-red-100 text-red-500 hover:bg-red-200"
          : isRecording
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-blue-500 hover:bg-blue-600 text-white"
      }`;
    }

    return `${baseClasses} p-3 rounded-full ${
      disabled
        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
        : recordingFailed
        ? "bg-red-100 text-red-500 hover:bg-red-200"
        : isRecording
        ? "bg-red-500 hover:bg-red-600 text-white"
        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
    }`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        <button
          onClick={toggleRecording}
          className={getButtonClasses()}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          disabled={disabled}
          data-recording-state={isRecording ? "recording" : "idle"}
        >
          {buttonStyle === "pill" && (
            <span className="mr-2 font-medium">
              {isRecording ? "Stop Recording" : "Start Recording"}
            </span>
          )}

          {recordingFailed ? (
            <AlertCircle size={iconSize} />
          ) : isRecording ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <MicOff size={iconSize} />
            </motion.div>
          ) : (
            <Mic size={iconSize} />
          )}
        </button>

        {showDetailedConfig && !disabled && (
          <button
            onClick={() => setShowConfigDetails(!showConfigDetails)}
            className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            aria-label="Show configuration details"
          >
            <Info size={16} />
          </button>
        )}
      </div>

      {isRecording && !disabled && (
        <div className="mt-2 flex flex-col items-center">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>
            <span className="text-xs text-gray-500">
              Recording with Nova-2 model
            </span>
          </div>
          {timeRemaining !== null && (
            <div className="mt-1 text-xs font-mono text-gray-500">
              Time left: {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>
      )}

      {recordingFailed && !disabled && (
        <div className="mt-2 text-xs text-red-500">
          Recording failed. Please try again.
        </div>
      )}

      {showModelInfo && !isRecording && !recordingFailed && !disabled && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">
            Using Deepgram Nova-2 model
          </span>
        </div>
      )}

      {showConfigDetails && showDetailedConfig && !disabled && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 w-full max-w-xs">
          <h4 className="font-medium mb-1">Deepgram Configuration:</h4>
          <ul className="space-y-1">
            <li>
              <span className="font-medium">Model:</span> {config.model}
            </li>
            <li>
              <span className="font-medium">Language:</span> {config.language}
            </li>
            <li>
              <span className="font-medium">Punctuation:</span>{" "}
              {config.punctuate ? "Enabled" : "Disabled"}
            </li>
            <li>
              <span className="font-medium">Smart Formatting:</span>{" "}
              {config.smartFormat ? "Enabled" : "Disabled"}
            </li>
            <li>
              <span className="font-medium">Speaker Diarization:</span>{" "}
              {config.diarize ? "Enabled" : "Disabled"}
            </li>
          </ul>
        </div>
      )}

      {error && !disabled && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {showTranscript && realtimeTranscript && !disabled && (
        <div className="mt-4 p-4 w-full bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Transcript:</p>
          <p className="text-gray-600">{realtimeTranscript}</p>
        </div>
      )}
    </div>
  );
}
