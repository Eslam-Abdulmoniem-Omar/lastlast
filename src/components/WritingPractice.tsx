"use client";

import { useState } from "react";
import { useAuth } from "../lib/hooks/useAuth";
import { useGemini } from "../lib/hooks/useGemini";
import { Podcast, WritingFeedback } from "../lib/types";
import { submitWritingAnswer } from "../lib/firebase/podcastUtils";

interface WritingPracticeProps {
  podcast: Podcast;
  onComplete?: () => void;
}

export default function WritingPractice({
  podcast,
  onComplete,
}: WritingPracticeProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { getWritingFeedback, isLoading } = useGemini({
    onError: (error) => {
      setError(error.message);
      setIsSubmitting(false);
    },
  });

  // Use the first reference answer for writing practice
  const referenceAnswer = podcast.referenceAnswers?.[0]?.text || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("You must be logged in to submit");
      }

      if (!text.trim()) {
        throw new Error("Please write something before submitting");
      }

      // Save to Firebase
      await submitWritingAnswer(user.id, podcast.id, text);

      // Get AI feedback
      const feedback = await getWritingFeedback(text, referenceAnswer);
      setFeedback(feedback);

      // Trigger onComplete if provided
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <h2 className="text-xl font-bold">Writing Practice</h2>
        <p className="text-sm opacity-80">
          Write a short response about the podcast topic
        </p>
      </div>

      {!feedback ? (
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label
              htmlFor="writing"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Write your thoughts on &quot;{podcast.title}&quot;
            </label>
            <textarea
              id="writing"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing your response here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`px-4 py-2 rounded-md ${
                isSubmitting || isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white font-medium`}
            >
              {isSubmitting || isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Getting Feedback...
                </span>
              ) : (
                "Submit for Feedback"
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Your Response
            </h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">{text}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Grammar & Style Corrections
            </h3>
            {feedback.corrections.length > 0 ? (
              <div className="space-y-3">
                {feedback.corrections.map((correction, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 text-yellow-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-500 line-through">
                          {correction.original}
                        </p>
                        <p className="text-sm text-green-600">
                          {correction.corrected}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {correction.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No grammar or style issues found.</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Suggestions
            </h3>
            {feedback.suggestions.length > 0 ? (
              <div className="space-y-3">
                {feedback.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 text-blue-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.type === "vocabulary"
                            ? "Vocabulary"
                            : "Structure"}
                        </p>
                        <p className="text-sm text-gray-700">
                          {suggestion.suggestion}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No additional suggestions.</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Overall Feedback
            </h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700">{feedback.overallFeedback}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Comparison with Reference
            </h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700">
                {feedback.comparisonWithReference}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                setText("");
                setFeedback(null);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
