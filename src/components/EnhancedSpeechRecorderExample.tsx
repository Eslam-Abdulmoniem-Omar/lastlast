"use client";

import { useState } from "react";
import EnhancedSpeechRecorder from "./EnhancedSpeechRecorder";

export default function EnhancedSpeechRecorderExample() {
  const [sampleSentences] = useState([
    "It's no use, Joe. Joe, we've got to have it.",
    "Out. I've loved you ever since I've known.",
    "You, Joe. I couldn't help it, and I.",
  ]);

  const [selectedSentence, setSelectedSentence] = useState(sampleSentences[0]);
  const [result, setResult] = useState<{
    transcription: string;
    accuracy: number;
  } | null>(null);

  // Handle transcription complete
  const handleTranscriptionComplete = (
    transcription: string,
    accuracy: number
  ) => {
    setResult({ transcription, accuracy });
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Enhanced Speech Practice
      </h1>

      <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">
          Select a sentence to practice:
        </h2>

        <div className="space-y-2">
          {sampleSentences.map((sentence, index) => (
            <div key={index} className="flex items-center">
              <input
                type="radio"
                id={`sentence-${index}`}
                name="sentence"
                className="mr-2"
                checked={selectedSentence === sentence}
                onChange={() => setSelectedSentence(sentence)}
              />
              <label htmlFor={`sentence-${index}`} className="text-gray-700">
                {sentence}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Practice speaking:</h2>
        <EnhancedSpeechRecorder
          referenceSentence={selectedSentence}
          onTranscriptionComplete={handleTranscriptionComplete}
          showComparison={true}
        />
      </div>

      {result && (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Last result:</h2>
          <p>
            <span className="font-medium">Your speech:</span>{" "}
            {result.transcription}
          </p>
          <p>
            <span className="font-medium">Accuracy:</span>{" "}
            {(result.accuracy * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}
