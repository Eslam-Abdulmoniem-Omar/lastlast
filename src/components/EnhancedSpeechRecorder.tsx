"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, StopCircle, Play, CheckCircle, XCircle } from "lucide-react";

interface EnhancedSpeechRecorderProps {
  referenceSentence?: string;
  onTranscriptionComplete?: (transcription: string, accuracy: number) => void;
  showComparison?: boolean;
}

export default function EnhancedSpeechRecorder({
  referenceSentence = "",
  onTranscriptionComplete,
  showComparison = true,
}: EnhancedSpeechRecorderProps) {
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [accuracy, setAccuracy] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    isMatch: boolean;
    accuracy: number;
    missingWords: string[];
    feedback: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Start recording function with WebSpeechAPI integration
  const startRecording = async () => {
    try {
      // Reset states
      setTranscription("");
      setIsProcessing(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setComparison(null);
      setError(null);
      audioChunksRef.current = [];

      console.log("Starting enhanced recording...");

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

        // Process the recording using direct API call
        await processRecording(audioBlob);
      };

      // Start recording
      recorder.start(1000);
      setIsRecording(true);
      console.log("MediaRecorder started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(
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

  // Process recording and send to API for comparison
  const processRecording = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // Use Web Speech API for transcription
      const transcript = await webSpeechAPI(audioBlob);

      if (!transcript) {
        throw new Error("No transcription generated");
      }

      setTranscription(transcript);

      // If we have a reference sentence, compare the texts
      if (referenceSentence) {
        await compareWithReference(transcript, referenceSentence);
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      setError("Failed to process recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Renamed from useWebSpeechAPI to webSpeechAPI since it's not a hook
  const webSpeechAPI = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is supported
      if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
      ) {
        return reject(
          new Error("Web Speech API not supported in this browser")
        );
      }

      console.log("Using Web Speech API for transcription...");

      // Create audio element to play the recording
      const audio = new Audio(URL.createObjectURL(audioBlob));

      // Set up Speech Recognition
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let transcript = "";

      // Event handlers
      recognition.onresult = (event) => {
        const result = event.results[0][0];
        transcript = result.transcript;
        console.log("Speech recognized:", transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        if (transcript) {
          resolve(transcript);
        } else {
          // If Web Speech API fails, try the API directly
          sendAudioToAPI(audioBlob).then(resolve).catch(reject);
        }
      };

      // Start recognition when audio starts playing
      audio.onplay = () => {
        recognition.start();
      };

      audio.onended = () => {
        // Ensure recognition stops when audio ends
        setTimeout(() => {
          if (recognition) {
            try {
              recognition.stop();
            } catch (e) {
              console.log("Recognition already stopped");
            }
          }
        }, 500);
      };

      // Start playing audio
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        // If playing fails, try the API directly
        sendAudioToAPI(audioBlob).then(resolve).catch(reject);
      });
    });
  };

  // Send audio directly to API for processing
  const sendAudioToAPI = async (audioBlob: Blob): Promise<string> => {
    // Remove API-related console logging
    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await fetch("/api/speech-to-text", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    // Remove API response logging
    return data.transcript || "";
  };

  // Compare transcription with reference sentence
  const compareWithReference = async (
    transcript: string,
    reference: string
  ) => {
    try {
      console.log("Comparing with reference sentence...");

      const response = await fetch("/api/openai/compare-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userSpeech: transcript,
          originalSentence: reference,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Comparison result:", result);

      setComparison(result);
      setAccuracy(result.accuracy);

      // Call the callback if provided
      if (onTranscriptionComplete) {
        onTranscriptionComplete(transcript, result.accuracy);
      }
    } catch (error) {
      console.error("Error comparing texts:", error);
      setError("Failed to compare speech with reference.");
    }
  };

  // Play recorded audio
  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (isRecording) {
      // Remove console logging of recording start
      startRecording();
    } else if (mediaRecorderRef.current) {
      // Remove console logging of recording stop
      stopRecording();
    }
  }, [isRecording]);

  // Render the component
  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-2 text-red-500 bg-red-50 rounded-md">{error}</div>
      )}

      <div className="flex flex-col space-y-2">
        {referenceSentence && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">Reference:</p>
            <p className="text-base">{referenceSentence}</p>
          </div>
        )}

        {transcription && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">Your speech:</p>
            <p className="text-base">{transcription}</p>
          </div>
        )}
      </div>

      {showComparison && comparison && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Accuracy:</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(comparison.accuracy * 100).toFixed(0)}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium">
              {(comparison.accuracy * 100).toFixed(0)}%
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium">Feedback:</p>
            <div className="flex items-center space-x-2">
              {comparison.isMatch ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <p>{comparison.feedback}</p>
            </div>
          </div>

          {comparison.missingWords && comparison.missingWords.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Missing words:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {comparison.missingWords.map((word, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        {!isRecording && !isProcessing && (
          <button
            onClick={startRecording}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Mic className="h-5 w-5 mr-2" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <StopCircle className="h-5 w-5 mr-2" />
            Stop
          </button>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center px-4 py-2 bg-gray-400 text-white rounded-md">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </div>
        )}

        {audioUrl && !isRecording && !isProcessing && (
          <button
            onClick={playAudio}
            className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Play className="h-5 w-5 mr-2" />
            Play
          </button>
        )}
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} src={audioUrl || ""} />
    </div>
  );
}
