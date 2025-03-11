"use client";

import { useState } from "react";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { Mic, StopCircle, Play } from "lucide-react";

export default function SpeechTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Start recording function
  const startRecording = async () => {
    try {
      // Reset states
      setTranscript("");
      setError(null);
      setAudioBlob(null);
      setIsProcessing(false);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      // Set up data collection
      const audioChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // Handle recording stop
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        setAudioBlob(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process the audio
        processAudio(audioBlob);
      };

      // Start recording
      recorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError(
        "Could not access microphone. Please check your browser permissions."
      );
    }
  };

  // Stop recording function
  const stopRecording = () => {
    setIsRecording(false);

    // This will trigger the onstop event of the MediaRecorder
    const tracks = document
      .querySelectorAll("audio, video")
      .forEach((element) => {
        if (element instanceof HTMLMediaElement) {
          element.srcObject?.getTracks().forEach((track) => track.stop());
        }
      });
  };

  // Process audio function
  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);

      // Create form data
      const formData = new FormData();
      formData.append("audio", audioBlob);

      // Send to API
      const response = await fetch("/api/deepgram/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.transcript) {
        setTranscript(data.transcript);
      } else {
        setError("No speech detected. Please try again.");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setError("Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-50">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Simple Speech Test
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-center space-x-4 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                <StopCircle className="w-5 h-5" />
                Stop Recording
              </button>
            )}

            {audioBlob && (
              <button
                onClick={() => {
                  const audio = new Audio(URL.createObjectURL(audioBlob));
                  audio.play();
                }}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                <Play className="w-5 h-5" />
                Listen
              </button>
            )}
          </div>

          {/* Status indicator */}
          {isRecording && (
            <div className="flex items-center justify-center mb-4">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </div>
              <span className="ml-2 text-sm text-gray-600">Recording...</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm text-center mb-4">{error}</div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Processing...</span>
            </div>
          )}

          {/* Transcription result */}
          {transcript && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Transcription:</h3>
              <div className="p-3 bg-gray-50 rounded-md">{transcript}</div>
            </div>
          )}

          {/* Audio playback */}
          {audioBlob && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Recording:</h3>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              Click <strong>Start Recording</strong> and allow microphone access
            </li>
            <li>Speak clearly into your microphone</li>
            <li>
              Click <strong>Stop Recording</strong> when you're done
            </li>
            <li>Wait for the transcription to appear</li>
            <li>
              Click <strong>Listen</strong> to play back your recording
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
