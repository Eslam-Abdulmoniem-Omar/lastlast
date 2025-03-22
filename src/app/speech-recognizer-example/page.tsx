"use client";

import { useState, useEffect } from "react";
import SpeechRecognizer from "@/components/SpeechRecognizer";

export default function SpeechRecognizerExample() {
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isTranscriptionComplete, setIsTranscriptionComplete] = useState(false);

  // Reset status when component mounts
  useEffect(() => {
    setIsTranscriptionComplete(false);
    setTranscription("");
    setError(null);
  }, []);

  const handleTranscriptionComplete = (text: string) => {
    console.log("Transcription complete callback received:", text);
    setTranscription(text);
    setError(null);
    setIsTranscriptionComplete(true);
  };

  const handleError = (errorMessage: string) => {
    console.log("Error received:", errorMessage);
    setError(errorMessage);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Speech Recognition Example</h1>

      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">About this demo</h2>
        <p className="mb-4">
          This demo uses the Web Speech API as the primary method for speech
          recognition and falls back to either OpenAI Whisper or a text
          generator if Web Speech API is not available or fails.
        </p>
        <p className="mb-4">
          The Web Speech API provides real-time transcription directly in your
          browser without sending data to external servers when supported.
        </p>
        <div className="bg-yellow-50 p-3 rounded-md">
          <p className="text-sm text-yellow-800">
            Note: If you see a warning about Web Speech API not being supported,
            your browser doesn&apos;t support this feature and we&apos;ll use
            server-side transcription instead.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-md text-red-700">
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Try it out</h2>
        <p className="mb-4">
          Click &quot;Start Recording&quot; and speak into your microphone. When
          finished, click &quot;Stop Recording&quot; to see the transcription.
        </p>

        <div className="p-4 bg-white rounded-lg shadow">
          <SpeechRecognizer
            onTranscriptionComplete={handleTranscriptionComplete}
            onError={handleError}
          />
        </div>
      </div>

      {isTranscriptionComplete && transcription && (
        <div className="mb-8 mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold mb-4">Final Transcription</h2>
          <div className="p-4 bg-white rounded-lg">
            <h3 className="text-lg font-medium mb-2">You said:</h3>
            <p className="text-base border-l-4 border-blue-500 pl-3 py-2">
              {transcription}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">How it works</h2>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">Primary Method: Web Speech API</h3>
            <p className="text-sm">
              Uses your browser&apos;s built-in speech recognition capabilities
              when available.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">Fallback Method 1: OpenAI Whisper</h3>
            <p className="text-sm">
              If Web Speech API fails or isn&apos;t supported, we use
              OpenAI&apos;s Whisper model for accurate transcription.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">Fallback Method 2: Text Generator</h3>
            <p>If all else fails, we generate a sample text response.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
