import { useState } from "react";
import { WritingFeedback, SpeakingFeedback, WordTranslation } from "../types";

interface UseGeminiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useGemini(options?: UseGeminiOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getWritingFeedback = async (
    text: string,
    referenceAnswer: string
  ): Promise<WritingFeedback> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "writing-feedback",
          prompt: {
            text,
            referenceAnswer,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get writing feedback");
      }

      const data = await response.json();
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getPronunciationFeedback = async (
    question: string,
    transcribedAnswer: string
  ): Promise<SpeakingFeedback> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "pronunciation-feedback",
          prompt: {
            question,
            transcribedAnswer,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get pronunciation feedback");
      }

      const data = await response.json();
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getWordTranslation = async (
    word: string,
    context: string,
    targetLanguage?: string
  ): Promise<WordTranslation> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "word-translation",
          prompt: {
            word,
            context,
            targetLanguage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get word translation");
      }

      const data = await response.json();
      options?.onSuccess?.(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getWritingFeedback,
    getPronunciationFeedback,
    getWordTranslation,
  };
}
