"use client";

import { useState } from "react";
import SpeechRecorder from "./SpeechRecorder";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";

export default function SpeechRecorderExample() {
  const [referenceSentence, setReferenceSentence] = useState(
    "Hello, my name is Claude and I'm learning a new language."
  );
  const [lastTranscription, setLastTranscription] = useState("");
  const [lastAccuracy, setLastAccuracy] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const handleTranscriptionComplete = (
    transcription: string,
    accuracy: number
  ) => {
    setLastTranscription(transcription);
    setLastAccuracy(accuracy);
    setAttempts((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Speech Practice</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Practice Sentence:
        </label>
        <textarea
          value={referenceSentence}
          onChange={(e) => setReferenceSentence(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Enter a sentence to practice..."
        />
      </div>

      <DeepgramContextProvider>
        <SpeechRecorder
          referenceSentence={referenceSentence}
          onTranscriptionComplete={handleTranscriptionComplete}
          showComparison={true}
        />
      </DeepgramContextProvider>

      {attempts > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium mb-2">Practice Statistics</h3>
          <p className="mb-1">Attempts: {attempts}</p>
          <p className="mb-1">
            Last Accuracy: {Math.round(lastAccuracy * 100)}%
          </p>
          <p className="mb-1">
            Status:{" "}
            {lastAccuracy >= 0.7 ? "Good job! ✅" : "Keep practicing! 🔄"}
          </p>
        </div>
      )}
    </div>
  );
}
