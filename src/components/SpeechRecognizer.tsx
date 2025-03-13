"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, StopCircle, Play, Loader2 } from "lucide-react";

// TypeScript definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognizerProps {
  referenceSentence?: string;
  onTranscriptionComplete?: (transcription: string, accuracy?: number) => void;
  onError?: (error: string) => void;
  showComparison?: boolean;
}

export default function SpeechRecognizer({
  referenceSentence = "",
  onTranscriptionComplete,
  onError,
  showComparison = true,
}: SpeechRecognizerProps) {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWebSpeechSupported, setIsWebSpeechSupported] = useState<
    boolean | null
  >(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check if Web Speech API is supported on component mount
  useEffect(() => {
    const isSupported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsWebSpeechSupported(isSupported);

    if (isSupported) {
      console.log("Web Speech API is supported in this browser");
    } else {
      console.log("Web Speech API is not supported in this browser");
    }

    return () => {
      stopRecording();
    };
  }, []);

  // Update the error setter to also call the onError callback
  const setErrorWithCallback = (errorMessage: string | null) => {
    setError(errorMessage);
    if (errorMessage && onError) {
      onError(errorMessage);
    }
  };

  // Effect to handle recording state changes
  useEffect(() => {
    if (isRecording) {
      startRecording().catch((error) => {
        console.error("Failed to start recording:", error);
        setIsRecording(false);
        setErrorWithCallback("Failed to start recording. Please try again.");
      });
    } else if (mediaRecorderRef.current) {
      stopRecording();
    }

    // Cleanup function
    return () => {
      if (mediaRecorderRef.current || mediaStreamRef.current) {
        stopRecording();
      }
    };
  }, [isRecording]);

  // Start recording function
  const startRecording = async () => {
    try {
      // Reset states
      setTranscription("");
      setInterimTranscript("");
      setIsProcessing(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setErrorWithCallback(null);
      audioChunksRef.current = [];

      console.log("Starting recording...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      // Handle data available event
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop event
      recorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");

        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Process the recording
        await processRecording(audioBlob);
      };

      // Setup Web Speech API if supported
      if (isWebSpeechSupported) {
        setupWebSpeechRecognition();
      }

      // Start recording
      recorder.start(1000);
      setIsRecording(true);
      console.log("MediaRecorder started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorWithCallback(
        "Could not access microphone. Please check your browser permissions."
      );
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (isRecording) {
      console.log("Stopping recording...");

      // Stop Speech Recognition if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          console.error("Error stopping Speech Recognition:", e);
        }
      }

      // Stop MediaRecorder
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping MediaRecorder:", e);
        }
      }

      // Stop media tracks
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

      setIsRecording(false);
    }
  };

  // Setup Web Speech API recognition
  const setupWebSpeechRecognition = () => {
    try {
      // Try to get the appropriate SpeechRecognition constructor
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error("Web Speech API not supported in this browser");
        setIsWebSpeechSupported(false);
        return;
      }

      console.log("Creating SpeechRecognition instance");
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      // Handle results
      recognition.onresult = (event: any) => {
        console.log("Speech recognition result received", event.results.length);
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + " ";
          } else {
            interimText += transcript;
          }
        }

        // Update the final transcription immediately when we have final text
        if (finalText) {
          console.log("Final text received:", finalText);
          setTranscription((prev) => {
            const newText = prev
              ? `${prev} ${finalText.trim()}`
              : finalText.trim();
            return newText;
          });
        }

        // Always update the interim transcription for immediate feedback
        console.log("Interim text:", interimText);
        setInterimTranscript(interimText);
      };

      // Handle recognition ending
      recognition.onend = () => {
        console.log("Speech recognition ended");
        // If we stopped recording intentionally, don't restart
        if (isRecording) {
          // Try to restart recognition
          try {
            recognition.start();
            console.log("Restarted speech recognition");
          } catch (e) {
            console.error("Could not restart speech recognition:", e);
          }
        }
      };

      // Handle errors
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorWithCallback(
            "Microphone access denied. Please check your permissions."
          );
        } else if (event.error === "network") {
          console.error("Network error in speech recognition");
        } else {
          console.error("General speech recognition error:", event);
        }
      };

      // Start recognition
      try {
        recognition.start();
        console.log("Web Speech Recognition started");
      } catch (e) {
        console.error("Error starting Web Speech Recognition:", e);
        setIsWebSpeechSupported(false);
      }
    } catch (e) {
      console.error("Error initializing Web Speech Recognition:", e);
      setIsWebSpeechSupported(false);
    }
  };

  // Process recording and send to API if needed
  const processRecording = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // If Web Speech already provided a transcription, use it
      if (transcription) {
        console.log("Using Web Speech API transcription:", transcription);
        if (onTranscriptionComplete) {
          onTranscriptionComplete(transcription);
        }
        setIsProcessing(false);
        return;
      }

      // If Web Speech API failed to provide a transcription, use our server API
      console.log(
        "Web Speech API transcription not available, using server API"
      );

      // Prepare form data with both audio and any transcript we might have from Web Speech API
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // Always send any transcript we have from Web Speech API, even if partial
      const webSpeechText = transcription || interimTranscript || "";
      if (webSpeechText) {
        console.log("Including Web Speech API transcript:", webSpeechText);
        formData.append("webSpeechTranscript", webSpeechText);
      }

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("API transcription result:", result);

      // Set the transcription from the API and make sure it's visible
      const apiTranscript = result.transcript || "";
      setTranscription(apiTranscript);
      console.log("Setting transcription to:", apiTranscript);

      // Call the callback if provided
      if (onTranscriptionComplete) {
        onTranscriptionComplete(apiTranscript);
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      setErrorWithCallback("Failed to process speech. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Play recorded audio
  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  // Render the component
  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-3 text-red-500 bg-red-50 rounded-md border border-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isWebSpeechSupported === false && (
        <div className="p-3 text-yellow-700 bg-yellow-50 rounded-md border border-yellow-200">
          <strong>Notice:</strong> Web Speech API is not supported in this
          browser. Using server-based transcription instead.
        </div>
      )}

      <div className="flex flex-col space-y-2">
        {referenceSentence && (
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Reference:</p>
            <p className="text-base">{referenceSentence}</p>
          </div>
        )}

        {/* Enhanced transcription area with clear visual indicators */}
        <div
          className={`p-4 rounded-md border transition-all duration-300 ${
            isRecording
              ? "bg-blue-50 border-blue-300 shadow-sm"
              : "bg-gray-50 border-gray-200"
          }`}
          style={{ minHeight: "80px" }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 flex items-center">
              {isRecording && (
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
              )}
              {isRecording ? "Listening in real-time..." : "Your speech:"}
            </p>
            {isRecording && (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-200"></div>
              </div>
            )}
          </div>

          <div
            className={`p-3 rounded-md ${
              isRecording ? "bg-white border border-blue-100" : ""
            }`}
            style={{ minHeight: "60px" }}
          >
            {/* Final transcript */}
            {transcription && (
              <p className="text-base font-medium mb-2">{transcription}</p>
            )}

            {/* Interim transcript (what the user is currently saying) with increased visibility */}
            {isRecording && interimTranscript && (
              <div className="mt-1">
                <p className="text-base text-blue-600 italic animate-pulse">
                  {interimTranscript}
                </p>
              </div>
            )}

            {/* Placeholder text when nothing is being said */}
            {!transcription && !interimTranscript && (
              <p className="text-base text-gray-400">
                {isRecording
                  ? "Speak now... your words will appear here"
                  : "No speech detected yet."}
              </p>
            )}
          </div>

          {isRecording && (
            <p className="mt-2 text-xs text-blue-500 text-center">
              Speech recognition is active - speak clearly into your microphone
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setIsRecording(!isRecording)}
          disabled={isProcessing}
          className={`flex items-center justify-center px-4 py-2 rounded-md font-medium ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          } transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <>
              <StopCircle className="w-5 h-5 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </>
          )}
        </button>

        {audioUrl && !isRecording && !isProcessing && (
          <button
            onClick={playAudio}
            className="flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium transition-colors duration-200"
          >
            <Play className="w-5 h-5 mr-2" />
            Play Recording
          </button>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center px-4 py-2 bg-gray-100 rounded-md font-medium">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {/* Debug section with more information */}
      <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-700 border border-gray-200">
        <p>
          <strong>Status:</strong>{" "}
          {isRecording ? "Recording" : isProcessing ? "Processing" : "Ready"}
        </p>
        <p>
          <strong>Transcription length:</strong> {transcription?.length || 0}{" "}
          chars
        </p>
        <p>
          <strong>Interim length:</strong> {interimTranscript?.length || 0}{" "}
          chars
        </p>
        <p>
          <strong>Web Speech API:</strong>{" "}
          {isWebSpeechSupported ? "Supported" : "Not supported"}
        </p>
      </div>

      {/* Audio element for playback */}
      <audio ref={audioRef} src={audioUrl || ""} className="hidden" />
    </div>
  );
}
