"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";

// Voice options from Eleven Labs
const VOICE_OPTIONS = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "Grace (Female)" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Male)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Nicole (Female)" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Josh (Male)" },
];

// Model options from Eleven Labs
const MODEL_OPTIONS = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2" },
  { id: "eleven_monolingual_v1", name: "Monolingual v1" },
];

export default function TextToSpeechTest() {
  const [text, setText] = useState(
    "The first move is what sets everything in motion."
  );
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Revoke previous audio URL to free memory
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const response = await fetch("/api/elevenlabs/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          modelId: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      // Get the audio blob from the response
      const audioBlob = await response.blob();

      // Create a URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Play the audio automatically
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();
      }
    } catch (err) {
      console.error("Error generating speech:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate speech"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        Eleven Labs Text-to-Speech Test
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium mb-2">
            Text to convert to speech
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder="Enter text to convert to speech..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="voice" className="block text-sm font-medium mb-2">
              Voice
            </label>
            <select
              id="voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium mb-2">
              Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
              Generating...
            </>
          ) : (
            "Generate Speech"
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {audioUrl && (
        <div className="mt-6 p-4 border border-gray-200 rounded-md">
          <h2 className="text-lg font-medium mb-3">Generated Audio</h2>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-medium mb-3">
          About Eleven Labs Text-to-Speech
        </h2>
        <p className="text-gray-600 mb-4">
          This demo uses the Eleven Labs API to convert text to lifelike speech.
          Try entering different texts and selecting different voices to hear
          them spoken with natural intonation and emphasis.
        </p>
        <p className="text-gray-600">
          <strong>Note:</strong> The multilingual model supports multiple
          languages, while the monolingual model is optimized for English.
        </p>
      </div>
    </div>
  );
}
