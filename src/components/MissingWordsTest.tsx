"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, RefreshCw } from "lucide-react";

interface Question {
  id: number;
  text: string;
  answer: string;
}

const questions: Question[] = [
  {
    id: 1,
    text: "It's no use, Joe. Joe, _________.",
    answer: "we've got to have it",
  },
  {
    id: 2,
    text: "Out. I've loved you ever since _________.",
    answer: "I've known you, Joe.",
  },
  {
    id: 3,
    text: "I couldn't help it, and and I _________.",
    answer: "tried to show, and you wouldn't let me",
  },
  {
    id: 4,
    text: "Which is fine, but I must _________.",
    answer: "make you hear me",
  },
  {
    id: 5,
    text: "Now and give me an answer because _________.",
    answer: "I cannot go on like this any longer",
  },
  {
    id: 6,
    text: "Even Billiards, I _________.",
    answer: "gave up everything you didn't like.",
  },
  {
    id: 7,
    text: "I'm happy I did, it's fine and I _________.",
    answer: "waited, and I never complained",
  },
  {
    id: 8,
    text: "You know, I figured _________.",
    answer: "you'd love me, Joe.",
  },
];

interface MissingWordsTestProps {
  onComplete?: () => void;
}

export default function MissingWordsTest({
  onComplete,
}: MissingWordsTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;

    const correct =
      userAnswer.toLowerCase().trim() ===
      currentQuestion.answer.toLowerCase().trim();
    setIsCorrect(correct);
    setShowAnswer(true);
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
    } else {
      setIsCompleted(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const restartTest = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setIsCorrect(null);
    setShowAnswer(false);
    setScore({ correct: 0, total: 0 });
    setIsCompleted(false);
  };

  if (isCompleted) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-[#4d7efa]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-[#4d7efa]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Test Completed!
            </h2>
            <p className="text-white/70">
              Great job completing all the questions.
            </p>
          </div>

          <div className="mb-8 p-6 bg-[#111f3d]/70 rounded-xl border border-[#2e3b56]/50">
            <div className="text-3xl font-bold text-[#4d7efa] mb-4">
              {score.correct}/{score.total}
            </div>
            <p className="text-white/90">
              {score.correct === score.total
                ? "Perfect! You've mastered these sentences."
                : score.correct > score.total / 2
                ? "Good job! Keep practicing to improve further."
                : "Keep practicing these sentences to improve your understanding."}
            </p>
          </div>

          <button
            onClick={restartTest}
            className="inline-flex items-center px-6 py-3 bg-[#4d7efa] text-white rounded-lg hover:bg-[#4d7efa]/90 transition-all duration-200 group"
          >
            <RefreshCw className="mr-2 h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/70">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-[#4d7efa]">
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-[#1b2b48] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4d7efa] rounded-full transition-all duration-300"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / questions.length) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <div className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="w-8 h-8 rounded-full bg-[#4d7efa]/20 text-[#4d7efa] flex items-center justify-center text-sm mr-3">
            {currentQuestionIndex + 1}
          </span>
          Question
        </div>
        <div className="p-6 bg-[#1b2b48]/50 rounded-xl border border-[#2e3b56]/50 mb-6">
          <p className="text-lg text-white/90">_{currentQuestion.text}_</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            🔹 Your Answer:
          </label>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full p-4 bg-[#1b2b48]/30 border border-[#2e3b56]/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#4d7efa]/50 focus:border-[#4d7efa]/50 transition-all duration-200"
            placeholder="Type your answer here..."
            disabled={showAnswer}
          />
        </div>
      </div>

      {/* Answer feedback */}
      {showAnswer && (
        <div
          className={`p-6 rounded-xl mb-8 ${
            isCorrect
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <div className="flex items-center mb-3">
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
            )}
            <span
              className={`font-medium ${
                isCorrect ? "text-green-500" : "text-red-500"
              }`}
            >
              {isCorrect ? "Correct!" : "Not quite right."}
            </span>
          </div>
          <p className="text-white/70">
            ✅ Correct Answer:{" "}
            <span className="text-white font-medium">
              "{currentQuestion.answer}"
            </span>
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-4">
        {!showAnswer && (
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-[#4d7efa] text-white rounded-lg hover:bg-[#4d7efa]/90 transition-all duration-200"
          >
            Check Answer
          </button>
        )}
        {showAnswer && (
          <button
            onClick={handleNextQuestion}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center group"
          >
            {currentQuestionIndex < questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              "Complete Test"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
