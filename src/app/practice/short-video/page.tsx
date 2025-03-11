"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DialogueSegment } from "@/lib/types";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

// Practice steps
const PRACTICE_STEPS = [
  "overview",
  "listening",
  "vocabulary",
  "guided-speaking",
  "free-speaking",
  "summary",
];

export default function ShortVideoPracticePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [practiceData, setPracticeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Authentication protection - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, redirect to login page
      toast.error("Please sign in to practice videos");
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load practice data from localStorage
  useEffect(() => {
    const loadPracticeData = () => {
      try {
        console.log("Loading practice data from localStorage");
        const savedData = localStorage.getItem("practiceData");
        if (!savedData) {
          toast.error("No practice data found. Please select a video first.");
          router.push("/short-videos");
          return;
        }
        setPracticeData(JSON.parse(savedData));
      } catch (error) {
        console.error("Error loading practice data:", error);
        toast.error("Failed to load practice data");
        router.push("/short-videos");
      } finally {
        setLoading(false);
      }
    };

    loadPracticeData();
  }, [router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0c1527] to-[#111f3d]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#232323] rounded-xl mb-4 flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-700 animate-pulse rounded-lg"></div>
          </div>
          <div className="h-4 w-24 bg-gray-700 animate-pulse rounded mb-3"></div>
          <div className="h-3 w-32 bg-gray-700/50 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  // If user is not authenticated and not in loading state, don't render the actual page content
  if (!user && !authLoading) {
    return null; // This will prevent any flickering before the redirect happens
  }

  const goToNextStep = () => {
    if (currentStep < PRACTICE_STEPS.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(stepIndex);
      window.scrollTo(0, 0);
    }
  };

  const renderStepContent = () => {
    if (!practiceData) return null;

    switch (PRACTICE_STEPS[currentStep]) {
      case "overview":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Practice Overview</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">
                {practiceData.title}
              </h3>

              {practiceData.embedUrl && (
                <div className="aspect-video mb-6">
                  <iframe
                    src={practiceData.embedUrl}
                    className="w-full h-full rounded-md"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-lg font-medium mb-2">Your Practice Plan</h4>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>Watch the video and understand the content</li>
                  <li>Practice listening and comprehension</li>
                  <li>Learn key vocabulary from the video</li>
                  <li>Practice speaking with guided exercises</li>
                  <li>
                    Free speaking practice to apply what you&apos;ve learned
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="text-lg font-medium mb-2">Dialogue Segments</h4>
                <p className="text-gray-600 mb-4">
                  This video has been divided into{" "}
                  {practiceData.dialogueSegments.length} segments for practice.
                </p>

                <div className="max-h-60 overflow-y-auto p-3 border rounded-md">
                  {practiceData.dialogueSegments.map(
                    (segment: DialogueSegment, index: number) => (
                      <div
                        key={segment.id}
                        className="mb-3 pb-3 border-b last:border-b-0"
                      >
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                          <span>Segment {index + 1}</span>
                          <span className="mx-2">•</span>
                          <span>
                            {formatTime(segment.startTime)} -{" "}
                            {formatTime(segment.endTime)}
                          </span>
                        </div>
                        <p className="text-gray-800">{segment.text}</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "listening":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Listening Practice</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="mb-4">
                Listen to the video carefully and focus on understanding the
                content. You can play specific segments to practice your
                listening skills.
              </p>

              {practiceData.embedUrl && (
                <div className="aspect-video mb-6">
                  <iframe
                    src={practiceData.embedUrl}
                    className="w-full h-full rounded-md"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Dialogue Segments</h3>
                <div className="space-y-4">
                  {practiceData.dialogueSegments.map(
                    (segment: DialogueSegment, index: number) => (
                      <div
                        key={segment.id}
                        className="p-4 border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">
                            Segment {index + 1}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(segment.startTime)} -{" "}
                            {formatTime(segment.endTime)}
                          </span>
                        </div>
                        <p className="text-gray-800">{segment.text}</p>
                        <button
                          className="mt-2 text-blue-600 text-sm hover:underline"
                          onClick={() => {
                            // This would ideally seek the video to the specific timestamp
                            // For now, we'll just show a message
                            toast.success(`Playing segment ${index + 1}`);
                          }}
                        >
                          Play this segment
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "vocabulary":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Vocabulary Practice</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="mb-6">
                Learn and practice key vocabulary from the video. Understanding
                these words will help you better comprehend the content.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generateVocabularyItems(practiceData.dialogueSegments).map(
                  (item, index) => (
                    <div key={index} className="p-4 border rounded-md">
                      <div className="font-medium text-lg mb-1">
                        {item.word}
                      </div>
                      <div className="text-gray-500 text-sm mb-2">
                        {item.partOfSpeech}
                      </div>
                      <div className="text-gray-700">{item.definition}</div>
                      <div className="mt-2 text-gray-600 italic">
                        &quot;{item.example}&quot;
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        );

      case "guided-speaking":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Guided Speaking Practice</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="mb-6">
                Practice speaking by repeating the dialogue segments. Try to
                match the pronunciation and intonation.
              </p>

              <div className="space-y-6">
                {practiceData.dialogueSegments.map(
                  (segment: DialogueSegment, index: number) => (
                    <div
                      key={segment.id}
                      className="border rounded-md overflow-hidden"
                    >
                      <div className="bg-gray-50 p-3 border-b">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            Segment {index + 1}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(segment.startTime)} -{" "}
                            {formatTime(segment.endTime)}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-800 mb-4">{segment.text}</p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                            onClick={() => {
                              // This would ideally play the segment
                              toast.success(`Playing segment ${index + 1}`);
                            }}
                          >
                            Listen
                          </button>
                          <button
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                            onClick={() => {
                              // This would ideally start recording
                              toast.success(
                                `Recording for segment ${index + 1}`
                              );
                            }}
                          >
                            Record
                          </button>
                          <button
                            className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200"
                            onClick={() => {
                              // This would ideally compare the recording with the original
                              toast.success(
                                `Comparing your speech for segment ${index + 1}`
                              );
                            }}
                          >
                            Compare
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        );

      case "free-speaking":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Free Speaking Practice</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <p className="mb-6">
                Now it&apos;s time to practice speaking freely about the topic
                of the video. Use the vocabulary and phrases you&apos;ve
                learned.
              </p>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Speaking Prompts</h3>
                <ul className="space-y-3">
                  {generateSpeakingPrompts(
                    practiceData.title,
                    practiceData.dialogueSegments
                  ).map((prompt, index) => (
                    <li key={index} className="p-3 bg-gray-50 rounded-md">
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 border rounded-md bg-blue-50">
                <h3 className="text-lg font-medium mb-2 text-blue-800">
                  Record Your Response
                </h3>
                <p className="text-blue-700 mb-4">
                  Choose one of the prompts above and record your response. Try
                  to speak for at least 1 minute.
                </p>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => {
                    // This would ideally start recording
                    toast.success("Recording started");
                  }}
                >
                  Start Recording
                </button>
              </div>
            </div>
          </div>
        );

      case "summary":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Practice Summary</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Congratulations!</h3>
              <p className="mb-6">
                You&apos;ve completed the practice session for &quot;
                {practiceData.title}
                &quot;. Here&apos;s a summary of what you&apos;ve accomplished:
              </p>

              <div className="space-y-4 mb-6">
                <div className="p-3 bg-green-50 rounded-md">
                  <div className="font-medium text-green-800">
                    Listening Practice
                  </div>
                  <div className="text-green-700">
                    You practiced listening to{" "}
                    {practiceData.dialogueSegments.length} dialogue segments.
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="font-medium text-blue-800">
                    Vocabulary Practice
                  </div>
                  <div className="text-blue-700">
                    You learned{" "}
                    {
                      generateVocabularyItems(practiceData.dialogueSegments)
                        .length
                    }{" "}
                    new vocabulary items.
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-md">
                  <div className="font-medium text-purple-800">
                    Speaking Practice
                  </div>
                  <div className="text-purple-700">
                    You practiced speaking with guided exercises and free
                    speaking prompts.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/short-videos"
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-center"
                >
                  Back to Videos
                </Link>
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setCompletedSteps([]);
                    window.scrollTo(0, 0);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
                >
                  Practice Again
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-lg">Loading practice session...</span>
        </div>
      </div>
    );
  }

  if (!practiceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Practice Data Found</h2>
          <p className="mb-6">Please select a video to practice with.</p>
          <Link
            href="/short-videos"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse Videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Short Video Practice</h1>
          <Link
            href="/short-videos"
            className="text-blue-600 hover:underline text-sm"
          >
            Back to Videos
          </Link>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-medium">{practiceData.title}</div>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {PRACTICE_STEPS.length}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                style={{
                  width: `${
                    ((currentStep + 1) / PRACTICE_STEPS.length) * 100
                  }%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
            <div className="flex justify-between">
              {PRACTICE_STEPS.map((step, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center cursor-pointer ${
                    index <= Math.max(...completedSteps, 0) + 1
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                  onClick={() => goToStep(index)}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full mb-1 ${
                      index < currentStep
                        ? "bg-blue-100 text-blue-600"
                        : index === currentStep
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-xs capitalize hidden sm:block">
                    {step.replace("-", " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">{renderStepContent()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={goToPreviousStep}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-md ${
            currentStep === 0
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Previous
        </button>

        <button
          onClick={goToNextStep}
          disabled={currentStep === PRACTICE_STEPS.length - 1}
          className={`px-4 py-2 rounded-md ${
            currentStep === PRACTICE_STEPS.length - 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Helper function to generate vocabulary items from dialogue segments
const generateVocabularyItems = (segments: DialogueSegment[]) => {
  const allText = segments.map((segment) => segment.text).join(" ");
  const words = allText.split(/\s+/).filter((word) => word.length > 4);
  const uniqueWords = Array.from(new Set(words)).slice(0, 8);

  const partsOfSpeech = ["noun", "verb", "adjective", "adverb"];

  return uniqueWords.map((word) => ({
    word: word.replace(/[.,!?;:]/g, ""),
    partOfSpeech:
      partsOfSpeech[Math.floor(Math.random() * partsOfSpeech.length)],
    definition: `Definition of "${word.replace(/[.,!?;:]/g, "")}"`,
    example: `Example sentence using "${word.replace(/[.,!?;:]/g, "")}".`,
  }));
};

// Helper function to generate speaking prompts
const generateSpeakingPrompts = (
  title: string,
  segments: DialogueSegment[]
) => {
  // This is a placeholder function that would ideally generate relevant prompts
  // For now, we'll return some generic prompts
  return [
    `What is your opinion on the topic discussed in the video?`,
    `Can you summarize the main points of the video in your own words?`,
    `How does this topic relate to your personal experience?`,
    `What did you find most interesting about this video and why?`,
    `If you could ask the creator of this video one question, what would it be?`,
  ];
};
