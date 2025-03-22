"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/hooks/useAuth";
import { useGemini } from "../lib/hooks/useGemini";
import { useDeepgram } from "../lib/contexts/DeepgramContext";
import { Podcast, PodcastQuestion, SpeakingFeedback } from "../lib/types";
import {
  submitSpeakingAnswer,
  uploadAudio,
} from "../lib/firebase/podcastUtils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import SpeechRecorder from "./SpeechRecorder";

interface ConversationPracticeProps {
  podcast: Podcast;
  onComplete?: () => void;
}

export default function ConversationPractice({
  podcast,
  onComplete,
}: ConversationPracticeProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeTranscript, setRealtimeTranscript] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");

  const { user } = useAuth();
  const {
    connectToDeepgram,
    disconnectFromDeepgram,
    realtimeTranscript: deepgramRealtimeTranscript,
    connectionState,
  } = useDeepgram();
  const { getPronunciationFeedback, isLoading } = useGemini({
    onError: (error) => {
      setError(error.message);
      setIsSubmitting(false);
    },
  });

  const questions = podcast.questions || [];
  const currentQuestion = questions[currentQuestionIndex] || {
    id: "0",
    text: "No questions available",
    timestamp: 0,
  };

  const handleStartRecording = async () => {
    setError(null);
    setFeedback(null);

    try {
      await connectToDeepgram();
      setIsRecording(true);

      // For recording the audio blob
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();

      // Store the MediaRecorder instance to stop it later
      (window as any).mediaRecorder = mediaRecorder;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start recording"
      );
    }
  };

  const handleStopRecording = () => {
    disconnectFromDeepgram();
    setIsRecording(false);

    // Stop the media recorder
    const mediaRecorder = (window as any).mediaRecorder;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("You must be logged in to submit");
      }

      if (!realtimeTranscript.trim()) {
        throw new Error("No speech detected. Please try again.");
      }

      let audioUrl;
      if (audioBlob) {
        audioUrl = await uploadAudio(
          user.id,
          podcast.id,
          currentQuestion.id,
          audioBlob
        );
      }

      // Save to Firebase
      await submitSpeakingAnswer(
        user.id,
        podcast.id,
        currentQuestion.id,
        realtimeTranscript,
        audioUrl
      );

      // Get AI feedback
      const feedback = await getPronunciationFeedback(
        currentQuestion.text,
        realtimeTranscript
      );
      setFeedback(feedback);

      // If this is the last question, trigger onComplete
      if (currentQuestionIndex === questions.length - 1) {
        onComplete?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setFeedback(null);
      setAudioBlob(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setFeedback(null);
      setAudioBlob(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <h2 className="text-xl font-bold">Conversation Practice</h2>
        <p className="text-sm opacity-80">
          Respond to questions from the podcast host
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`p-2 rounded-full ${
              currentQuestionIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>

          <button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`p-2 rounded-full ${
              currentQuestionIndex === questions.length - 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Question:</h3>
          <p className="text-gray-700">{currentQuestion.text}</p>
        </div>

        {!feedback ? (
          <div>
            <div className="mb-6">
              <div className="flex justify-center mb-4">
                <SpeechRecorder
                  onTranscriptChange={(transcript) =>
                    setRealtimeTranscript(transcript)
                  }
                  onRecordingStateChange={(recording) => {
                    setIsRecording(recording);
                    if (!recording && realtimeTranscript) {
                      console.log(
                        "Recording stopped with transcript:",
                        realtimeTranscript
                      );
                      // Save the transcript for evaluation
                      setUserAnswer(realtimeTranscript);
                    }
                  }}
                  showModelInfo={true}
                  maxRecordingTime={30000} // 30 seconds max recording time
                  buttonStyle="pill"
                />
              </div>

              {realtimeTranscript && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Your Answer (Transcribed):
                  </h3>
                  <p className="text-gray-700">{realtimeTranscript}</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {realtimeTranscript && !isRecording && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || isLoading
                    ? "Submitting..."
                    : "Submit Answer"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Your Answer
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{realtimeTranscript}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Pronunciation Feedback
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-700">
                    {feedback.pronunciationScore}/10
                  </div>
                  <div className="text-sm text-gray-500">Pronunciation</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-blue-700">
                    {feedback.fluencyScore}/10
                  </div>
                  <div className="text-sm text-gray-500">Fluency</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-purple-700">
                    {feedback.intonationScore}/10
                  </div>
                  <div className="text-sm text-gray-500">Intonation</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                  <div className="text-xl font-bold text-indigo-700">
                    {feedback.overallScore}/10
                  </div>
                  <div className="text-sm text-gray-500">Overall</div>
                </div>
              </div>
            </div>

            {feedback.specificFeedback.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Specific Feedback
                </h3>
                <div className="space-y-3">
                  {feedback.specificFeedback.map((item, index) => (
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
                          <p className="text-sm font-medium text-gray-900">
                            {item.word}
                          </p>
                          <p className="text-sm text-gray-700">{item.issue}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                General Advice
              </h3>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-700">{feedback.generalAdvice}</p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  setFeedback(null);
                  setAudioBlob(null);
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-md"
              >
                Try Again
              </button>

              {currentQuestionIndex < questions.length - 1 && (
                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
