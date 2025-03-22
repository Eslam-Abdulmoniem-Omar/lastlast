"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from "lucide-react";

// Test question types
export type ContextualMeaningQuestion = {
  type: "contextualMeaning";
  word: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  context?: string;
};

export type SynonymAntonymQuestion = {
  type: "synonymAntonym";
  word: string;
  context?: string;
  questionType: "synonym" | "antonym";
  options: { id: string; text: string }[];
  correctAnswer: string;
};

export type WordToSentenceQuestion = {
  type: "wordToSentence";
  word: string;
  context?: string;
  examples?: string[];
};

export type TestQuestion =
  | ContextualMeaningQuestion
  | SynonymAntonymQuestion
  | WordToSentenceQuestion;

interface VocabularyTestProps {
  struggledWords: string[];
  videoContext?: string;
  onComplete?: () => void;
  onGenerate?: (questions: TestQuestion[]) => void;
}

export default function VocabularyTest({
  struggledWords,
  videoContext,
  onComplete,
  onGenerate,
}: VocabularyTestProps) {
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userSentence, setUserSentence] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Generate test questions from struggled words
  useEffect(() => {
    if (struggledWords.length > 0) {
      generateQuestions(struggledWords);
    }
  }, [struggledWords]);

  const generateQuestions = async (words: string[]) => {
    setIsGenerating(true);

    try {
      // Create mock questions based on the words
      const mockQuestions: TestQuestion[] = [];

      // Create at least one of each question type
      if (words.length >= 1) {
        // Contextual meaning question
        mockQuestions.push({
          type: "contextualMeaning",
          word: words[0],
          options: [
            { id: "A", text: "Continue" },
            { id: "B", text: "Stop" },
            { id: "C", text: "Return" },
          ],
          correctAnswer: "A",
          context: `As used in "Please ${words[0]} with your story."`,
        });
      }

      if (words.length >= 2) {
        // Synonym question
        mockQuestions.push({
          type: "synonymAntonym",
          word: words[1],
          questionType: "synonym",
          options: [
            { id: "A", text: "Gave up" },
            { id: "B", text: "Protested" },
            { id: "C", text: "Smiled" },
          ],
          correctAnswer: "B",
          context: `As used in "I never ${words[1]} about the wait."`,
        });
      }

      // Add word to sentence for all remaining words
      words.slice(2).forEach((word) => {
        mockQuestions.push({
          type: "wordToSentence",
          word: word,
          context: `Used in a similar way to the video context`,
          examples: [`I ${word} it would be easy to learn.`],
        });
      });

      setQuestions(mockQuestions);

      if (onGenerate) {
        onGenerate(mockQuestions);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (optionId: string) => {
    setSelectedAnswer(optionId);

    if (
      currentQuestion.type === "contextualMeaning" ||
      currentQuestion.type === "synonymAntonym"
    ) {
      const correct = optionId === currentQuestion.correctAnswer;
      setIsCorrect(correct);

      if (correct) {
        setFeedback("Correct! Great job!");
        setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      } else {
        const correctOption = currentQuestion.options.find(
          (o) => o.id === currentQuestion.correctAnswer
        );
        setFeedback(
          `Incorrect. The correct answer is ${correctOption?.id}: ${correctOption?.text}`
        );
      }

      setScore((prev) => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleSentenceSubmit = () => {
    if (!userSentence.trim()) {
      setFeedback("Please enter a sentence using the word.");
      return;
    }

    const wordIncluded = userSentence
      .toLowerCase()
      .includes((currentQuestion as WordToSentenceQuestion).word.toLowerCase());

    if (wordIncluded) {
      setIsCorrect(true);
      setFeedback("Great job using the word in a sentence!");
      setScore((prev) => ({
        ...prev,
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
    } else {
      setIsCorrect(false);
      setFeedback(
        `Your sentence should include the word "${
          (currentQuestion as WordToSentenceQuestion).word
        }"`
      );
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((curr) => curr + 1);
      setSelectedAnswer(null);
      setUserSentence("");
      setIsCorrect(null);
      setFeedback(null);
    } else {
      setIsCompleted(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const restartTest = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setUserSentence("");
    setIsCorrect(null);
    setFeedback(null);
    setIsCompleted(false);
    setScore({ correct: 0, total: 0 });
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Generating vocabulary questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          No vocabulary tests available. Practice speaking to generate tests
          from words you struggle with.
        </p>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Test Completed!</h2>
        <div className="mb-6">
          <p className="text-lg">
            Your score:{" "}
            <span className="font-bold text-blue-600">
              {score.correct}/{score.total}
            </span>
          </p>
          <p className="text-gray-600">
            {score.correct === score.total
              ? "Perfect! You've mastered these words."
              : score.correct > score.total / 2
              ? "Good job! Keep practicing to improve further."
              : "Keep practicing these words to improve your vocabulary."}
          </p>
        </div>
        <button
          onClick={restartTest}
          className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          <RefreshCw size={18} className="mr-2" />
          Restart Test
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-2">
        <span className="text-sm font-medium text-gray-500 mr-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / questions.length) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        {currentQuestion.type === "contextualMeaning" && (
          <>
            <h3 className="text-lg font-medium mb-3">
              Match the word with its correct meaning:
            </h3>
            <div className="mb-2">
              <span className="font-bold text-blue-600">
                "{currentQuestion.word}"
              </span>
              {currentQuestion.context && (
                <p className="text-sm text-gray-600 mt-1">
                  {currentQuestion.context}
                </p>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full text-left p-3 rounded-md border transition ${
                    selectedAnswer === option.id
                      ? isCorrect
                        ? "bg-green-100 border-green-500"
                        : "bg-red-100 border-red-500"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  }`}
                  disabled={selectedAnswer !== null}
                >
                  <span className="font-medium mr-2">({option.id})</span>{" "}
                  {option.text}
                </button>
              ))}
            </div>
          </>
        )}

        {currentQuestion.type === "synonymAntonym" && (
          <>
            <h3 className="text-lg font-medium mb-3">
              Which word is a {currentQuestion.questionType} of "
              {currentQuestion.word}"?
            </h3>
            {currentQuestion.context && (
              <p className="text-sm text-gray-600 mb-4">
                {currentQuestion.context}
              </p>
            )}
            <div className="mt-4 space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full text-left p-3 rounded-md border transition ${
                    selectedAnswer === option.id
                      ? isCorrect
                        ? "bg-green-100 border-green-500"
                        : "bg-red-100 border-red-500"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  }`}
                  disabled={selectedAnswer !== null}
                >
                  <span className="font-medium mr-2">({option.id})</span>{" "}
                  {option.text}
                </button>
              ))}
            </div>
          </>
        )}

        {currentQuestion.type === "wordToSentence" && (
          <>
            <h3 className="text-lg font-medium mb-3">
              Create a sentence using the word:{" "}
              <span className="text-blue-600 font-bold">
                "{currentQuestion.word}"
              </span>
            </h3>
            {currentQuestion.context && (
              <p className="text-sm text-gray-600 mb-2">
                {currentQuestion.context}
              </p>
            )}
            {currentQuestion.examples &&
              currentQuestion.examples.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Example:</p>
                  <p className="text-sm italic text-gray-600">
                    {currentQuestion.examples[0]}
                  </p>
                </div>
              )}
            <div className="mt-4">
              <textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                placeholder={`Write a sentence using the word "${currentQuestion.word}"...`}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={isCorrect !== null}
              />
              {isCorrect === null && (
                <button
                  onClick={handleSentenceSubmit}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                  Check
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 mb-4 rounded-md ${
            isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`text-sm ${
              isCorrect ? "text-green-800" : "text-red-800"
            }`}
          >
            {feedback}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleNextQuestion}
          disabled={selectedAnswer === null && isCorrect === null}
          className={`flex items-center px-4 py-2 rounded-lg ${
            selectedAnswer !== null || isCorrect !== null
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {currentQuestionIndex < questions.length - 1
            ? "Next Question"
            : "Finish Quiz"}
          <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );
}
