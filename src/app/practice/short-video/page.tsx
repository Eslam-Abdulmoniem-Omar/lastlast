"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DialogueSegment } from "@/lib/types";
import { toast } from "react-hot-toast";
import Link from "next/link";

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
  const [practiceData, setPracticeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listening");
  const [showTranscript, setShowTranscript] = useState(true);

  useEffect(() => {
    // Log that the effect is running
    console.log("Practice page useEffect running");

    // Load practice data from localStorage
    const loadPracticeData = () => {
      try {
        console.log("Loading practice data from localStorage");
        const storedData = localStorage.getItem("current-practice-data");
        console.log("Stored data:", storedData ? "Found" : "Not found");

        if (!storedData) {
          console.error("No practice data found in localStorage");
          toast.error("No practice data found. Please select a video first.");
          router.push("/short-videos");
          return;
        }

        const data = JSON.parse(storedData);
        console.log("Parsed practice data:", data);
        console.log(
          "Data has dialogueSegments:",
          data.dialogueSegments
            ? `Yes, ${data.dialogueSegments.length} segments`
            : "No"
        );
        setPracticeData(data);
      } catch (error) {
        console.error("Error loading practice data:", error);
        toast.error("Error loading practice data. Please try again.");
        router.push("/short-videos");
      } finally {
        setLoading(false);
      }
    };

    loadPracticeData();
  }, [router]);

  const toggleTranscript = () => {
    setShowTranscript(!showTranscript);
  };

  const renderContent = () => {
    if (!practiceData) return null;

    switch (activeTab) {
      case "listening":
        return (
          <div className="space-y-6">
            {/* Video player is common across all tabs */}
            <div className="aspect-video mb-6 relative">
              <iframe
                src={practiceData.embedUrl}
                className="w-full h-full rounded-md"
                allowFullScreen
              ></iframe>
            </div>

            {showTranscript && (
              <div className="bg-white p-4 rounded-lg shadow-sm max-h-96 overflow-y-auto">
                {practiceData.dialogueSegments.map(
                  (segment: DialogueSegment, index: number) => (
                    <div
                      key={segment.id}
                      className="mb-4 pb-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        // This would ideally seek the video to the specific timestamp
                        // For now, we'll just show a message
                        toast.success(
                          `Playing from ${formatTime(segment.startTime)}`
                        );
                      }}
                    >
                      <div className="text-gray-500 mb-1">
                        {formatTime(segment.startTime)}
                      </div>
                      <p className="text-gray-800">{segment.text}</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );

      case "vocabulary":
        return (
          <div className="space-y-6">
            {/* Video player is common across all tabs */}
            <div className="aspect-video mb-6">
              <iframe
                src={practiceData.embedUrl}
                className="w-full h-full rounded-md"
                allowFullScreen
              ></iframe>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Key Vocabulary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generateVocabularyItems(practiceData.dialogueSegments).map(
                  (item, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-md hover:bg-gray-50"
                    >
                      <div className="font-medium text-lg mb-1">
                        {item.word}
                      </div>
                      <div className="text-gray-500 text-sm mb-2">
                        {item.partOfSpeech}
                      </div>
                      <div className="text-gray-700">{item.definition}</div>
                      <div className="mt-2 text-gray-600 italic">
                        "{item.example}"
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        );

      case "guided-practice":
        return (
          <div className="space-y-6">
            {/* Video player is common across all tabs */}
            <div className="aspect-video mb-6">
              <iframe
                src={practiceData.embedUrl}
                className="w-full h-full rounded-md"
                allowFullScreen
              ></iframe>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Speaking Practice</h3>
              <p className="mb-6">
                Practice speaking by repeating the dialogue segments. Try to
                match the pronunciation and intonation.
              </p>

              <div className="space-y-4">
                {practiceData.dialogueSegments.map(
                  (segment: DialogueSegment, index: number) => (
                    <div
                      key={segment.id}
                      className="p-4 border rounded-md hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">
                          {formatTime(segment.startTime)}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                            onClick={() => {
                              // This would ideally play the segment
                              toast.success(`Playing segment ${index + 1}`);
                            }}
                          >
                            Listen
                          </button>
                          <button
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                            onClick={() => {
                              // This would ideally start recording
                              toast.success(
                                `Recording for segment ${index + 1}`
                              );
                            }}
                          >
                            Practice
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800">{segment.text}</p>
                    </div>
                  )
                )}
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
    <div className="bg-blue-500 bg-gradient-to-r from-blue-500 to-purple-600">
      {/* Header */}
      <div className="container mx-auto px-4 py-6 text-white">
        <h1 className="text-3xl font-bold">
          {practiceData.title || "Dramatic Dialogue Practice"}
        </h1>
        <p className="text-lg">
          English Drama Practice •{" "}
          {Math.ceil(
            practiceData.dialogueSegments.reduce(
              (total: number, segment: DialogueSegment) =>
                total + (segment.endTime - segment.startTime),
              0
            ) / 60
          )}{" "}
          min
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white">
        <div className="container mx-auto">
          <div className="flex">
            <button
              onClick={() => setActiveTab("listening")}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === "listening"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "bg-white text-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3zm0 14a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Listening
            </button>
            <button
              onClick={() => setActiveTab("vocabulary")}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === "vocabulary"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "bg-white text-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Vocabulary
            </button>
            <button
              onClick={() => setActiveTab("guided-practice")}
              className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 ${
                activeTab === "guided-practice"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "bg-white text-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
              Guided Practice
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
        <div className="relative">
          {renderContent()}

          {/* Transcript toggle button */}
          {activeTab === "listening" && (
            <button
              onClick={toggleTranscript}
              className="absolute top-2 right-2 px-3 py-1.5 bg-white text-blue-700 rounded-md text-sm hover:bg-gray-100 shadow-sm"
            >
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </button>
          )}
        </div>
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
  // This is a placeholder function that would ideally extract real vocabulary
  // For now, we'll generate some sample vocabulary items
  const allText = segments.map((segment) => segment.text).join(" ");
  const words = allText.split(/\s+/).filter((word) => word.length > 4);
  const uniqueWords = [...new Set(words)].slice(0, 8);

  const partsOfSpeech = ["noun", "verb", "adjective", "adverb"];

  return uniqueWords.map((word) => ({
    word: word.replace(/[.,!?;:]/g, ""),
    partOfSpeech:
      partsOfSpeech[Math.floor(Math.random() * partsOfSpeech.length)],
    definition: `Definition of "${word.replace(/[.,!?;:]/g, "")}"`,
    example: `Example sentence using "${word.replace(/[.,!?;:]/g, "")}".`,
  }));
};
