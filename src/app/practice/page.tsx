"use client";

import React from "react";
import GuidedSpeakingPractice from "../components/GuidedSpeakingPractice";

export default function PracticePage() {
  // Example script - you can make this dynamic based on your needs
  const script = "I've loved you";

  const handleTranscriptReceived = (transcript: string) => {
    console.log("Received transcript:", transcript);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Speaking Practice</h1>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Practice Pronunciation</h2>
          <p className="text-gray-600 mb-6">
            Try to say the following phrase as clearly as possible. Pay
            attention to contractions and pronunciation.
          </p>

          <GuidedSpeakingPractice
            expectedScript={script}
            onTranscriptReceived={handleTranscriptReceived}
          />
                </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Tips:</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Contractions like "I've" are accepted and encouraged</li>
            <li>Speak clearly and at a normal pace</li>
            <li>Try to match the exact wording</li>
            <li>The system will analyze your pronunciation accuracy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
