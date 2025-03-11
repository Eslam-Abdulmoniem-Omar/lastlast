"use client";

import { useState } from "react";
import { useGemini } from "../lib/hooks/useGemini";
import { useAuth } from "../lib/hooks/useAuth";
import { WordTranslation as WordTranslationType } from "../lib/types";

interface WordTranslationProps {
  context: string;
  targetLanguage?: string;
}

export default function WordTranslation({
  context,
  targetLanguage,
}: WordTranslationProps) {
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [translation, setTranslation] = useState<WordTranslationType | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const { getWordTranslation, isLoading } = useGemini({
    onError: (error) => {
      setError(error.message);
    },
  });

  const { user } = useAuth();

  const handleWordSelect = async (word: string) => {
    if (!word.trim() || word === selectedWord) return;

    setSelectedWord(word);
    setError(null);

    try {
      if (!user) {
        throw new Error("You must be logged in to use this feature");
      }

      const translation = await getWordTranslation(
        word,
        context,
        targetLanguage
      );

      setTranslation(translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Split context into words and create interactive spans
  const renderInteractiveText = () => {
    if (!context) return null;

    const words = context.split(/\s+/);

    return (
      <p className="text-gray-800 leading-relaxed">
        {words.map((word, index) => {
          // Clean word (remove punctuation for comparison but keep it for display)
          const cleanWord = word.replace(/[.,!?;:"'()]/g, "");
          const isSelected = cleanWord === selectedWord;

          return (
            <span key={index} className="relative inline-block">
              <span
                onClick={() => handleWordSelect(cleanWord)}
                className={`${
                  isSelected
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-gray-100 cursor-pointer"
                } px-0.5 rounded transition-colors`}
              >
                {word}
              </span>{" "}
            </span>
          );
        })}
      </p>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Context-Aware Translation
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Click on any word to see its Our AI{" "}
        </p>

        <div className="p-4 bg-gray-50 rounded-lg">
          {renderInteractiveText()}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {translation && !isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900">
              "{translation.originalWord}"
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Our AI{" "}
            </span>
          </div>

          <div className="mb-3">
            <p className="text-lg font-medium text-blue-800">
              {translation.translation}
            </p>
          </div>

          <div className="text-sm text-gray-700">
            <p className="mb-2">{translation.contextualMeaning}</p>
            <p className="text-xs text-gray-500 italic">{translation.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
